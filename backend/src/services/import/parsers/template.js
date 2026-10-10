/**
 * Parser Adapter Template Standar FinReport
 *
 * Mendukung pembacaan berkas template XLSX dan CSV standar FinReport.
 * Mendeteksi sheet Info (FINREPORT-IMPORT-V1) atau header standar:
 * Tanggal | Waktu | Keterangan | Jenis | Nominal | Saldo | Kategori
 */

import { normalizeAmount, normalizeDate, sanitizeCell } from "../normalize.js";

export const name = "template";
export const label = "Template Standar FinReport (XLSX / CSV)";
export const formats = ["csv", "xlsx"];
export const requiresMapping = false;

/**
 * Deteksi skor kecocokan parser template.
 *
 * @param {object} ctx
 * @param {any[][]} ctx.grid
 * @param {object} [ctx.sheets]
 * @param {string} [ctx.fileName]
 * @returns {number} Skor 0..1
 */
export function detect(ctx) {
  const { grid = [], sheets = null } = ctx;

  // 1. Cek sheet 'Info' jika berkas XLSX
  if (sheets && sheets["Info"]) {
    const infoGrid = sheets["Info"];
    for (const row of infoGrid) {
      if (Array.isArray(row)) {
        const rowStr = row.map((c) => String(c || "").trim()).join(" ");
        if (rowStr.includes("FINREPORT-IMPORT-V1")) {
          return 1.0;
        }
      }
    }
  }

  // 2. Cek baris pertama atau baris header tabel pada grid
  if (grid && grid.length > 0) {
    for (let r = 0; r < Math.min(grid.length, 5); r++) {
      const row = grid[r];
      if (Array.isArray(row)) {
        const rowStr = row.map((c) => String(c || "").toLowerCase().trim()).join(" ");
        if (
          rowStr.includes("tanggal") &&
          rowStr.includes("keterangan") &&
          rowStr.includes("jenis") &&
          rowStr.includes("nominal")
        ) {
          return 0.9;
        }
      }
    }
  }

  return 0.0;
}

/**
 * Memetakan indeks kolom berdasarkan baris header.
 *
 * @param {any[][]} grid
 * @returns {{ headerIndex: number, colDate: number, colTime: number, colDesc: number, colType: number, colAmount: number, colBalance: number, colCategory: number }}
 */
function findHeaders(grid) {
  let headerIndex = -1;
  let colDate = -1;
  let colTime = -1;
  let colDesc = -1;
  let colType = -1;
  let colAmount = -1;
  let colBalance = -1;
  let colCategory = -1;

  for (let r = 0; r < Math.min(grid.length, 10); r++) {
    const row = grid[r];
    if (!Array.isArray(row)) continue;

    const rowStr = row.map((c) => String(c || "").toLowerCase().trim()).join(" ");
    if (
      rowStr.includes("tanggal") &&
      rowStr.includes("keterangan") &&
      rowStr.includes("jenis") &&
      rowStr.includes("nominal")
    ) {
      headerIndex = r;
      row.forEach((cell, idx) => {
        const text = String(cell || "").toLowerCase().trim();
        if (colDate === -1 && text === "tanggal") colDate = idx;
        if (colTime === -1 && text === "waktu") colTime = idx;
        if (colDesc === -1 && text === "keterangan") colDesc = idx;
        if (colType === -1 && text === "jenis") colType = idx;
        if (colAmount === -1 && text === "nominal") colAmount = idx;
        if (colBalance === -1 && text === "saldo") colBalance = idx;
        if (colCategory === -1 && text === "kategori") colCategory = idx;
      });
      break;
    }
  }

  if (headerIndex === -1 || colDate === -1 || colDesc === -1 || colType === -1 || colAmount === -1) {
    const error = new Error("Header kolom template standar FinReport tidak ditemukan (wajib: Tanggal, Keterangan, Jenis, Nominal)");
    error.statusCode = 400;
    throw error;
  }

  return { headerIndex, colDate, colTime, colDesc, colType, colAmount, colBalance, colCategory };
}

