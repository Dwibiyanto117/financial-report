/**
 * Parser Mutasi Rekening Generik (Generic Parser)
 *
 * Mengizinkan pengguna memetakan kolom secara dinamis lewat objek `mapping`:
 * {
 *   date: "Tanggal" | 0,
 *   description: "Keterangan" | 1,
 *   amount?: "Jumlah" | 2,
 *   debit?: "Debet" | 2,
 *   credit?: "Kredit" | 3,
 *   type?: "Tipe" | 4,
 *   balance?: "Saldo" | 5
 * }
 */

import { normalizeAmount, normalizeDate, sanitizeCell } from "../normalize.js";

export const name = "generic";
export const label = "Format Kustom / CSV / Excel Generik";
export const formats = ["csv", "xlsx"];
export const requiresMapping = true;

/**
 * Deteksi kecocokan parser generik.
 * Memberi skor default rendah (0.1), atau 0.8 jika mapping spesifik disertakan.
 *
 * @param {object} ctx
 * @returns {number}
 */
export function detect(ctx) {
  if (ctx && ctx.mapping && Object.keys(ctx.mapping).length >= 2) {
    return 0.8;
  }
  return 0.1;
}

/**
 * Membaca indeks kolom dari mapping (bisa berupa nama header teks atau indeks numerik).
 *
 * @param {any[][]} grid
 * @param {object} mapping
 * @returns {{ colMap: object, headerRowIndex: number }}
 */
function resolveColumnIndices(grid, mapping) {
  if (!grid || grid.length === 0) {
    throw new Error("Berkas tidak memiliki data baris");
  }

  // Jika semua nilai mapping sudah berupa angka integer
  const allNumeric = Object.values(mapping).every(
    (v) => typeof v === "number" || (!Number.isNaN(Number(v)) && String(v).trim() !== "")
  );

  if (allNumeric) {
    const colMap = {};
    for (const [k, v] of Object.entries(mapping)) {
      colMap[k] = Number(v);
    }
    return { colMap, headerRowIndex: 0 };
  }

  // Cari baris header di antara 5 baris pertama yang paling cocok
  let bestHeaderIndex = -1;
  let bestMatches = 0;
  const mappingNames = Object.values(mapping).map((v) => String(v).trim().toLowerCase());

  for (let r = 0; r < Math.min(grid.length, 10); r++) {
    const row = grid[r].map((cell) => String(cell || "").trim().toLowerCase());
    let matchCount = 0;
    for (const name of mappingNames) {
      if (row.some((cell) => cell.includes(name))) {
        matchCount++;
      }
    }
    if (matchCount > bestMatches) {
      bestMatches = matchCount;
      bestHeaderIndex = r;
    }
  }

  if (bestHeaderIndex === -1) {
    bestHeaderIndex = 0;
  }

  const headerRow = grid[bestHeaderIndex].map((c) => String(c || "").trim().toLowerCase());
  const colMap = {};

  for (const [key, val] of Object.entries(mapping)) {
    if (typeof val === "number" || !Number.isNaN(Number(val))) {
      colMap[key] = Number(val);
      continue;
    }

    const search = String(val).trim().toLowerCase();
    const foundIdx = headerRow.findIndex((col) => col.includes(search));
    if (foundIdx !== -1) {
      colMap[key] = foundIdx;
    }
  }

  return { colMap, headerRowIndex: bestHeaderIndex };
}

/**
 * Mem-parse baris grid dengan pemetaan generik.
 *
 * @param {object} ctx
 * @param {any[][]} ctx.grid
 * @param {object} [ctx.mapping]
 * @returns {{ rows: Array<object>, meta: object, warnings: Array<string> }}
 */
export function parse(ctx) {
  const { grid, mapping = {} } = ctx;
  if (!grid || grid.length === 0) {
    throw new Error("Berkas kosong atau tidak memuat data");
  }

  if (!mapping || Object.keys(mapping).length === 0) {
    const error = new Error("Pemetaan kolom (mapping) wajib diisi untuk format generik");
    error.statusCode = 400;
    throw error;
  }

  const { colMap, headerRowIndex } = resolveColumnIndices(grid, mapping);

  if (colMap.date === undefined) {
    throw new Error("Kolom tanggal ('date') wajib dipetakan");
  }
  if (colMap.amount === undefined && colMap.debit === undefined && colMap.credit === undefined) {
    throw new Error("Kolom nominal ('amount' atau pasangan 'debit'/'credit') wajib dipetakan");
  }

  const rows = [];
  const warnings = [];
  let rowIndex = 1;

  for (let r = headerRowIndex + 1; r < grid.length; r++) {
    const row = grid[r];
    // Lewati baris kosong
    const isRowEmpty = row.every((c) => c === "" || c === null || c === undefined);
    if (isRowEmpty) continue;

    const rawDate = row[colMap.date];
    if (rawDate === "" || rawDate === null || rawDate === undefined) {
      continue;
    }

    let parsedDateObj;
    try {
      parsedDateObj = normalizeDate(rawDate);
    } catch {
      // Lewati baris yang bukan tanggal (mis. baris subtotal/footer)
      continue;
    }

    const rawDesc = colMap.description !== undefined ? row[colMap.description] : "";
    const description = sanitizeCell(String(rawDesc || "").trim());

    let type = "EXPENSE";
    let amount = 0;

    if (colMap.debit !== undefined || colMap.credit !== undefined) {
      const rawDebit = colMap.debit !== undefined ? row[colMap.debit] : null;
      const rawCredit = colMap.credit !== undefined ? row[colMap.credit] : null;

      let debitVal = 0;
      let creditVal = 0;

      if (rawDebit !== null && rawDebit !== "" && rawDebit !== undefined) {
        try {
          debitVal = normalizeAmount(rawDebit).amount;
        } catch {
          debitVal = 0;
        }
      }
      if (rawCredit !== null && rawCredit !== "" && rawCredit !== undefined) {
        try {
          creditVal = normalizeAmount(rawCredit).amount;
        } catch {
          creditVal = 0;
        }
      }

      if (creditVal > 0) {
        type = "INCOME";
        amount = creditVal;
      } else if (debitVal > 0) {
        type = "EXPENSE";
        amount = debitVal;
      } else {
        continue;
      }
    } else if (colMap.amount !== undefined) {
      const rawAmount = row[colMap.amount];
      if (rawAmount === null || rawAmount === "" || rawAmount === undefined) continue;

      let parsedAmt;
      try {
        parsedAmt = normalizeAmount(rawAmount);
      } catch {
        continue;
      }

      amount = parsedAmt.amount;

      // Cek kolom type jika ada
      if (colMap.type !== undefined && row[colMap.type]) {
        const rawTypeStr = String(row[colMap.type]).toUpperCase().trim();
        if (
          rawTypeStr.includes("CR") ||
          rawTypeStr.includes("MASUK") ||
          rawTypeStr.includes("INCOME") ||
          rawTypeStr.includes("KREDIT")
        ) {
          type = "INCOME";
        } else {
          type = "EXPENSE";
        }
      } else if (parsedAmt.isNegative) {
        type = "EXPENSE";
      } else {
        type = "INCOME";
      }
    }

    if (amount <= 0) continue;

    let balance = null;
    if (colMap.balance !== undefined && row[colMap.balance]) {
      try {
        balance = normalizeAmount(row[colMap.balance]).amount;
      } catch {
        balance = null;
      }
    }

    rows.push({
      index: rowIndex++,
      date: parsedDateObj.date,
      time: parsedDateObj.time,
      description,
      type,
      amount,
      balance
    });
  }

  return {
    rows,
    meta: {},
    warnings
  };
}
