/**
 * Parser e-Statement Bank Mandiri (XLSX / Encrypted XLSX)
 *
 * Mendukung format mutasi e-Statement Bank Mandiri:
 * - Header multi-baris (Indonesia & Inggris)
 * - 1 transaksi = 2 baris (baris 1: tanggal, baris 2: jam HH:mm:ss WIB)
 * - Format angka Indonesia (titik ribuan, koma desimal)
 * - Ekstraksi ringkasan metadata (Saldo Awal, Dana Masuk, Dana Keluar, Saldo Akhir)
 * - Rekonsiliasi saldo (peringatan non-blocking)
 */

import { normalizeAmount, normalizeDate, sanitizeCell } from "../normalize.js";

export const name = "mandiri";
export const label = "e-Statement Bank Mandiri (XLSX)";

/**
 * Deteksi kecocokan parser Mandiri berdasarkan nama file dan isi grid.
 *
 * @param {object} ctx
 * @returns {number} Skor kecocokan 0..1
 */
export function detect(ctx) {
  const { fileName = "", grid = [] } = ctx;
  let score = 0;

  const lowerName = String(fileName).toLowerCase();
  if (lowerName.includes("e-statement") && lowerName.includes("mandiri")) {
    score += 0.5;
  } else if (lowerName.startsWith("e-statement_")) {
    score += 0.4;
  }

  // Cek kata kunci khas pada 30 baris pertama
  const sampleText = grid
    .slice(0, 30)
    .map((row) => (Array.isArray(row) ? row.join(" ") : ""))
    .join(" ")
    .toLowerCase();

  if (sampleText.includes("bank mandiri")) {
    score += 0.5;
  }
  if (sampleText.includes("dana masuk") && sampleText.includes("dana keluar") && sampleText.includes("saldo")) {
    score += 0.3;
  }

  return Math.min(score, 1);
}

/**
 * Mencari ringkasan saldo dari blok metadata (sebelum header tabel).
 *
 * @param {any[][]} grid
 * @param {number} headerRowIndex
 * @returns {object}
 */
function extractMetadata(grid, headerRowIndex) {
  const meta = {
    accountNumberMasked: null,
    accountNumber: null,
    initialBalance: null,
    closingBalance: null,
    totalIncomeSummary: null,
    totalExpenseSummary: null
  };

  const limit = Math.min(headerRowIndex, grid.length);
  for (let r = 0; r < limit; r++) {
    const row = grid[r];
    for (let c = 0; c < row.length; c++) {
      const cellText = String(row[c] || "").trim().toLowerCase();

      // Deteksi Nomor Rekening
      if (cellText.includes("nomor rekening") || cellText.includes("account number")) {
        for (let nextC = c + 1; nextC < row.length; nextC++) {
          const val = String(row[nextC] || "").trim();
          const matchAcc = val.match(/\b\d{10,16}\b/);
          if (matchAcc) {
            meta.accountNumber = matchAcc[0];
            meta.accountNumberMasked = `...${matchAcc[0].slice(-4)}`;
            break;
          }
        }
      }

      // Deteksi Saldo Awal
      if (cellText.includes("saldo awal") || cellText.includes("initial balance")) {
        for (let nextC = c + 1; nextC < row.length; nextC++) {
          const val = row[nextC];
          if (val !== "" && val !== null && val !== undefined) {
            try {
              meta.initialBalance = normalizeAmount(val).amount;
              break;
            } catch {
              // Abaikan jika bukan angka
            }
          }
        }
      }

      // Deteksi Dana Masuk (di blok ringkasan, bukan header tabel)
      if (cellText.includes("dana masuk/incoming") || cellText.includes("dana masuk")) {
        for (let nextC = c + 1; nextC < row.length; nextC++) {
          const val = row[nextC];
          if (val !== "" && val !== null && val !== undefined) {
            try {
              meta.totalIncomeSummary = normalizeAmount(val).amount;
              break;
            } catch {
              // Abaikan jika bukan angka
            }
          }
        }
      }

      // Deteksi Dana Keluar
      if (cellText.includes("dana keluar/outgoing") || cellText.includes("dana keluar")) {
        for (let nextC = c + 1; nextC < row.length; nextC++) {
          const val = row[nextC];
          if (val !== "" && val !== null && val !== undefined) {
            try {
              meta.totalExpenseSummary = normalizeAmount(val).amount;
              break;
            } catch {
              // Abaikan jika bukan angka
            }
          }
        }
      }

      // Deteksi Saldo Akhir
      if (cellText.includes("saldo akhir") || cellText.includes("closing balance")) {
        for (let nextC = c + 1; nextC < row.length; nextC++) {
          const val = row[nextC];
          if (val !== "" && val !== null && val !== undefined) {
            try {
              meta.closingBalance = normalizeAmount(val).amount;
              break;
            } catch {
              // Abaikan jika bukan angka
            }
          }
        }
      }
    }
  }

  return meta;
}