/**
 * Normalisasi tipe transaksi dari nilai string kolom Jenis.
 *
 * @param {string} rawType
 * @returns {"INCOME"|"EXPENSE"|null}
 */
function parseTransactionType(rawType) {
  if (!rawType) return null;
  const clean = String(rawType).toUpperCase().trim();
  if (["MASUK", "KREDIT", "CR", "IN", "INCOME"].includes(clean)) {
    return "INCOME";
  }
  if (["KELUAR", "DEBIT", "DB", "OUT", "EXPENSE"].includes(clean)) {
    return "EXPENSE";
  }
  return null;
}

/**
 * Ekstraksi metadata dari sheet Info jika ada.
 *
 * @param {object} sheets
 * @returns {object}
 */
function extractMetadata(sheets) {
  const meta = {
    template_version: null,
    bank: null,
    accountNumberMasked: null
  };

  if (!sheets || !sheets["Info"]) return meta;
  const infoGrid = sheets["Info"];

  for (const row of infoGrid) {
    if (!Array.isArray(row) || row.length < 2) continue;
    const label = String(row[0] || "").trim().toLowerCase();
    const val = String(row[1] || "").trim();

    if (label.includes("template")) {
      meta.template_version = val;
    } else if (label === "bank") {
      meta.bank = val.toUpperCase();
    } else if (label.includes("4 digit") || label.includes("nomor rekening")) {
      const match = val.match(/\b\d{4}\b/);
      if (match) {
        meta.accountNumberMasked = `...${match[0]}`;
      }
    }
  }

  return meta;
}

/**
 * Parse grid lembar kerja template standar FinReport.
 *
 * @param {object} ctx
 * @param {any[][]} ctx.grid
 * @param {object} [ctx.sheets]
 * @param {string} [ctx.fileName]
 * @returns {{ rows: Array<object>, meta: object, warnings: Array<string>, summary: object }}
 */
