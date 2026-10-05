/**
 * Reader Berkas Mutasi (Buffer In-Memory)
 *
 * Membaca buffer CSV, XLSX standar, dan XLSX terenkripsi tanpa menulis ke disk.
 * Mendeteksi enkripsi OLE/CFB lewat signature D0CF11E0 dan mendekripsi
 * menggunakan officecrypto-tool.
 */

import ExcelJS from "exceljs";
import officecrypto from "officecrypto-tool";

// Signature OLE Compound Document (CFB)
const OLE_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0];

/**
 * Mengecek apakah buffer diawali oleh magic bytes OLE/CFB (D0CF11E0).
 *
 * @param {Buffer} buffer
 * @returns {boolean}
 */
export function hasOleSignature(buffer) {
  if (!buffer || buffer.length < 4) return false;
  return (
    buffer[0] === OLE_SIGNATURE[0] &&
    buffer[1] === OLE_SIGNATURE[1] &&
    buffer[2] === OLE_SIGNATURE[2] &&
    buffer[3] === OLE_SIGNATURE[3]
  );
}

/**
 * Mengambil nilai representasi string atau primitif dari sel ExcelJS.
 *
 * @param {import("exceljs").Cell} cell
 * @returns {any}
 */
export function getCellValue(cell) {
  if (!cell || cell.value === null || cell.value === undefined) return "";

  // Jika sel merupakan bagian dari merge range, utamakan nilai master
  const raw = cell.master && cell.master.value !== undefined ? cell.master.value : cell.value;
  if (raw === null || raw === undefined) return "";

  if (typeof raw === "object") {
    // Rich Text
    if (Array.isArray(raw.richText)) {
      return raw.richText.map((chunk) => chunk.text || "").join("").trim();
    }
    // Hasil Formula
    if (raw.result !== undefined && raw.result !== null) {
      return raw.result;
    }
    // Objek Text
    if (raw.text !== undefined && raw.text !== null) {
      return String(raw.text).trim();
    }
    // Tanggal
    if (raw instanceof Date) {
      return raw;
    }
    return "";
  }

  return raw;
}

/**
 * Membaca worksheet ExcelJS menjadi array 2D bernilai primitif.
 * Baris 1-indexed Excel dikonversi ke array 0-indexed.
 *
 * @param {import("exceljs").Worksheet} worksheet
 * @returns {any[][]}
 */
export function worksheetToGrid(worksheet) {
  const maxRow = worksheet.rowCount;
  const maxCol = Math.max(worksheet.columnCount, 1);
  const grid = [];

  for (let r = 1; r <= maxRow; r++) {
    const row = worksheet.getRow(r);
    const rowCells = [];
    for (let c = 1; c <= maxCol; c++) {
      const cell = row.getCell(c);
      rowCells.push(getCellValue(cell));
    }
    grid.push(rowCells);
  }

  return grid;
}

/**
 * Membaca string CSV menjadi array 2D.
 * Mendukung pembatas koma (,), titik koma (;), atau tab (\t).
 *
 * @param {string} text
 * @returns {string[][]}
 */
export function parseCsvText(text) {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  // Deteksi pemisah paling umum di baris pertama
  const sample = lines[0];
  const commaCount = (sample.match(/,/g) || []).length;
  const semicolonCount = (sample.match(/;/g) || []).length;
  const tabCount = (sample.match(/\t/g) || []).length;

  let delimiter = ",";
  if (semicolonCount > commaCount && semicolonCount >= tabCount) {
    delimiter = ";";
  } else if (tabCount > commaCount && tabCount > semicolonCount) {
    delimiter = "\t";
  }

  const result = [];
  for (const line of lines) {
    const row = [];
    let insideQuotes = false;
    let currentCell = "";

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (insideQuotes && line[i + 1] === '"') {
          currentCell += '"';
          i++; // Lewati quote kedua (escaped)
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === delimiter && !insideQuotes) {
        row.push(currentCell.trim());
        currentCell = "";
      } else {
        currentCell += char;
      }
    }
    row.push(currentCell.trim());
    result.push(row);
  }

  return result;
}

/**
 * Membaca buffer file mutasi (CSV, XLSX, atau XLSX terenkripsi) dari memori.
 *
 * @param {object} params
 * @param {Buffer} params.buffer - Isi file dalam Buffer
 * @param {string} params.fileName - Nama file asli
 * @param {string|null} [params.password] - Password jika file terenkripsi
 * @returns {Promise<{ format: 'xlsx'|'csv', grid: any[][], rawBuffer: Buffer, isEncrypted: boolean }>}
 */
export async function readFileBuffer({ buffer, fileName, password = null }) {
  if (!buffer || !Buffer.isBuffer(buffer)) {
    const error = new Error("Buffer file tidak valid atau kosong");
    error.statusCode = 400;
    throw error;
  }

  const ext = (fileName || "").toLowerCase().split(".").pop();
  let workingBuffer = buffer;
  let isEncrypted = false;

  // Cek apakah file merupakan kontainer OLE/CFB yang terenkripsi
  const hasOle = hasOleSignature(buffer);
  let isEncryptedTool = false;
  try {
    isEncryptedTool = officecrypto.isEncrypted(buffer);
  } catch {
    isEncryptedTool = false;
  }

  if (hasOle || isEncryptedTool) {
    isEncrypted = true;
    if (!password) {
      const error = new Error("File terenkripsi membutuhkan password untuk dibuka");
      error.statusCode = 400;
      throw error;
    }

    try {
      workingBuffer = await officecrypto.decrypt(buffer, { password });
    } catch (err) {
      // Tangani password salah atau kegagalan dekripsi dengan pesan domain yang bersih
      const errMsg = (err && err.message ? err.message : "").toLowerCase();
      if (
        errMsg.includes("password is incorrect") ||
        errMsg.includes("invalid password") ||
        errMsg.includes("bad password") ||
        errMsg.includes("verifykey")
      ) {
        const error = new Error("Password file salah");
        error.statusCode = 400;
        throw error;
      }

      const error = new Error("Gagal mendekripsi file: format enkripsi tidak didukung atau password tidak cocok");
      error.statusCode = 400;
      throw error;
    }
  }

  // Jika CSV
  if (ext === "csv") {
    const text = workingBuffer.toString("utf8");
    const grid = parseCsvText(text);
    return {
      format: "csv",
      grid,
      rawBuffer: workingBuffer,
      isEncrypted
    };
  }

  // Jika XLSX atau berkas Excel
  try {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(workingBuffer);

    if (workbook.worksheets.length === 0) {
      const error = new Error("File Excel tidak memiliki lembar kerja (worksheet)");
      error.statusCode = 400;
      throw error;
    }

    const sheets = {};
    for (const ws of workbook.worksheets) {
      sheets[ws.name] = worksheetToGrid(ws);
    }

    // Default grid: sheet 'Mutasi' jika ada, fallback ke sheet pertama
    const mutasiSheet = workbook.getWorksheet("Mutasi") || workbook.worksheets[0];
    const grid = worksheetToGrid(mutasiSheet);

    return {
      format: "xlsx",
      grid,
      sheets,
      rawBuffer: workingBuffer,
      isEncrypted
    };
  } catch (err) {
    if (err.statusCode) throw err;
    const error = new Error("Gagal membaca struktur berkas Excel atau format tidak valid");
    error.statusCode = 400;
    throw error;
  }
}
