/**
 * Skrip Uji Mesin Pembaca PDF Generik (M8.4-2)
 *
 * Menguji seluruh fungsionalitas dan batas keamanan pdfReader.js:
 * 1. Uji Unit ekstraksi koordinat spasial (extractLinesAndCellsFromItems):
 *    - Pengelompokan baris (toleransi y)
 *    - Penggabungan potongan teks dalam sel yang sama (fragment merging)
 *    - Pemisahan sel kolom yang berbeda berdasarkan jarak horizontal (colGapThreshold)
 * 2. Uji Integrasi readPdfBuffer:
 *    - pdf-single-page.pdf: membaca tabel 1 halaman dengan tepat
 *    - pdf-multi-page.pdf: membaca multi-halaman dengan tepat
 *    - pdf-multiline-desc.pdf: menangani deskripsi transaksi multi-baris
 *    - pdf-debit-credit.pdf: mengenali kolom debit/kredit terpisah
 *    - pdf-scanned-no-text.pdf: menolak PDF hasil scan (tanpa lapisan teks) dengan HTTP 400
 *    - pdf-51-pages.pdf: menolak dokumen > 50 halaman dengan HTTP 400
 *    - pdf-encrypted.pdf tanpa password: HTTP 400 dengan field file_password
 *    - pdf-encrypted.pdf password salah: HTTP 400 dengan field file_password
 *    - pdf-encrypted.pdf password benar: berhasil membaca dokumen
 *    - Signature check: menolak buffer non-PDF dengan HTTP 400
 * 3. Uji Integrasi readFileBuffer di parsers/reader.js:
 *    - Format PDF dideteksi dan mengembalikan { format: 'pdf', grid, pdf, isEncrypted }
 */

import assert from "assert";
import fs from "fs";
import path from "path";
import os from "os";
import {
  readPdfBuffer,
  extractLinesAndCellsFromItems,
  hasPdfSignature,
  MAX_PDF_PAGES,
  MAX_PDF_PROCESSING_TIMEOUT_MS
} from "../src/services/import/pdf/pdfReader.js";
import { readFileBuffer } from "../src/services/import/parsers/reader.js";

const FIXTURE_DIR = path.join(os.tmpdir(), "finreport-m8-fixtures");
const FIXTURE_PASSWORD = process.env.M8_FIXTURE_PASSWORD;

