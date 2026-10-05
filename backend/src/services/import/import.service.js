/**
 * Service Pipeline Import Mutasi Rekening
 *
 * Mengelola siklus hidup import mutasi:
 * - PREVIEW: parse berkas, hitung fingerprint, tandai duplikat, usulkan kategori
 * - COMMIT: simpan transaksi secara atomic dalam transaksi DB, tangani race kondisi
 * - ROLLBACK: batalkan batch dan hapus transaksi terkait dalam satu transaksi DB
 * - HISTORY: daftar riwayat dan detail batch
 */

import prisma from "../../config/prisma.js";
import { computeFingerprint, normalizeDescription } from "./fingerprint.js";
import { readFileBuffer } from "./parsers/reader.js";
import { detectParser, getParser } from "./parsers/index.js";
import {
  loadCategoriesForUser,
  loadUserCategoryRules,
  suggestCategory,
  suggestCategoryId,
  findFallbackCategory,
  deriveKeyword
} from "./categorizer.js";
import { parsePositiveInt } from "../../utils/query.js";
import { sanitizeCell } from "./normalize.js";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_ROWS = 2000;

/**
 * Validasi kepemilikan rekening oleh user.
 *
 * @param {number} userId
 * @param {number|string} accountId
 * @returns {Promise<object>}
 */
async function resolveUserAccount(userId, accountId) {
  const validAccountId = parsePositiveInt(accountId, "account_id");

  const account = await prisma.account.findFirst({
    where: { id: validAccountId, userId }
  });

  if (!account) {
    const error = new Error("Rekening tidak ditemukan atau bukan milik Anda");
    error.statusCode = 404;
    throw error;
  }

  return account;
}

/**
 * Tahap 1: Preview Import Mutasi
 *
 * @param {object} params
 * @param {number} params.userId
 * @param {number|string} params.accountId
 * @param {object} params.file - Objek file dari Multer (buffer, originalname, size, mimetype)
 * @param {string} [params.parser] - Nama parser manual opsional
 * @param {object|string} [params.mapping] - Pemetaan kolom untuk generic parser
 * @param {string} [params.filePassword] - Password jika berkas terenkripsi
 * @returns {Promise<object>}
 */
