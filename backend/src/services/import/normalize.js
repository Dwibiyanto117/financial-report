/**
 * Utilitas Normalisasi Data Import Mutasi
 *
 * Mengonversi format angka, tanggal/waktu (Indonesia & Internasional),
 * dan menetralkan potensi injeksi formula sel (CSV injection).
 */

const MONTH_MAP = {
  // Bahasa Indonesia
  jan: 1, januari: 1,
  feb: 2, februari: 2,
  mar: 3, maret: 3,
  apr: 4, april: 4,
  mei: 5,
  jun: 6, juni: 6,
  jul: 7, juli: 7,
  agu: 8, ags: 8, agustus: 8,
  sep: 9, september: 9,
  okt: 10, oktober: 10,
  nop: 11, nov: 11, nopember: 11, november: 11,
  des: 12, desember: 12,
  // Bahasa Inggris
  aug: 8, august: 8,
  oct: 10, october: 10,
  dec: 12, december: 12
};

/**
 * Menetralkan isi sel string dari karakter awal berbahaya (=, +, -, @)
 * guna mencegah serangan formula injection ketika diekspor kembali.
 *
 * @param {any} val
 * @returns {any}
 */
export function sanitizeCell(val) {
  if (typeof val !== "string") return val;
  const trimmed = val.trim();
  if (
    trimmed.startsWith("=") ||
    trimmed.startsWith("+") ||
    trimmed.startsWith("-") ||
    trimmed.startsWith("@")
  ) {
    return `'${val}`;
  }
  return val;
}

/**
 * Menormalkan angka dalam format Indonesia (1.234.567,00) atau
 * internasional (1,234,567.00) menjadi tipe number positif dengan presisi 2 desimal.
 *
 * @param {string|number} rawValue
 * @returns {{ amount: number, isNegative: boolean, rawSign: number }}
 */
export function normalizeAmount(rawValue) {
  if (rawValue === undefined || rawValue === null || rawValue === "") {
    throw new Error("Nominal transaksi tidak boleh kosong");
  }

  if (typeof rawValue === "number") {
    if (Number.isNaN(rawValue)) {
      throw new Error("Nominal transaksi tidak valid");
    }
    const isNegative = rawValue < 0;
    const amount = Math.round(Math.abs(rawValue) * 100) / 100;
    return {
      amount,
      isNegative,
      rawSign: isNegative ? -1 : 1
    };
  }

  let str = String(rawValue).trim();
  // Deteksi kurung penanda nilai negatif: (100.000) -> negatif
  let isNegative = false;
  if (str.startsWith("(") && str.endsWith(")")) {
    isNegative = true;
    str = str.slice(1, -1).trim();
  } else if (str.startsWith("-")) {
    isNegative = true;
    str = str.slice(1).trim();
  } else if (str.startsWith("+")) {
    str = str.slice(1).trim();
  }

  // Bersihkan simbol mata uang (Rp, IDR, spasi)
  str = str.replace(/^(rp\.?|idr)\s*/i, "").trim();

  // Bersihkan karakter selain digit, titik, dan koma
  str = str.replace(/[^0-9.,]/g, "");

  if (!str) {
    throw new Error("Nominal transaksi tidak valid");
  }

  const hasDot = str.includes(".");
  const hasComma = str.includes(",");

  let cleanStr = str;
  if (hasDot && hasComma) {
    const lastDotIndex = str.lastIndexOf(".");
    const lastCommaIndex = str.lastIndexOf(",");
    if (lastCommaIndex > lastDotIndex) {
      // Format Indonesia: ribuan titik, desimal koma (1.234.567,89)
      cleanStr = str.replace(/\./g, "").replace(",", ".");
    } else {
      // Format Internasional: ribuan koma, desimal titik (1,234,567.89)
      cleanStr = str.replace(/,/g, "");
    }
  } else if (hasComma) {
    // Hanya koma: jika ada 1 koma dan diikuti 1-2 digit di akhir, kemungkinan desimal
    const commaParts = str.split(",");
    if (commaParts.length === 2 && commaParts[1].length <= 2) {
      cleanStr = `${commaParts[0]}.${commaParts[1]}`;
    } else {
      // Pemisah ribuan (1,250,000)
      cleanStr = str.replace(/,/g, "");
    }
  } else if (hasDot) {
    // Hanya titik: cek apakah pemisah ribuan (283.000) atau desimal (283.50)
    const dotParts = str.split(".");
    if (dotParts.length > 2) {
      // Format ribuan (1.234.567)
      cleanStr = str.replace(/\./g, "");
    } else if (dotParts.length === 2) {
      if (dotParts[1].length === 3) {
        // Contoh 283.000 -> ribuan Indonesia
        cleanStr = `${dotParts[0]}${dotParts[1]}`;
      } else {
        // Contoh 283.5 atau 283.50 -> desimal
        cleanStr = `${dotParts[0]}.${dotParts[1]}`;
      }
    }
  }

  const num = parseFloat(cleanStr);
  if (Number.isNaN(num)) {
    throw new Error(`Gagal membaca nominal: "${rawValue}"`);
  }

  const rounded = Math.round(Math.abs(num) * 100) / 100;
  return {
    amount: rounded,
    isNegative,
    rawSign: isNegative ? -1 : 1
  };
}