function runUnitTests() {
  console.log("==================================================================");
  console.log("MENJALANKAN UJI UNIT PENGELOMPOKAN BARIS & SEL (M8.4-2)");
  console.log("==================================================================");

  // Skenario U1: Penggabungan potongan kata yang terpecah dalam sel yang sama
  console.log("\n[Uji Unit 1] Penggabungan potongan teks (fragment merging) dalam satu sel...");
  const mockItems1 = [
    { str: "Setoran", transform: [1, 0, 0, 1, 40, 500], width: 35 },
    { str: " ", transform: [1, 0, 0, 1, 75, 500], width: 3 },
    { str: "Awal", transform: [1, 0, 0, 1, 78, 500], width: 22 }
  ];
  const lines1 = extractLinesAndCellsFromItems(mockItems1);
  assert.strictEqual(lines1.length, 1, "Harus menghasilkan 1 baris");
  assert.strictEqual(lines1[0].cells.length, 1, "Harus menghasilkan 1 sel");
  assert.strictEqual(lines1[0].cells[0].text, "Setoran Awal");
  console.log("PASSED - 'Setoran', ' ', 'Awal' berhasil digabungkan menjadi 'Setoran Awal'.");

  // Skenario U2: Pemisahan 3 kolom berdasarkan jarak horizontal
  console.log("\n[Uji Unit 2] Pemisahan kolom tabel...");
  const mockItems2 = [
    { str: "2026-08-01", transform: [1, 0, 0, 1, 40, 500], width: 55 },
    { str: " ", transform: [1, 0, 0, 1, 95, 500], width: 25 }, // Gap lebar
    { str: "Beli Kopi", transform: [1, 0, 0, 1, 120, 500], width: 50 },
    { str: " ", transform: [1, 0, 0, 1, 170, 500], width: 30 }, // Gap lebar
    { str: "50000", transform: [1, 0, 0, 1, 200, 500], width: 30 }
  ];
  const lines2 = extractLinesAndCellsFromItems(mockItems2);
  assert.strictEqual(lines2.length, 1);
  assert.strictEqual(lines2[0].cells.length, 3, "Harus menghasilkan 3 sel kolom terpisah");
  assert.strictEqual(lines2[0].cells[0].text, "2026-08-01");
  assert.strictEqual(lines2[0].cells[1].text, "Beli Kopi");
  assert.strictEqual(lines2[0].cells[2].text, "50000");
  console.log("PASSED - 3 kolom terpisah berhasil diekstraksi.");

  // Skenario U3: Pengurutan vertikal (y tinggi ke rendah)
  console.log("\n[Uji Unit 3] Pengurutan baris dari atas ke bawah...");
  const mockItems3 = [
    { str: "Baris Bawah (Baris 2)", transform: [1, 0, 0, 1, 40, 480], width: 100 },
    { str: "Baris Atas (Baris 1)", transform: [1, 0, 0, 1, 40, 500], width: 100 }
  ];
  const lines3 = extractLinesAndCellsFromItems(mockItems3);
  assert.strictEqual(lines3.length, 2);
  assert.strictEqual(lines3[0].cells[0].text, "Baris Atas (Baris 1)");
  assert.strictEqual(lines3[1].cells[0].text, "Baris Bawah (Baris 2)");
  console.log("PASSED - Baris diurutkan secara benar dari atas ke bawah.");

  // Skenario U4: Toleransi vertikal pada baris yang sama
  console.log("\n[Uji Unit 4] Toleransi vertikal (y difference <= 3pt)...");
  const mockItems4 = [
    { str: "Kolom A", transform: [1, 0, 0, 1, 40, 500.5], width: 40 },
    { str: " ", transform: [1, 0, 0, 1, 80.5, 500.5], width: 20 },
    { str: "Kolom B", transform: [1, 0, 0, 1, 100.5, 499.0], width: 40 } // Beda 1.5pt
  ];
  const lines4 = extractLinesAndCellsFromItems(mockItems4);
  assert.strictEqual(lines4.length, 1, "Harus digabungkan ke dalam 1 baris yang sama");
  assert.strictEqual(lines4[0].cells.length, 2);
  console.log("PASSED - Perbedaan posisi vertikal 1.5pt ditangani sebagai baris yang sama.");
}