export async function preview({ userId, accountId, file, parser = null, mapping = null, filePassword = null }) {
  if (!file || !file.buffer) {
    const error = new Error("File mutasi wajib diunggah");
    error.statusCode = 400;
    throw error;
  }

  if (file.size > MAX_FILE_SIZE) {
    const error = new Error("Ukuran berkas melebihi batas maksimum 5 MB");
    error.statusCode = 400;
    throw error;
  }

  const account = await resolveUserAccount(userId, accountId);

  // Parse JSON mapping jika dikirim sebagai string form-data
  let resolvedMapping = mapping;
  if (typeof mapping === "string" && mapping.trim().length > 0) {
    try {
      resolvedMapping = JSON.parse(mapping);
    } catch {
      const error = new Error("Format parameter mapping tidak valid (harus JSON)");
      error.statusCode = 400;
      throw error;
    }
  }

  // Baca berkas buffer (dekripsi in-memory jika terenkripsi)
  const fileData = await readFileBuffer({
    buffer: file.buffer,
    fileName: file.originalname,
    password: filePassword
  });

  // Tentukan parser
  let parserModule = null;
  if (parser) {
    parserModule = getParser(parser);
  } else {
    parserModule = detectParser({
      grid: fileData.grid,
      sheets: fileData.sheets || null,
      fileName: file.originalname,
      mapping: resolvedMapping
    });
  }

  // Parse grid menjadi baris transaksi
  const parseResult = parserModule.parse({
    grid: fileData.grid,
    sheets: fileData.sheets || null,
    fileName: file.originalname,
    mapping: resolvedMapping
  });

  if (!parseResult.rows || parseResult.rows.length === 0) {
    const error = new Error("Tidak ada baris transaksi yang berhasil dibaca dari berkas");
    error.statusCode = 400;
    throw error;
  }

  if (parseResult.rows.length > MAX_ROWS) {
    const error = new Error(`Berkas melebihi batas maksimum ${MAX_ROWS} baris transaksi`);
    error.statusCode = 400;
    throw error;
  }

  // Muat fingerprint transaksi yang sudah ada di rekening ini
  const existingTx = await prisma.transaction.findMany({
    where: {
      accountId: account.id,
      importFingerprint: { not: null }
    },
    select: { importFingerprint: true }
  });
  const existingFingerprints = new Set(existingTx.map((t) => t.importFingerprint));

  // Muat kategori dan aturan user untuk kategorisasi otomatis
  const [categories, userRules] = await Promise.all([
    loadCategoriesForUser(userId),
    loadUserCategoryRules(userId)
  ]);

  // Warnings akumulasi dari parser dan validasi preview
  const warnings = Array.isArray(parseResult.warnings) ? [...parseResult.warnings] : [];

  // Pelacakan urutan transaksi identik dalam satu hari
  const occurrenceTracker = new Map();
  const seenInBatch = new Set();

  const processedRows = [];
  let duplicateCount = 0;

  for (const rawRow of parseResult.rows) {
    const dateStr =
      rawRow.date instanceof Date
        ? rawRow.date.toISOString().slice(0, 10)
        : String(rawRow.date).slice(0, 10);

    const normDesc = normalizeDescription(rawRow.description);
    const key = `${dateStr}|${rawRow.time || ""}|${Number(rawRow.amount).toFixed(2)}|${rawRow.type}|${normDesc}`;

    const occurrenceIndex = (occurrenceTracker.get(key) || 0) + 1;
    occurrenceTracker.set(key, occurrenceIndex);

    const fingerprint = computeFingerprint({
      accountId: account.id,
      date: dateStr,
      time: rawRow.time || null,
      amount: rawRow.amount,
      type: rawRow.type,
      description: rawRow.description,
      occurrenceIndex
    });

    const isDuplicate = existingFingerprints.has(fingerprint) || seenInBatch.has(fingerprint);
    if (isDuplicate) {
      duplicateCount++;
    } else {
      seenInBatch.add(fingerprint);
    }

    let suggestedCategoryId = null;
    let suggestionSource = null;

    // Prioritas 1: Kategori eksplisit dari template (jika ditulis user di berkas)
    if (rawRow.explicitCategoryName) {
      const explicitNorm = String(rawRow.explicitCategoryName).trim().toLowerCase();
      const matchedExplicit = categories.find(
        (c) => c.type === rawRow.type && c.name.toLowerCase() === explicitNorm
      );

      if (matchedExplicit) {
        suggestedCategoryId = matchedExplicit.id;
        suggestionSource = "template";
      } else {
        warnings.push(
          `Baris ${rawRow.index}: Kategori "${rawRow.explicitCategoryName}" tidak ditemukan atau tipenya tidak cocok (${rawRow.type}), dialihkan ke usulan otomatis`
        );
      }
    }

    // Jika belum ditentukan dari template, jalankan hierarki suggestCategory normal
    if (!suggestedCategoryId) {
      const categorySuggestion = suggestCategory({
        description: rawRow.description,
        type: rawRow.type,
        userRules,
        categories
      });
      suggestedCategoryId = categorySuggestion.categoryId;
      suggestionSource = categorySuggestion.source;
    }

    const suggestedKeyword = deriveKeyword(rawRow.description);

    processedRows.push({
      index: rawRow.index,
      date: dateStr,
      time: rawRow.time || null,
      description: rawRow.description,
      type: rawRow.type,
      amount: rawRow.amount,
      balance: rawRow.balance !== undefined ? rawRow.balance : null,
      fingerprint,
      suggested_category_id: suggestedCategoryId,
      suggestion_source: suggestionSource,
      suggested_keyword: suggestedKeyword,
      is_duplicate: isDuplicate
    });
  }

  const total = processedRows.length;
  const newCount = total - duplicateCount;

  // Evaluasi usulan rekening tujuan dari 4 digit akhir nomor rekening berkas
  let suggestedAccount = null;

  const rawMasked = parseResult.meta && parseResult.meta.accountNumberMasked;
  if (rawMasked) {
    const fileDigitsMatch = String(rawMasked).replace(/\D/g, "");
    if (fileDigitsMatch.length >= 4) {
      const fileLast4 = fileDigitsMatch.slice(-4);

      // Cari seluruh rekening aktif (non-arsip) milik pengguna
      const userAccounts = await prisma.account.findMany({
        where: { userId, isArchived: false },
        select: { id: true, name: true, institution: true, accountNoMasked: true }
      });

      const matchedAccounts = userAccounts.filter((acc) => {
        if (!acc.accountNoMasked) return false;
        const accDigits = String(acc.accountNoMasked).replace(/\D/g, "");
        return accDigits.length >= 4 && accDigits.slice(-4) === fileLast4;
      });

      if (matchedAccounts.length === 1) {
        suggestedAccount = {
          id: matchedAccounts[0].id,
          name: matchedAccounts[0].name,
          institution: matchedAccounts[0].institution,
          match: "last4"
        };
      }

      // Verifikasi apakah rekening terpilih cocok dengan 4 digit akhir berkas
      const selectedDigits = account.accountNoMasked
        ? String(account.accountNoMasked).replace(/\D/g, "")
        : "";
      const selectedMatches =
        selectedDigits.length >= 4 && selectedDigits.slice(-4) === fileLast4;

      if (!selectedMatches) {
        warnings.push(
          `Nomor rekening pada berkas (...${fileLast4}) tidak cocok dengan rekening yang dipilih`
        );
      }
    }
  }

  // Simpan ImportBatch ke database berstatus PREVIEW
  // Payload tidak memuat password maupun berkas biner mentah
  const batch = await prisma.importBatch.create({
    data: {
      userId,
      accountId: account.id,
      parser: parserModule.name,
      fileName: file.originalname,
      status: "PREVIEW",
      totalRows: total,
      importedRows: 0,
      duplicateRows: duplicateCount,
      parsedPayload: processedRows
    }
  });

  const summary = {
    total,
    duplicate: duplicateCount,
    new: newCount
  };

  if (parseResult.summary && parseResult.summary.invalid !== undefined) {
    summary.invalid = parseResult.summary.invalid;
  }

  return {
    batch_id: batch.id,
    parser: parserModule.name,
    file_name: file.originalname,
    meta: parseResult.meta || {},
    warnings,
    suggested_account: suggestedAccount,
    summary,
    rows: processedRows.map((r) => ({
      index: r.index,
      date: r.date,
      time: r.time,
      description: r.description,
      type: r.type,
      amount: r.amount,
      balance: r.balance,
      suggested_category_id: r.suggested_category_id,
      suggestion_source: r.suggestion_source,
      suggested_keyword: r.suggested_keyword,
      is_duplicate: r.is_duplicate
    }))
  };
}

