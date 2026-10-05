/**
 * Daftar Bank & Institusi Template Standar FinReport
 *
 * Seluruh bank memakai struktur kolom yang seragam.
 * Perbedaan hanya pada label dan nama berkas yang diunduh.
 */

export const BANK_TEMPLATES = [
  { code: "BCA", label: "Bank Central Asia (BCA)" },
  { code: "MANDIRI", label: "Bank Mandiri" },
  { code: "BRI", label: "Bank Rakyat Indonesia (BRI)" },
  { code: "BNI", label: "Bank Negara Indonesia (BNI)" },
  { code: "CIMB", label: "CIMB Niaga" },
  { code: "JAGO", label: "Bank Jago" },
  { code: "DANA", label: "DANA" },
  { code: "OVO", label: "OVO" },
  { code: "GOPAY", label: "GoPay" },
  { code: "LAINNYA", label: "Bank / Dompet Digital Lainnya" }
];

export const ALLOWED_FORMATS = ["xlsx", "csv"];

/**
 * Validasi dan ambil konfigurasi template bank.
 *
 * @param {string} [rawCode]
 * @returns {{ code: string, label: string }}
 */
export function getBankTemplate(rawCode) {
  if (!rawCode || String(rawCode).trim() === "") {
    return BANK_TEMPLATES.find((b) => b.code === "LAINNYA");
  }

  const clean = String(rawCode).trim().toUpperCase();
  const found = BANK_TEMPLATES.find((b) => b.code === clean);
  if (!found) {
    const error = new Error(`Kode bank "${rawCode}" tidak valid. Pilihan yang didukung: ${BANK_TEMPLATES.map((b) => b.code).join(", ")}`);
    error.statusCode = 400;
    throw error;
  }
  return found;
}