/**
 * Mencari indeks baris header tabel transaksi berdasarkan isi teks.
 *
 * @param {any[][]} grid
 * @returns {{ headerIndex: number, colDate: number, colDesc: number, colIncome: number, colExpense: number, colBalance: number }}
 */
function findTableHeaders(grid) {
  let headerIndex = -1;
  let colDate = -1;
  let colDesc = -1;
  let colIncome = -1;
  let colExpense = -1;
  let colBalance = -1;

  for (let r = 0; r < Math.min(grid.length, 50); r++) {
    const row = grid[r];
    const rowStr = row.map((c) => String(c || "").toLowerCase()).join(" ");

    if (
      rowStr.includes("tanggal") &&
      rowStr.includes("keterangan") &&
      rowStr.includes("dana masuk") &&
      rowStr.includes("dana keluar")
    ) {
      headerIndex = r;
      // Petakan kolom
      row.forEach((cell, cIdx) => {
        const text = String(cell || "").toLowerCase().trim();
        if (colDate === -1 && text.includes("tanggal")) colDate = cIdx;
        if (colDesc === -1 && text.includes("keterangan")) colDesc = cIdx;
        if (colIncome === -1 && text.includes("dana masuk")) colIncome = cIdx;
        if (colExpense === -1 && text.includes("dana keluar")) colExpense = cIdx;
        if (colBalance === -1 && text.includes("saldo") && !text.includes("awal") && !text.includes("akhir")) {
          colBalance = cIdx;
        }
      });
      break;
    }
  }

  if (headerIndex === -1 || colDate === -1 || colDesc === -1) {
    const error = new Error("Header tabel transaksi e-Statement Mandiri tidak ditemukan dalam berkas");
    error.statusCode = 400;
    throw error;
  }

  return { headerIndex, colDate, colDesc, colIncome, colExpense, colBalance };
}

/**
 * Mem-parse grid lembar kerja e-Statement Mandiri.
 *
 * @param {object} ctx
 * @param {any[][]} ctx.grid
 * @param {string} [ctx.fileName]
 * @returns {{ rows: Array<object>, meta: object, warnings: Array<string> }}
 */