/**
 * Tahap 2: Commit Batch Import (Atomic Transaction)
 *
 * @param {object} params
 * @param {number} params.userId
 * @param {number|string} params.batchId
 * @param {Array<object>} [params.rows] - Daftar baris koreksi: [{ index, category_id, include }]
 * @returns {Promise<object>}
 */
export async function commit({ userId, batchId, rows = [] }) {
  const validBatchId = parsePositiveInt(batchId, "ID batch import");
  const batch = await prisma.importBatch.findFirst({
    where: { id: validBatchId, userId }
  });

  if (!batch) {
    const error = new Error("Batch import tidak ditemukan atau bukan milik Anda");
    error.statusCode = 404;
    throw error;
  }

  if (batch.status !== "PREVIEW") {
    const error = new Error(`Batch tidak dapat di-commit karena berstatus ${batch.status}`);
    error.statusCode = 400;
    throw error;
  }

  const payloadRows = Array.isArray(batch.parsedPayload) ? batch.parsedPayload : [];
  if (payloadRows.length === 0) {
    const error = new Error("Data transaksi batch tidak ditemukan");
    error.statusCode = 400;
    throw error;
  }

  // Buat lookup override dari parameter rows
  const overrideMap = new Map();
  if (Array.isArray(rows)) {
    for (const item of rows) {
      if (item && item.index !== undefined) {
        overrideMap.set(Number(item.index), item);
      }
    }
  }

  const categories = await loadCategoriesForUser(userId);

  // Eksekusi seluruh operasi commit dalam SATU transaksi database atomic
  return await prisma.$transaction(
    async (tx) => {
      const transactionsToInsert = [];
      let skippedCount = 0;
      let previewDupNotAttempted = 0;
      const rulesToProcess = [];

      for (const r of payloadRows) {
        const override = overrideMap.get(r.index);

        // Baris tidak disebut -> include = true kecuali duplikat (default false)
        let shouldInclude = !r.is_duplicate;
        if (override && override.include !== undefined) {
          shouldInclude = Boolean(override.include);
        }

        if (!shouldInclude) {
          if (r.is_duplicate) {
            previewDupNotAttempted++;
          } else {
            skippedCount++;
          }
          continue;
        }

        // Kategori: pakai override jika ada, jika tidak pakai saran preview
        let catId = override && override.category_id !== undefined ? Number(override.category_id) : r.suggested_category_id;

        // Validasi kecocokan kategori
        let matchedCategory = categories.find((c) => c.id === catId);
        if (!matchedCategory || matchedCategory.type !== r.type) {
          const fallback = findFallbackCategory(categories, r.type);
          catId = fallback ? fallback.id : null;
          matchedCategory = fallback;
        }

        // Kumpulkan permintaan belajar aturan kategori jika opt-in
        if (override && override.learn_rule === true && matchedCategory) {
          const rawKw = override.keyword !== undefined && override.keyword !== null
            ? String(override.keyword).trim()
            : (r.suggested_keyword ? String(r.suggested_keyword).trim() : "");

          rulesToProcess.push({
            index: r.index,
            keyword: rawKw,
            categoryId: matchedCategory.id
          });
        }

        // Potong deskripsi maksimal 255 karakter sebelum disimpan
        const truncatedDescription = r.description ? String(r.description).slice(0, 255) : null;

        transactionsToInsert.push({
          userId,
          accountId: batch.accountId,
          categoryId: catId,
          type: r.type,
          amount: r.amount,
          currency: "IDR",
          transactionDate: new Date(`${r.date}T00:00:00.000Z`),
          description: truncatedDescription,
          importBatchId: batch.id,
          importFingerprint: r.fingerprint
        });
      }

      // Proses penyimpanan CategoryRule di dalam transaksi yang sama
      let rulesSaved = 0;
      const ruleWarnings = [];

      if (rulesToProcess.length > 0) {
        // Hitung total aturan yang sudah dimiliki pengguna
        const currentRuleCount = await tx.categoryRule.count({ where: { userId } });
        let activeRuleCount = currentRuleCount;

        for (const item of rulesToProcess) {
          let cleanKw = item.keyword;
          if (!cleanKw) {
            ruleWarnings.push(`Baris ${item.index}: Kata kunci untuk aturan kategori tidak tersedia`);
            continue;
          }

          // Netralkan karakter formula awal jika ada
          cleanKw = sanitizeCell(cleanKw);
          if (cleanKw.length > 100) {
            cleanKw = cleanKw.slice(0, 100).trim();
          }

          if (cleanKw.length < 2) {
            ruleWarnings.push(`Baris ${item.index}: Kata kunci "${cleanKw}" terlalu pendek`);
            continue;
          }

          // Cek apakah keyword sudah ada untuk user
          const existingRule = await tx.categoryRule.findFirst({
            where: { userId, keyword: cleanKw }
          });

          if (!existingRule) {
            if (activeRuleCount >= 500) {
              ruleWarnings.push(`Batas maksimum 500 aturan kategori per pengguna telah tercapai, aturan untuk "${cleanKw}" dilewati`);
              continue;
            }

            await tx.categoryRule.create({
              data: {
                userId,
                keyword: cleanKw,
                categoryId: item.categoryId
              }
            });
            activeRuleCount++;
            rulesSaved++;
          } else {
            // Perbarui kategori jika keyword sudah ada
            await tx.categoryRule.update({
              where: { id: existingRule.id },
              data: { categoryId: item.categoryId }
            });
            rulesSaved++;
          }
        }
      }

      let importedCount = 0;
      if (transactionsToInsert.length > 0) {
        const createResult = await tx.transaction.createMany({
          data: transactionsToInsert,
          skipDuplicates: true
        });
        importedCount = createResult.count;
      }

      // Tabrakan fingerprint saat insert karena transaksi sudah ada di DB
      const fingerprintCollisions = transactionsToInsert.length - importedCount;
      const finalDuplicateCount = previewDupNotAttempted + fingerprintCollisions;

      // Perbarui status batch menjadi COMMITTED dan bersihkan parsedPayload
      const updatedBatch = await tx.importBatch.update({
        where: { id: batch.id },
        data: {
          status: "COMMITTED",
          importedRows: importedCount,
          duplicateRows: finalDuplicateCount,
          parsedPayload: null
        }
      });

      return {
        batch_id: updatedBatch.id,
        status: updatedBatch.status,
        total_rows: updatedBatch.totalRows,
        imported_rows: importedCount,
        duplicate_rows: updatedBatch.duplicateRows,
        skipped_rows: skippedCount,
        rules_saved: rulesSaved,
        rule_warnings: ruleWarnings
      };
    },
    { timeout: 30000, maxWait: 10000 }
  );
}