export function parse(ctx) {
  const { grid, sheets = null } = ctx;
  if (!grid || grid.length === 0) {
    const error = new Error("Berkas template kosong");
    error.statusCode = 400;
    throw error;
  }

  const { headerIndex, colDate, colTime, colDesc, colType, colAmount, colBalance, colCategory } = findHeaders(grid);
  const meta = extractMetadata(sheets);

  const rows = [];
  const warnings = [];
  let invalidCount = 0;
  let txIndex = 1;

  for (let r = headerIndex + 1; r < grid.length; r++) {
    const row = grid[r];
    if (!Array.isArray(row)) continue;

    // Cek apakah seluruh baris kosong
    const isRowEmpty = row.every((c) => c === null || c === undefined || String(c).trim() === "");
    if (isRowEmpty) continue;

    const sheetRowNum = r + 1; // 1-indexed Excel row

    // 1. Validasi Tanggal (Wajib)
    const rawDate = row[colDate];
    let parsedDateObj = null;

    if (rawDate instanceof Date && !isNaN(rawDate.getTime())) {
      // Gunakan komponen UTC dari objek Date Excel untuk menghindari pergeseran timezone (WIB/UTC)
      const yr = rawDate.getUTCFullYear();
      const mo = String(rawDate.getUTCMonth() + 1).padStart(2, "0");
      const da = String(rawDate.getUTCDate()).padStart(2, "0");
      const isoStr = `${yr}-${mo}-${da}`;
      parsedDateObj = { date: new Date(`${isoStr}T00:00:00.000Z`), time: null };
    } else if (rawDate !== null && rawDate !== undefined && String(rawDate).trim() !== "") {
      try {
        parsedDateObj = normalizeDate(String(rawDate).trim());
      } catch {
        parsedDateObj = null;
      }
    }

    if (!parsedDateObj) {
      warnings.push(`Baris ${sheetRowNum}: Tanggal tidak valid ("${rawDate || ""}")`);
      invalidCount++;
      continue;
    }

    // 2. Validasi Waktu (Opsional)
    let parsedTime = null;
    if (colTime !== -1 && row[colTime] !== null && row[colTime] !== undefined && row[colTime] !== "") {
      const rawTime = row[colTime];
      if (rawTime instanceof Date) {
        if (!isNaN(rawTime.getTime())) {
          const hh = String(rawTime.getUTCHours()).padStart(2, "0");
          const mm = String(rawTime.getUTCMinutes()).padStart(2, "0");
          const ss = String(rawTime.getUTCSeconds()).padStart(2, "0");
          parsedTime = `${hh}:${mm}:${ss}`;
        } else {
          warnings.push(`Baris ${sheetRowNum}: Format waktu tidak valid ("${rawTime}")`);
        }
      } else {
        const rawTimeStr = String(rawTime).trim();
        if (rawTimeStr) {
          try {
            const tObj = normalizeDate(`2000-01-01 ${rawTimeStr}`);
            if (tObj && tObj.time) {
              parsedTime = tObj.time;
            } else {
              warnings.push(`Baris ${sheetRowNum}: Format waktu tidak valid ("${rawTimeStr}")`);
            }
          } catch {
            warnings.push(`Baris ${sheetRowNum}: Format waktu tidak valid ("${rawTimeStr}")`);
            parsedTime = null;
          }
        }
      }
    }

    // 3. Validasi Jenis (Wajib: INCOME / EXPENSE)
    const rawType = colType !== -1 ? row[colType] : null;
    const txType = parseTransactionType(rawType);
    if (!txType) {
      warnings.push(`Baris ${sheetRowNum}: Jenis transaksi tidak valid ("${rawType || ""}")`);
      invalidCount++;
      continue;
    }

    // 4. Validasi Nominal (Wajib: > 0)
    const rawAmt = colAmount !== -1 ? row[colAmount] : null;
    let parsedAmount = null;
    try {
      const normAmt = normalizeAmount(rawAmt);
      if (normAmt.amount > 0) {
        parsedAmount = normAmt.amount;
      }
    } catch {
      parsedAmount = null;
    }

    if (!parsedAmount) {
      warnings.push(`Baris ${sheetRowNum}: Nominal transaksi tidak valid ("${rawAmt || ""}")`);
      invalidCount++;
      continue;
    }

    // 5. Deskripsi (Sanitasi formula & potong 255 karakter)
    const rawDesc = colDesc !== -1 && row[colDesc] !== undefined ? row[colDesc] : "";
    const description = sanitizeCell(
      String(rawDesc || "")
        .replace(/\r?\n+/g, " ")
        .trim()
    ).slice(0, 255);

    // 6. Saldo (Opsional)
    let balance = null;
    if (colBalance !== -1 && row[colBalance] !== null && row[colBalance] !== undefined && String(row[colBalance]).trim() !== "") {
      try {
        balance = normalizeAmount(row[colBalance]).amount;
      } catch {
        balance = null;
      }
    }

    // 7. Kategori Eksplisit (Opsional)
    let explicitCategoryName = null;
    if (colCategory !== -1 && row[colCategory] !== null && row[colCategory] !== undefined) {
      const catText = String(row[colCategory]).trim();
      if (catText) {
        explicitCategoryName = catText;
      }
    }

    rows.push({
      index: txIndex++,
      date: parsedDateObj.date,
      time: parsedTime,
      description,
      type: txType,
      amount: parsedAmount,
      balance,
      explicitCategoryName
    });
  }

  if (rows.length === 0) {
    const error = new Error(
      warnings.length > 0
        ? `Seluruh baris transaksi dalam berkas tidak valid (${warnings.length} kesalahan): ${warnings.slice(0, 3).join("; ")}`
        : "Tidak ada baris data transaksi yang ditemukan pada lembar kerja"
    );
    error.statusCode = 400;
    throw error;
  }

  return {
    rows,
    meta,
    warnings,
    summary: {
      invalid: invalidCount
    }
  };
}