async function runIntegrationTests() {
  console.log("\n==================================================================");
  console.log("MENJALANKAN UJI INTEGRASI MESIN PEMBACA PDF (readPdfBuffer)");
  console.log("==================================================================");

  // 1. Signature Check
  console.log("\n[Integrasi 1] Memeriksa validasi signature %PDF-...");
  assert.strictEqual(hasPdfSignature(Buffer.from("%PDF-1.4")), true);
  assert.strictEqual(hasPdfSignature(Buffer.from("PK\x03\x04")), false);
  assert.strictEqual(hasPdfSignature(Buffer.from("Bukan PDF")), false);

  await assert.rejects(
    async () => {
      await readPdfBuffer({ buffer: Buffer.from("Bukan berkas PDF") });
    },
    (err) => {
      assert.strictEqual(err.statusCode, 400);
      assert.strictEqual(err.message, "Format berkas bukan PDF yang valid");
      return true;
    }
  );
  console.log("PASSED - Signature non-PDF ditolak HTTP 400.");

  // 2. pdf-single-page.pdf
  console.log("\n[Integrasi 2] Membaca pdf-single-page.pdf...");
  const singlePdfPath = path.join(FIXTURE_DIR, "pdf-single-page.pdf");
  assert.ok(fs.existsSync(singlePdfPath), "Fixture pdf-single-page.pdf harus ada");
  const singleBuf = fs.readFileSync(singlePdfPath);

  const singleRes = await readPdfBuffer({ buffer: singleBuf });
  assert.strictEqual(singleRes.meta.pageCount, 1);
  assert.strictEqual(singleRes.pages.length, 1);
  assert.ok(singleRes.grid.length >= 5, "Harus memiliki minimal 5 baris (header + 4 tx)");
  // Cari baris header
  const headerRow = singleRes.grid.find((r) => r.includes("Tanggal") && r.includes("Keterangan"));
  assert.ok(headerRow, "Baris header tabel harus ditemukan");
  // Cari baris transaksi
  const txRow = singleRes.grid.find((r) => r.includes("Gaji Pokok Agustus"));
  assert.ok(txRow, "Baris gaji harus ditemukan");
  assert.ok(txRow.includes("10000000"));
  assert.ok(txRow.includes("CR"));
  console.log(`PASSED - 1 halaman berhasil dibaca (${singleRes.grid.length} baris, ${singleRes.meta.pageCount} halaman).`);

  // 3. pdf-multi-page.pdf
  console.log("\n[Integrasi 3] Membaca pdf-multi-page.pdf...");
  const multiPdfPath = path.join(FIXTURE_DIR, "pdf-multi-page.pdf");
  assert.ok(fs.existsSync(multiPdfPath));
  const multiBuf = fs.readFileSync(multiPdfPath);

  const multiRes = await readPdfBuffer({ buffer: multiBuf });
  assert.ok(multiRes.meta.pageCount > 1, `Harus memiliki lebih dari 1 halaman (didapat: ${multiRes.meta.pageCount})`);
  assert.ok(multiRes.grid.length > 50, "Harus mengekstraksi seluruh baris transaksi");
  console.log(`PASSED - Multi-halaman berhasil dibaca (${multiRes.meta.pageCount} halaman, ${multiRes.grid.length} baris).`);

  // 4. pdf-multiline-desc.pdf
  console.log("\n[Integrasi 4] Membaca pdf-multiline-desc.pdf...");
  const multilinePdfPath = path.join(FIXTURE_DIR, "pdf-multiline-desc.pdf");
  assert.ok(fs.existsSync(multilinePdfPath));
  const multilineBuf = fs.readFileSync(multilinePdfPath);

  const multilineRes = await readPdfBuffer({ buffer: multilineBuf });
  assert.ok(multilineRes.grid.length > 0);
  const foundGrosir = multilineRes.grid.some((row) => row.some((cell) => cell.includes("GROSIR")));
  assert.ok(foundGrosir, "Teks multi-baris GROSIR harus ditemukan di kisi");
  console.log("PASSED - Deskripsi multi-baris berhasil diekstraksi.");

  // 5. pdf-debit-credit.pdf
  console.log("\n[Integrasi 5] Membaca pdf-debit-credit.pdf...");
  const dcPdfPath = path.join(FIXTURE_DIR, "pdf-debit-credit.pdf");
  assert.ok(fs.existsSync(dcPdfPath));
  const dcBuf = fs.readFileSync(dcPdfPath);

  const dcRes = await readPdfBuffer({ buffer: dcBuf });
  const dcHeader = dcRes.grid.find((r) => r.includes("Debit") && r.includes("Kredit"));
  assert.ok(dcHeader, "Header dengan kolom Debit dan Kredit harus ditemukan");
  console.log("PASSED - Kolom terpisah Debit & Kredit berhasil diekstraksi.");

  // 6. pdf-scanned-no-text.pdf (Harus ditolak 400)
  console.log("\n[Integrasi 6] Memvalidasi penolakan PDF hasil scan tanpa teks...");
  const scannedPdfPath = path.join(FIXTURE_DIR, "pdf-scanned-no-text.pdf");
  assert.ok(fs.existsSync(scannedPdfPath));
  const scannedBuf = fs.readFileSync(scannedPdfPath);

  await assert.rejects(
    async () => {
      await readPdfBuffer({ buffer: scannedBuf });
    },
    (err) => {
      assert.strictEqual(err.statusCode, 400);
      assert.strictEqual(
        err.message,
        "PDF hasil scan (gambar) belum didukung. Gunakan template standar FinReport."
      );
      return true;
    },
    "PDF scan tanpa teks harus ditolak dengan pesan yang mengarahkan ke template"
  );
  console.log("PASSED - PDF scan ditolak HTTP 400 dengan pesan yang jelas.");

  // 7. pdf-51-pages.pdf (Harus ditolak > 50 halaman)
  console.log("\n[Integrasi 7] Memvalidasi batas maksimal 50 halaman (pdf-51-pages.pdf)...");
  const p51PdfPath = path.join(FIXTURE_DIR, "pdf-51-pages.pdf");
  assert.ok(fs.existsSync(p51PdfPath));
  const p51Buf = fs.readFileSync(p51PdfPath);

  await assert.rejects(
    async () => {
      await readPdfBuffer({ buffer: p51Buf });
    },
    (err) => {
      assert.strictEqual(err.statusCode, 400);
      assert.ok(
        err.message.includes("Jumlah halaman PDF melebihi batas maksimal") ||
        err.message.includes("50 halaman"),
        `Pesan batas halaman tidak sesuai: ${err.message}`
      );
      return true;
    },
    "PDF 51 halaman harus ditolak dengan pesan batas 50 halaman"
  );
  console.log("PASSED - PDF 51 halaman ditolak HTTP 400.");

  // 8. pdf-encrypted.pdf (Proteksi Password)
  if (FIXTURE_PASSWORD) {
    console.log("\n[Integrasi 8] Menguji PDF terenkripsi password...");
    const encPdfPath = path.join(FIXTURE_DIR, "pdf-encrypted.pdf");
    assert.ok(fs.existsSync(encPdfPath));
    const encBuf = fs.readFileSync(encPdfPath);

    // 8a. Tanpa password -> 400 dengan field file_password
    console.log("  8a. Membuka tanpa password...");
    await assert.rejects(
      async () => {
        await readPdfBuffer({ buffer: encBuf });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.ok(Array.isArray(err.errors), "Harus memiliki array errors");
        assert.strictEqual(err.errors[0].field, "file_password");
        assert.strictEqual(err.errors[0].message, "Berkas PDF membutuhkan password untuk dibuka");
        return true;
      }
    );
    console.log("  PASSED - Tanpa password menghasilkan 400 dengan errors field file_password.");

    // 8b. Password salah -> 400 dengan field file_password
    console.log("  8b. Membuka dengan password salah...");
    await assert.rejects(
      async () => {
        await readPdfBuffer({ buffer: encBuf, password: "PasswordYangSalah123" });
      },
      (err) => {
        assert.strictEqual(err.statusCode, 400);
        assert.ok(Array.isArray(err.errors));
        assert.strictEqual(err.errors[0].field, "file_password");
        assert.strictEqual(err.errors[0].message, "Password berkas PDF salah");
        return true;
      }
    );
    console.log("  PASSED - Password salah menghasilkan 400 dengan errors field file_password.");

    // 8c. Password benar -> sukses membaca
    console.log("  8c. Membuka dengan password benar...");
    const encRes = await readPdfBuffer({ buffer: encBuf, password: FIXTURE_PASSWORD });
    assert.strictEqual(encRes.meta.pageCount, 1);
    assert.ok(encRes.grid.length > 0);
    const foundSecret = encRes.grid.some((r) => r.some((c) => c.includes("Rahasia Encrypted")));
    assert.ok(foundSecret, "Teks rahasia harus terbaca setelah didekripsi");
    console.log("  PASSED - PDF terenkripsi berhasil dibuka dengan password yang benar.");
  } else {
    console.log("\n[Integrasi 8] INFO: M8_FIXTURE_PASSWORD tidak diset, melewati uji PDF terenkripsi.");
  }

  // 9. Integrasi readFileBuffer
  console.log("\n[Integrasi 9] Memverifikasi cabang PDF di readFileBuffer (parsers/reader.js)...");
  const readerPdfRes = await readFileBuffer({
    buffer: singleBuf,
    fileName: "mutasi_single.pdf"
  });
  assert.strictEqual(readerPdfRes.format, "pdf");
  assert.ok(Array.isArray(readerPdfRes.grid));
  assert.ok(readerPdfRes.pdf);
  assert.strictEqual(readerPdfRes.pdf.meta.pageCount, 1);
  assert.strictEqual(readerPdfRes.isEncrypted, false);
  console.log("PASSED - readFileBuffer mengenali format PDF dan menyertakan ctx.pdf.");

  console.log("\nSELURUH VERIFIKASI M8.4-2 BERHASIL!");
}

async function main() {
  runUnitTests();
  await runIntegrationTests();
}

main().catch((err) => {
  console.error("GAGAL:", err);
  process.exit(1);
});