/**
 * Tahap 3: Rollback Batch Import (Atomic Transaction)
 *
 * @param {object} params
 * @param {number} params.userId
 * @param {number|string} params.batchId
 * @returns {Promise<object>}
 */
export async function rollback({ userId, batchId }) {
  const validBatchId = parsePositiveInt(batchId, "ID batch import");
  const batch = await prisma.importBatch.findFirst({
    where: { id: validBatchId, userId }
  });

  if (!batch) {
    const error = new Error("Batch import tidak ditemukan atau bukan milik Anda");
    error.statusCode = 404;
    throw error;
  }

  if (batch.status !== "COMMITTED") {
    const error = new Error(`Hanya batch berstatus COMMITTED yang dapat di-rollback (status saat ini: ${batch.status})`);
    error.statusCode = 400;
    throw error;
  }

  return await prisma.$transaction(async (tx) => {
    // Hapus seluruh transaksi yang terkait dengan import batch ini
    const deleteResult = await tx.transaction.deleteMany({
      where: {
        importBatchId: batch.id,
        userId
      }
    });

    // Tandai status batch sebagai CANCELLED
    const updatedBatch = await tx.importBatch.update({
      where: { id: batch.id },
      data: {
        status: "CANCELLED"
      }
    });

    return {
      batch_id: updatedBatch.id,
      status: updatedBatch.status,
      deleted_transactions: deleteResult.count,
      message: "Batch import berhasil di-rollback dan transaksi telah dihapus"
    };
  });
}

