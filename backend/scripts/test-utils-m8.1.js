/**
 * Unit Test Murni untuk normalize.js dan fingerprint.js (Batch M8.1-2)
 *
 * Menguji normalisasi angka, tanggal, bulan Indonesia/Inggris, sanitasi sel,
 * serta keunikan dan konsistensi SHA-256 fingerprint tanpa melibatkan koneksi database.
 */

import assert from "assert";
import { normalizeAmount, normalizeDate, sanitizeCell } from "../src/services/import/normalize.js";
import { computeFingerprint, normalizeDescription } from "../src/services/import/fingerprint.js";

console.log("Menjalankan uji unit utilitas import...");

// 1. Uji Sanitasi Sel (Anti-CSV Injection)
assert.strictEqual(sanitizeCell("=1+1"), "'=1+1", "Formula = harus diawali kutip tunggal");
assert.strictEqual(sanitizeCell("+12345"), "'+12345", "Formula + harus diawali kutip tunggal");
assert.strictEqual(sanitizeCell("-200"), "'-200", "Formula - harus diawali kutip tunggal");
assert.strictEqual(sanitizeCell("@SUM"), "'@SUM", "Formula @ harus diawali kutip tunggal");
assert.strictEqual(sanitizeCell("Transaksi Normal"), "Transaksi Normal", "Teks biasa tidak boleh diubah");
assert.strictEqual(sanitizeCell(12345), 12345, "Angka bukan string tidak diubah");
console.log("OK - Sanitasi sel");

// 2. Uji Normalisasi Angka
// Format Indonesia
const id1 = normalizeAmount("1.234.567,00");
assert.strictEqual(id1.amount, 1234567, "Gagal parse 1.234.567,00");
assert.strictEqual(id1.isNegative, false);

const id2 = normalizeAmount("283.000,00");
assert.strictEqual(id2.amount, 283000, "Gagal parse 283.000,00");

const id3 = normalizeAmount("283.000");
assert.strictEqual(id3.amount, 283000, "Gagal parse 283.000");

// Format Internasional
const en1 = normalizeAmount("1,234,567.89");
assert.strictEqual(en1.amount, 1234567.89, "Gagal parse 1,234,567.89");

// Dengan mata uang dan spasi
const cur1 = normalizeAmount("Rp 50.000,00");
assert.strictEqual(cur1.amount, 50000, "Gagal parse Rp 50.000,00");

// Negatif / Kurung
const neg1 = normalizeAmount("(100.000,00)");
assert.strictEqual(neg1.amount, 100000);
assert.strictEqual(neg1.isNegative, true);

const neg2 = normalizeAmount("-75.500,50");
assert.strictEqual(neg2.amount, 75500.5);
assert.strictEqual(neg2.isNegative, true);

// Tipe number asli
const num1 = normalizeAmount(500000);
assert.strictEqual(num1.amount, 500000);

console.log("OK - Normalisasi angka (Indonesia, Internasional, mata uang, negatif)");

// 3. Uji Normalisasi Tanggal & Waktu
// Bahasa Indonesia
const dateId1 = normalizeDate("01 Agu 2026");
assert.strictEqual(dateId1.dateString, "2026-08-01");
assert.strictEqual(dateId1.time, null);

const dateId2 = normalizeDate("01 Agu 2026 17:10:32 WIB");
assert.strictEqual(dateId2.dateString, "2026-08-01");
assert.strictEqual(dateId2.time, "17:10:32");

// Bahasa Inggris
const dateEn1 = normalizeDate("01 Aug 2026 17:10:32");
assert.strictEqual(dateEn1.dateString, "2026-08-01");
assert.strictEqual(dateEn1.time, "17:10:32");

const dateEn2 = normalizeDate("15 Oct 2026");
assert.strictEqual(dateEn2.dateString, "2026-10-15");

// Format ISO dan DD/MM/YYYY
const dateIso = normalizeDate("2026-08-01");
assert.strictEqual(dateIso.dateString, "2026-08-01");

const dateDmy = normalizeDate("01/08/2026");
assert.strictEqual(dateDmy.dateString, "2026-08-01");

// Bulan lainnya
const dateMei = normalizeDate("20 Mei 2026");
assert.strictEqual(dateMei.dateString, "2026-05-20");

const dateDes = normalizeDate("31 Des 2026");
assert.strictEqual(dateDes.dateString, "2026-12-31");

console.log("OK - Normalisasi tanggal & waktu (Indonesia, Inggris, ISO, DMY)");

// 4. Uji Fingerprint
const fp1 = computeFingerprint({
  accountId: 1,
  date: "2026-08-01",
  time: "17:10:32",
  amount: 283000,
  type: "EXPENSE",
  description: "Trsf E-Banking Cr 0108/FTSCY/WS95221 283000.00",
  occurrenceIndex: 1
});
assert.strictEqual(typeof fp1, "string");
assert.strictEqual(fp1.length, 64, "Panjang hash sha256 harus 64 heksadesimal");

// Input identik harus menghasilkan fingerprint yang sama
const fp2 = computeFingerprint({
  accountId: 1,
  date: "2026-08-01",
  time: "17:10:32",
  amount: 283000,
  type: "EXPENSE",
  description: "  trsf e-banking cr 0108/ftscy/ws95221  283000.00  ",
  occurrenceIndex: 1
});
assert.strictEqual(fp1, fp2, "Fingerprint harus konsisten untuk deskripsi setelah normalisasi whitespace");

// Transaksi kembar pada hari dan jam sama, tetapi occurrenceIndex berbeda
const fpTwin = computeFingerprint({
  accountId: 1,
  date: "2026-08-01",
  time: "17:10:32",
  amount: 283000,
  type: "EXPENSE",
  description: "Trsf E-Banking Cr 0108/FTSCY/WS95221 283000.00",
  occurrenceIndex: 2
});
assert.notStrictEqual(fp1, fpTwin, "Transaksi kembar dengan occurrenceIndex berbeda harus beda fingerprint");

// Rekening berbeda harus beda fingerprint
const fpOtherAcc = computeFingerprint({
  accountId: 2,
  date: "2026-08-01",
  time: "17:10:32",
  amount: 283000,
  type: "EXPENSE",
  description: "Trsf E-Banking Cr 0108/FTSCY/WS95221 283000.00",
  occurrenceIndex: 1
});
assert.notStrictEqual(fp1, fpOtherAcc, "Rekening berbeda harus menghasilkan fingerprint berbeda");

console.log("OK - SHA-256 Fingerprint (konsistensi, normalisasi spasi, transaksi kembar, beda rekening)");
console.log("Semua pengujian unit Batch M8.1-2 BERHASIL!");