/**
 * Mengonversi tanggal & jam dari berbagai format teks Indonesia/Inggris
 * menjadi objek Date terstandar (UTC midnight) dan string waktu (HH:mm:ss atau null).
 *
 * Contoh masukan:
 * - "01 Agu 2026"
 * - "01 Agu 2026 17:10:32 WIB"
 * - "01 Aug 2026 17:10"
 * - "2026-08-01"
 * - "01/08/2026"
 * - 45870 (Excel serial date)
 *
 * @param {string|number|Date} rawValue
 * @returns {{ date: Date, time: string|null, dateString: string }}
 */
export function normalizeDate(rawValue) {
  if (!rawValue) {
    throw new Error("Tanggal transaksi wajib diisi");
  }

  // Jika berupa objek Date
  if (rawValue instanceof Date) {
    if (Number.isNaN(rawValue.getTime())) {
      throw new Error("Tanggal transaksi tidak valid");
    }
    const year = rawValue.getFullYear();
    const month = String(rawValue.getMonth() + 1).padStart(2, "0");
    const day = String(rawValue.getDate()).padStart(2, "0");
    const dateString = `${year}-${month}-${day}`;
    const date = new Date(Date.UTC(year, rawValue.getMonth(), rawValue.getDate()));
    const time = `${String(rawValue.getHours()).padStart(2, "0")}:${String(rawValue.getMinutes()).padStart(2, "0")}:${String(rawValue.getSeconds()).padStart(2, "0")}`;
    return { date, time, dateString };
  }

  // Jika berupa Excel serial date number
  if (typeof rawValue === "number") {
    // 1 Januari 1900 adalah serial 1
    // Serial 60 = 29 Feb 1900 (Excel leap year bug)
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const millis = excelEpoch.getTime() + rawValue * 86400 * 1000;
    const d = new Date(millis);
    const year = d.getUTCFullYear();
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    const dateString = `${year}-${month}-${day}`;
    const date = new Date(Date.UTC(year, d.getUTCMonth(), d.getUTCDate()));
    return { date, time: null, dateString };
  }

  let str = String(rawValue).trim();

  // Ekstrak waktu jika ada (mis. "17:10:32 WIB" atau "17:10:32" atau "17:10")
  let time = null;
  const timeRegex = /(\d{1,2}:\d{2}(?::\d{2})?)(?:\s*(?:WIB|WITA|WIT|UTC|GMT|[A-Z]{3}))?/i;
  const timeMatch = str.match(timeRegex);
  if (timeMatch) {
    const rawTime = timeMatch[1];
    const parts = rawTime.split(":");
    const hh = parts[0].padStart(2, "0");
    const mm = parts[1].padStart(2, "0");
    const ss = parts[2] ? parts[2].padStart(2, "0") : "00";
    time = `${hh}:${mm}:${ss}`;
    // Hapus bagian waktu dari string tanggal
    str = str.replace(timeMatch[0], "").trim();
  }

  // Hapus sisa karakter koma atau pemisah
  str = str.replace(/^[,\s-]+|[,\s-]+$/g, "");

  let year = null;
  let month = null;
  let day = null;

  // Format ISO: YYYY-MM-DD
  const isoMatch = str.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (isoMatch) {
    year = parseInt(isoMatch[1], 10);
    month = parseInt(isoMatch[2], 10);
    day = parseInt(isoMatch[3], 10);
  }

  // Format DD-MM-YYYY atau DD/MM/YYYY
  const dmyMatch = str.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (!year && dmyMatch) {
    day = parseInt(dmyMatch[1], 10);
    month = parseInt(dmyMatch[2], 10);
    year = parseInt(dmyMatch[3], 10);
  }

  // Format teks bulan: "01 Agu 2026", "1 August 2026", "01-Agu-2026"
  const textMonthMatch = str.match(/^(\d{1,2})[\s\-]+([a-zA-Z]+)[\s\-]+(\d{4})$/);
  if (!year && textMonthMatch) {
    day = parseInt(textMonthMatch[1], 10);
    const monthName = textMonthMatch[2].toLowerCase();
    month = MONTH_MAP[monthName];
    year = parseInt(textMonthMatch[3], 10);
    if (!month) {
      throw new Error(`Nama bulan tidak dikenali: "${textMonthMatch[2]}"`);
    }
  }

  if (!year || !month || !day) {
    throw new Error(`Format tanggal tidak dikenali: "${rawValue}"`);
  }

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Tanggal di luar rentang kalender yang valid: "${rawValue}"`);
  }

  const mmStr = String(month).padStart(2, "0");
  const ddStr = String(day).padStart(2, "0");
  const dateString = `${year}-${mmStr}-${ddStr}`;
  const date = new Date(Date.UTC(year, month - 1, day));

  return { date, time, dateString };
}