/**
 * Mengambil daftar riwayat batch import milik pengguna.
 *
 * @param {number} userId
 * @param {object} [query]
 * @returns {Promise<Array<object>>}
 */
export async function listBatches(userId, query = {}) {
  const where = { userId };
  if (query.accountId !== undefined && query.accountId !== null && String(query.accountId).trim() !== "") {
    where.accountId = parsePositiveInt(query.accountId, "account_id");
  }

  return await prisma.importBatch.findMany({
    where,
    select: {
      id: true,
      userId: true,
      accountId: true,
      parser: true,
      fileName: true,
      status: true,
      totalRows: true,
      importedRows: true,
      duplicateRows: true,
      createdAt: true,
      updatedAt: true,
      account: {
        select: {
          id: true,
          name: true,
          institution: true,
          color: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
}

/**
 * Mengambil detail satu batch import.
 *
 * @param {number} userId
 * @param {number|string} batchId
 * @returns {Promise<object>}
 */
export async function getBatch(userId, batchId) {
  const validBatchId = parsePositiveInt(batchId, "ID batch import");
  const batch = await prisma.importBatch.findFirst({
    where: { id: validBatchId, userId },
    include: {
      account: {
        select: {
          id: true,
          name: true,
          institution: true,
          color: true
        }
      }
    }
  });

  if (!batch) {
    const error = new Error("Batch import tidak ditemukan atau bukan milik Anda");
    error.statusCode = 404;
    throw error;
  }

  return batch;
}