export function parse(ctx) {
  const { grid, fileName = "" } = ctx;
  if (!grid || grid.length === 0) {
    throw new Error("Berkas e-Statement kosong");
  }

  const { headerIndex, colDate, colDesc, colIncome, colExpense, colBalance } = findTableHeaders(grid);
  const meta = extractMetadata(grid, headerIndex);

  // Fallback: ambil 4 digit terakhir dari pola nama file e-Statement_XXXXXXXXX<4 digit akhir>
  if (!meta.accountNumberMasked) {
    const fileMatch = fileName.match(/_X+(\d{4})/i);
    if (fileMatch) {
      meta.accountNumberMasked = `...${fileMatch[1]}`;
    }
  }

  const rows = [];
  const warnings = [];

  // Lewati baris header Indonesia dan baris terjemahan Inggris di bawahnya jika ada
  let r = headerIndex + 1;
  if (r < grid.length) {
    const nextRowStr = grid[r].map((c) => String(c || "").toLowerCase()).join(" ");
    if (nextRowStr.includes("date") || nextRowStr.includes("remarks")) {
      r++;
    }
  }

  let txIndex = 1;
  while (r < grid.length) {
    const row = grid[r];
    const rowStr = row.map((c) => String(c || "")).join(" ");
    const lowerRowStr = rowStr.toLowerCase();

    // Hentikan proses jika mencapai footer dokumen
    if (
      lowerRowStr.includes("pt bank mandiri") ||
      lowerRowStr.includes("terdaftar dan diawasi") ||
      lowerRowStr.includes("halaman ") ||
      lowerRowStr.includes("page ") ||
      lowerRowStr.includes("total ")
    ) {
      break;
    }

    const cellDateRaw = String(row[colDate] || "").trim();

    // Jika sel kosong sama sekali
    if (!cellDateRaw) {
      r++;
      continue;
    }

    // Cek apakah baris ini adalah baris waktu saja (HH:mm:ss WIB) yang tertinggal
    const isPureTime = /^\d{1,2}:\d{2}(?::\d{2})?(\s*wib)?$/i.test(cellDateRaw);
    if (isPureTime) {
      if (rows.length > 0 && !rows[rows.length - 1].time) {
        try {
          const tObj = normalizeDate(`2000-01-01 ${cellDateRaw}`);
          rows[rows.length - 1].time = tObj.time;
        } catch {
          // Abaikan jika gagal
        }
      }
      r++;
      continue;
    }

    // Baris pertama transaksi: berisi tanggal dan nominal
    let rawDateStr = cellDateRaw;
    let rawTimeStr = null;

    // Cek baris berikutnya: apakah baris jam transaksi?
    if (r + 1 < grid.length) {
      const nextRow = grid[r + 1];
      const nextDateCell = String(nextRow[colDate] || "").trim();
      if (/^\d{1,2}:\d{2}(?::\d{2})?(\s*wib)?$/i.test(nextDateCell)) {
        rawTimeStr = nextDateCell;
        r++; // Konsumsi baris jam
      }
    }

    let parsedDateObj;
    try {
      const combinedDate = rawTimeStr ? `${rawDateStr} ${rawTimeStr}` : rawDateStr;
      parsedDateObj = normalizeDate(combinedDate);
    } catch {
      // Jika bukan format tanggal yang valid, lewati baris
      r++;
      continue;
    }

    // Ambil deskripsi
    const rawDesc = row[colDesc] !== undefined ? row[colDesc] : "";
    const description = sanitizeCell(
      String(rawDesc || "")
        .replace(/\r?\n+/g, " ")
        .trim()
    );

    // Ambil nominal & tipe transaksi
    let type = "EXPENSE";
    let amount = 0;

    const rawIncome = colIncome !== -1 ? row[colIncome] : null;
    const rawExpense = colExpense !== -1 ? row[colExpense] : null;

    let incAmt = 0;
    let expAmt = 0;

    if (rawIncome !== null && rawIncome !== "" && rawIncome !== undefined) {
      try {
        incAmt = normalizeAmount(rawIncome).amount;
      } catch {
        incAmt = 0;
      }
    }
    if (rawExpense !== null && rawExpense !== "" && rawExpense !== undefined) {
      try {
        expAmt = normalizeAmount(rawExpense).amount;
      } catch {
        expAmt = 0;
      }
    }

    if (incAmt > 0) {
      type = "INCOME";
      amount = incAmt;
    } else if (expAmt > 0) {
      type = "EXPENSE";
      amount = expAmt;
    } else {
      // Tidak ada nominal transaksi di baris ini
      r++;
      continue;
    }

    // Ambil saldo baris jika ada
    let balance = null;
    if (colBalance !== -1 && row[colBalance] !== null && row[colBalance] !== "") {
      try {
        balance = normalizeAmount(row[colBalance]).amount;
      } catch {
        balance = null;
      }
    }

    rows.push({
      index: txIndex++,
      date: parsedDateObj.date,
      time: parsedDateObj.time,
      description,
      type,
      amount,
      balance
    });

    r++;
  }

  // Rekonsiliasi ringkasan (hanya sebagai peringatan non-blocking)
  if (meta.initialBalance !== null && meta.closingBalance !== null) {
    const totalIncomeParsed = rows.filter((r) => r.type === "INCOME").reduce((sum, r) => sum + r.amount, 0);
    const totalExpenseParsed = rows.filter((r) => r.type === "EXPENSE").reduce((sum, r) => sum + r.amount, 0);

    const calculatedClosing = meta.initialBalance + totalIncomeParsed - totalExpenseParsed;
    const diff = Math.abs(calculatedClosing - meta.closingBalance);

    if (diff > 0.01) {
      warnings.push(
        `Rekonsiliasi: Saldo akhir terhitung (${calculatedClosing.toLocaleString("id-ID")}) berselisih ${diff.toLocaleString("id-ID")} dengan saldo akhir ringkasan (${meta.closingBalance.toLocaleString("id-ID")}). Berkas mungkin hanya mencakup mutasi parsial.`
      );
    }
  }

  return {
    rows,
    meta,
    warnings
  };
}
