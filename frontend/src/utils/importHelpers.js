/**
 * Helper Utilitas Modul Import Frontend
 */

const TRANSFER_KEYWORDS = [
  "TRANSFER", "TRSF", "PEMINDAHAN", "PINDAH BUKU", "OVERBOOKING",
  "BI-FAST", "BI FAST", "SKN", "RTGS", "QRIS", "TOP UP", "TOPUP", "TOP-UP"
];

/**
 * Mendeteksi apakah baris transaksi kemungkinan merupakan transaksi transfer.
 * (Fitur informasional US-025, P2)
 *
 * @param {string} description
 * @param {Array<string>} [accountNames]
 * @returns {boolean}
 */
export function isPotentialTransfer(description = "", accountNames = []) {
  if (!description) return false;
  const upper = String(description).toUpperCase();

  // 1. Cek kata kunci transfer umum
  const hasKeyword = TRANSFER_KEYWORDS.some((kw) => upper.includes(kw));
  if (hasKeyword) return true;

  // 2. Cek apakah memuat nama rekening pengguna lain
  if (Array.isArray(accountNames) && accountNames.length > 0) {
    const hasAccountName = accountNames.some((accName) => {
      const cleanAcc = String(accName).trim().toUpperCase();
      return cleanAcc.length >= 3 && upper.includes(cleanAcc);
    });
    if (hasAccountName) return true;
  }

  return false;
}

/**
 * Menghasilkan konfigurasi label dan styling badge sumber rekomendasi kategori.
 *
 * @param {string} source
 * @returns {{ label: string, className: string }}
 */
export function getSuggestionBadge(source) {
  switch (source) {
    case "user_rule":
      return {
        label: "Aturan Anda",
        className: "bg-emerald-50 text-emerald-700 border-emerald-200"
      };
    case "template":
      return {
        label: "Template",
        className: "bg-sky-50 text-sky-700 border-sky-200"
      };
    case "builtin":
      return {
        label: "Bawaan",
        className: "bg-slate-100 text-slate-700 border-slate-200"
      };
    case "fallback":
    default:
      return {
        label: "Cadangan",
        className: "bg-amber-50 text-amber-700 border-amber-200"
      };
  }
}

/**
 * Menghitung dan memformat tampilan baris transaksi pada riwayat batch impor.
 *
 * @param {object} batch
 * @returns {{ primary: string, total: number, note: string | null, noteType: string }}
 */
export function getBatchRowCountDisplay(batch) {
  const status = batch?.status;
  const imported = batch?.imported_rows ?? batch?.importedRows ?? 0;
  const total = batch?.total_rows ?? batch?.totalRows ?? 0;
  const duplicate = batch?.duplicate_rows ?? batch?.duplicateRows ?? 0;

  if (status === "CANCELLED") {
    return {
      primary: "0",
      total,
      note: imported > 0 ? `${imported} transaksi dibatalkan` : "Pratinjau dibuang",
      noteType: "cancelled"
    };
  }

  if (status === "PREVIEW") {
    return {
      primary: "-",
      total,
      note: "Belum disimpan",
      noteType: "preview"
    };
  }

  return {
    primary: String(imported),
    total,
    note: duplicate > 0 ? `${duplicate} duplikat` : null,
    noteType: "committed"
  };
}
