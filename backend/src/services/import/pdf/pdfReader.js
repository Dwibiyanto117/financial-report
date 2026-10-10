/**
 * Reader Berkas PDF Generik (Buffer In-Memory)
 *
 * Menggunakan pdfjs-dist (legacy build) untuk mengekstraksi lapisan teks PDF,
 * koordinat spasial (x, y), dan merekonstruksi struktur tabel menjadi baris dan sel.
 *
 * Fitur Keamanan & Batasan:
 * 1. Validasi signature %PDF-
 * 2. Opsi keamanan: isEvalSupported: false, disableFontFace: true, tanpa pemuatan eksternal
 * 3. Dukungan password terenkripsi dengan respon galat standar field "file_password"
 * 4. Batas maksimal 50 halaman (MAX_PDF_PAGES)
 * 5. Batas waktu eksekusi maksimal 15 detik (MAX_PDF_PROCESSING_TIMEOUT_MS)
 * 6. Penolakan PDF hasil scan (tanpa lapisan teks)
 * 7. Pembersihan memori pdfDoc.destroy() selalu dijalankan
 */

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// Konstanta Batas PDF
export const MAX_PDF_PAGES = process.env.IMPORT_PDF_MAX_PAGES
  ? parseInt(process.env.IMPORT_PDF_MAX_PAGES, 10)
  : 50;

export const MAX_PDF_PROCESSING_TIMEOUT_MS = process.env.IMPORT_PDF_TIMEOUT_MS
  ? parseInt(process.env.IMPORT_PDF_TIMEOUT_MS, 10)
  : 15000;

export const MAX_PDF_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

// Konstanta Toleransi Koordinat
export const DEFAULT_Y_TOLERANCE = 3.0; // Toleransi vertikal pengelompokan baris (pt)
export const DEFAULT_COL_GAP_THRESHOLD = 8.0; // Jarak horizontal minimum untuk memisahkan sel baru (pt)

/**
 * Validasi apakah buffer memiliki signature PDF (%PDF-).
 *
 * @param {Buffer} buffer
 * @returns {boolean}
 */
export function hasPdfSignature(buffer) {
  if (!buffer || buffer.length < 5) return false;
  return buffer.slice(0, 5).toString("utf8") === "%PDF-";
}

/**
 * Mengelompokkan item teks mentah dari halaman PDF menjadi baris dan sel terstruktur.
 * Fungsi murni tanpa efek samping, dapat diuji unit secara mandiri.
 *
 * @param {Array<{ str: string, transform: number[], width: number }>} items
 * @param {object} [options]
 * @param {number} [options.yTolerance]
 * @param {number} [options.colGapThreshold]
 * @returns {Array<{ y: number, cells: Array<{ x: number, text: string }> }>}
 */
export function extractLinesAndCellsFromItems(items, options = {}) {
  const yTolerance = options.yTolerance ?? DEFAULT_Y_TOLERANCE;
  const colGapThreshold = options.colGapThreshold ?? DEFAULT_COL_GAP_THRESHOLD;

  if (!items || items.length === 0) return [];

  // Salin dan normalisasi item
  const validItems = items.map((it) => ({
    str: it.str || "",
    x: it.transform ? it.transform[4] : 0,
    y: it.transform ? it.transform[5] : 0,
    w: it.width || 0
  }));

  // Kelompokkan item ke dalam baris berdasarkan koordinat y
  const linesMap = [];
  for (const item of validItems) {
    let line = linesMap.find((l) => Math.abs(l.y - item.y) <= yTolerance);
    if (!line) {
      line = { y: item.y, items: [] };
      linesMap.push(line);
    }
    line.items.push(item);
  }

  // Urutkan baris dari atas ke bawah (y tinggi ke rendah pada sistem koordinat PDF)
  linesMap.sort((a, b) => b.y - a.y);

  const structuredLines = [];

  for (const line of linesMap) {
    // Urutkan item dalam baris dari kiri ke kanan (x rendah ke tinggi)
    line.items.sort((a, b) => a.x - b.x);

    const cells = [];
    let curCell = null;

    for (const it of line.items) {
      const isWhitespace = !it.str || it.str.trim().length === 0;

      if (isWhitespace) {
        if (it.w >= colGapThreshold && curCell) {
          // Spasi lebar antar-kolom: akhiri sel aktif
          curCell = null;
        } else if (curCell && !curCell.text.endsWith(" ")) {
          // Spasi sempit dalam kata/kalimat: sisipkan spasi
          curCell.text += " ";
        }
        continue;
      }

      if (!curCell) {
        curCell = {
          x: it.x,
          endX: it.x + it.w,
          text: it.str
        };
        cells.push(curCell);
      } else {
        const gap = it.x - curCell.endX;
        if (gap >= colGapThreshold) {
          // Jarak horizontal cukup lebar -> buat sel kolom baru
          curCell = {
            x: it.x,
            endX: it.x + it.w,
            text: it.str
          };
          cells.push(curCell);
        } else {
          // Potongan teks bersambung dalam sel yang sama
          const needSpace = gap > 1.5 && !curCell.text.endsWith(" ") && !it.str.startsWith(" ");
          curCell.text += (needSpace ? " " : "") + it.str;
          curCell.endX = it.x + it.w;
        }
      }
    }

    // Bersihkan teks sel dan saring baris yang memiliki sel terisi
    const cleanCells = cells
      .map((c) => ({ x: c.x, text: c.text.trim() }))
      .filter((c) => c.text.length > 0);

    if (cleanCells.length > 0) {
      structuredLines.push({
        y: line.y,
        cells: cleanCells
      });
    }
  }

  return structuredLines;
}

