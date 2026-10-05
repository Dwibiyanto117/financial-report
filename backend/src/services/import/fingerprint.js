/**
 * Utilitas Fingerprint Transaksi Import
 *
 * Menghasilkan hash SHA-256 unik untuk setiap transaksi mutasi:
 * sha256(accountId|tanggal|jam|nominal|tipe|deskripsi_ternormalisasi|urutan_kemunculan_dalam_hari)
 *
 * Jam transaksi ikut disertakan jika tersedia pada file mutasi
 * untuk membedakan transaksi kembar yang terjadi pada jam berbeda.
 */

import crypto from "crypto";

/**
 * Menormalkan teks deskripsi:
 * Mengubah ke huruf kecil, menghapus spasi berlebih, dan trim.
 *
 * @param {string} desc
 * @returns {string}
 */
export function normalizeDescription(desc) {
  if (!desc) return "";
  return String(desc)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Menghitung fingerprint transaksi.
 *
 * @param {object} params
 * @param {number|string} params.accountId
 * @param {Date|string} params.date
 * @param {string|null} [params.time] - Format HH:mm:ss atau HH:mm (opsional)
 * @param {number|string} params.amount
 * @param {string} params.type - INCOME | EXPENSE
 * @param {string} [params.description]
 * @param {number} [params.occurrenceIndex=1] - Urutan kemunculan baris identik dalam satu hari
 * @returns {string} Hash SHA-256 64 karakter heksadesimal
 */
export function computeFingerprint({
  accountId,
  date,
  time = null,
  amount,
  type,
  description = "",
  occurrenceIndex = 1
}) {
  if (!accountId) {
    throw new Error("accountId wajib untuk menghitung fingerprint");
  }
  if (!date) {
    throw new Error("date wajib untuk menghitung fingerprint");
  }
  if (amount === undefined || amount === null) {
    throw new Error("amount wajib untuk menghitung fingerprint");
  }
  if (!type) {
    throw new Error("type (INCOME|EXPENSE) wajib untuk menghitung fingerprint");
  }

  // Format tanggal YYYY-MM-DD
  let dateStr = "";
  if (date instanceof Date) {
    dateStr = date.toISOString().slice(0, 10);
  } else {
    dateStr = String(date).slice(0, 10);
  }

  const timeStr = time ? String(time).trim() : "";
  const amountStr = Number(amount).toFixed(2);
  const normType = String(type).toUpperCase().trim();
  const normDesc = normalizeDescription(description);
  const occIndex = Number(occurrenceIndex) || 1;

  // Payload: accountId|tanggal|jam|nominal|tipe|deskripsi|urutan
  const rawPayload = `${accountId}|${dateStr}|${timeStr}|${amountStr}|${normType}|${normDesc}|${occIndex}`;

  return crypto
    .createHash("sha256")
    .update(rawPayload, "utf8")
    .digest("hex");
}
