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
  suggestCategoryId,
  findFallbackCategory
} from "./categorizer.js";

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
  if (!accountId) {
    const error = new Error("accountId wajib diisi");
    error.statusCode = 400;
    throw error;
  }

  const account = await prisma.account.findFirst({
    where: { id: Number(accountId), userId }
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
      fileName: file.originalname,
      mapping: resolvedMapping
    });
  }

  // Parse grid menjadi baris transaksi
  const parseResult = parserModule.parse({
    grid: fileData.grid,
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

    const suggestedCategoryId = suggestCategoryId({
      description: rawRow.description,
      type: rawRow.type,
      userRules,
      categories
    });

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
      is_duplicate: isDuplicate
    });
  }

  const total = processedRows.length;
  const newCount = total - duplicateCount;

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

  return {
    batch_id: batch.id,
    parser: parserModule.name,
    file_name: file.originalname,
    meta: parseResult.meta || {},
    warnings: parseResult.warnings || [],
    summary: {
      total,
      duplicate: duplicateCount,
      new: newCount
    },
    rows: processedRows.map((r) => ({
      index: r.index,
      date: r.date,
      time: r.time,
      description: r.description,
      type: r.type,
      amount: r.amount,
      balance: r.balance,
      suggested_category_id: r.suggested_category_id,
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
  const batch = await prisma.importBatch.findFirst({
    where: { id: Number(batchId), userId }
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
  return await prisma.$transaction(async (tx) => {
    let importedCount = 0;
    let duplicateCount = 0;

    for (const r of payloadRows) {
      const override = overrideMap.get(r.index);

      // Baris tidak disebut -> include = true kecuali duplikat (default false)
      let shouldInclude = !r.is_duplicate;
      if (override && override.include !== undefined) {
        shouldInclude = Boolean(override.include);
      }

      if (!shouldInclude) {
        continue;
      }

      // Kategori: pakai override jika ada, jika tidak pakai saran preview
      let catId = override && override.category_id !== undefined ? Number(override.category_id) : r.suggested_category_id;

      // Validasi kecocokan kategori
      let matchedCategory = categories.find((c) => c.id === catId);
      if (!matchedCategory || matchedCategory.type !== r.type) {
        const fallback = findFallbackCategory(categories, r.type);
        catId = fallback ? fallback.id : null;
      }

      try {
        await tx.transaction.create({
          data: {
            userId,
            accountId: batch.accountId,
            categoryId: catId,
            type: r.type,
            amount: r.amount,
            currency: "IDR",
            transactionDate: new Date(`${r.date}T00:00:00.000Z`),
            description: r.description || null,
            importBatchId: batch.id,
            importFingerprint: r.fingerprint
          }
        });
        importedCount++;
      } catch (err) {
        // Tangani race condition unique constraint violation (P2002)
        if (err.code === "P2002") {
          duplicateCount++;
          continue;
        }
        throw err;
      }
    }

    // Perbarui status batch menjadi COMMITTED dan bersihkan parsedPayload
    const updatedBatch = await tx.importBatch.update({
      where: { id: batch.id },
      data: {
        status: "COMMITTED",
        importedRows: importedCount,
        duplicateRows: duplicateCount + (batch.totalRows - (importedCount + duplicateCount)),
        parsedPayload: null
      }
    });

    return {
      batch_id: updatedBatch.id,
      status: updatedBatch.status,
      total_rows: updatedBatch.totalRows,
      imported_rows: importedCount,
      duplicate_rows: updatedBatch.duplicateRows
    };
  });
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
  const batch = await prisma.importBatch.findFirst({
    where: { id: Number(batchId), userId }
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
  if (query.accountId) {
    where.accountId = Number(query.accountId);
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
  const batch = await prisma.importBatch.findFirst({
    where: { id: Number(batchId), userId },
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