/**
 * Membaca buffer PDF dari memori, mengekstraksi teks, dan merekonstruksi kisi baris/sel.
 *
 * @param {object} params
 * @param {Buffer} params.buffer - Isi berkas PDF dalam Buffer
 * @param {string|null} [params.password] - Password jika PDF terenkripsi
 * @returns {Promise<{ pages: Array<{ number: number, lines: Array<{ y: number, cells: Array<{ x: number, text: string }> }> }>, grid: string[][], meta: { pageCount: number, totalTextLength: number } }>}
 */
export async function readPdfBuffer({ buffer, password = null }) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    const error = new Error("Buffer file tidak valid atau kosong");
    error.statusCode = 400;
    throw error;
  }

  if (buffer.length > MAX_PDF_SIZE_BYTES) {
    const error = new Error("Ukuran berkas melebihi batas maksimal 5 MB");
    error.statusCode = 400;
    throw error;
  }

  if (!hasPdfSignature(buffer)) {
    const error = new Error("Format berkas bukan PDF yang valid");
    error.statusCode = 400;
    throw error;
  }

  let loadingTask = null;
  let pdfDoc = null;
  let timerId = null;

  try {
    // Bangun loading task pdf.js dengan opsi hardening keamanan
    const docParams = {
      data: new Uint8Array(buffer),
      isEvalSupported: false,
      disableFontFace: true,
      useSystemFonts: true,
      verbosity: 0 // Matikan log verbose
    };

    if (password) {
      docParams.password = String(password);
    }

    loadingTask = pdfjsLib.getDocument(docParams);

    // Timeout protection guard (15 detik)
    const timeoutPromise = new Promise((_, reject) => {
      timerId = setTimeout(() => {
        const timeoutError = new Error("Waktu pemrosesan berkas PDF melebihi batas maksimal (15 detik)");
        timeoutError.statusCode = 400;
        reject(timeoutError);
      }, MAX_PDF_PROCESSING_TIMEOUT_MS);
    });

    try {
      pdfDoc = await Promise.race([loadingTask.promise, timeoutPromise]);
    } catch (loadErr) {
      // Tangani galat password PDF
      const errName = loadErr.name || "";
      const errMsg = (loadErr.message || "").toLowerCase();
      const errCode = loadErr.code;

      if (errName === "PasswordException" || errMsg.includes("password")) {
        if (!password || errCode === 1 || errMsg.includes("no password")) {
          const error = new Error("Berkas PDF membutuhkan password untuk dibuka");
          error.statusCode = 400;
          error.errors = [
            { field: "file_password", message: "Berkas PDF membutuhkan password untuk dibuka" }
          ];
          throw error;
        } else {
          const error = new Error("Password berkas PDF salah");
          error.statusCode = 400;
          error.errors = [
            { field: "file_password", message: "Password berkas PDF salah" }
          ];
          throw error;
        }
      }

      if (loadErr.statusCode) throw loadErr;

      const error = new Error("Gagal membaca struktur berkas PDF atau berkas rusak");
      error.statusCode = 400;
      throw error;
    }

    // Periksa batas jumlah halaman (maksimal 50)
    const numPages = pdfDoc.numPages;
    if (numPages > MAX_PDF_PAGES) {
      const error = new Error(
        `Jumlah halaman PDF melebihi batas maksimal (maksimal ${MAX_PDF_PAGES} halaman, terdeteksi: ${numPages} halaman)`
      );
      error.statusCode = 400;
      throw error;
    }

    // Ekstraksi teks per halaman
    const pages = [];
    const grid = [];
    let totalTextLength = 0;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const textContent = await page.getTextContent();

      const lines = extractLinesAndCellsFromItems(textContent.items);

      for (const line of lines) {
        const rowCells = line.cells.map((c) => c.text);
        grid.push(rowCells);
        totalTextLength += rowCells.join("").length;
      }

      pages.push({
        number: pageNum,
        lines
      });

      // Bersihkan resources halaman
      page.cleanup();
    }

    // Validasi lapisan teks: PDF hasil scan gambar tanpa teks ditolak
    if (totalTextLength === 0) {
      const error = new Error(
        "PDF hasil scan (gambar) belum didukung. Gunakan template standar FinReport."
      );
      error.statusCode = 400;
      throw error;
    }

    return {
      pages,
      grid,
      meta: {
        pageCount: numPages,
        totalTextLength
      }
    };
  } finally {
    if (timerId) clearTimeout(timerId);
    if (pdfDoc) {
      try {
        await pdfDoc.destroy();
      } catch {
        // Abaikan galat pembersihan
      }
    } else if (loadingTask) {
      try {
        await loadingTask.destroy();
      } catch {
        // Abaikan galat pembersihan
      }
    }
  }
}
