/**
 * Unit Test untuk Reader dan Parser Mutasi (Batch M8.1-3)
 *
 * Menguji:
 * 1. reader.js: CSV, deteksi OLE, dekripsi password benar vs salah.
 * 2. generic.js: parsing CSV/grid dengan pemetaan kolom nama dan indeks.
 * 3. mandiri.js: parsing sample Mandiri nyata (ekstraksi tanggal, jam, nominal, rekonsiliasi non-blocking).
 * 4. index.js: registry dan deteksi otomatis parser.
 */

import assert from "assert";
import fs from "fs";
import { readFileBuffer, parseCsvText } from "../src/services/import/parsers/reader.js";
import { parse as parseGeneric } from "../src/services/import/parsers/generic.js";
import { parse as parseMandiri, detect as detectMandiri } from "../src/services/import/parsers/mandiri.js";
import { detectParser, getParser, listParsers } from "../src/services/import/parsers/index.js";

async function runTests() {
  console.log("Menjalankan uji unit reader dan parser...");

  // 1. Uji CSV Reader
  const csvSample = `Tanggal,Keterangan,Jumlah,Tipe
2026-08-01,"Beli Kopi, Kafe",25000,EXPENSE
2026-08-02,"Gaji Bulanan",5000000,INCOME`;
  const csvGrid = parseCsvText(csvSample);
  assert.strictEqual(csvGrid.length, 3, "Harus ada 3 baris di CSV");
  assert.strictEqual(csvGrid[1][1], "Beli Kopi, Kafe", "Quote dengan koma harus dipertahankan");
  console.log("OK - CSV text parsing");

  // 2. Uji Generic Parser
  const genericRes = parseGeneric({
    grid: csvGrid,
    mapping: { date: "Tanggal", description: "Keterangan", amount: "Jumlah", type: "Tipe" }
  });
  assert.strictEqual(genericRes.rows.length, 2, "Harus menghasilkan 2 transaksi");
  assert.strictEqual(genericRes.rows[0].amount, 25000);
  assert.strictEqual(genericRes.rows[0].type, "EXPENSE");
  assert.strictEqual(genericRes.rows[1].amount, 5000000);
  assert.strictEqual(genericRes.rows[1].type, "INCOME");
  console.log("OK - Generic parser dengan mapping nama header");

  // Uji Generic Parser dengan debit/kredit
  const csvDebitKredit = [
    ["Tanggal", "Keterangan", "Debet", "Kredit"],
    ["01/08/2026", "Makan Siang", "35.000,00", ""],
    ["02/08/2026", "Transfer Masuk", "", "100.000,00"]
  ];
  const dkRes = parseGeneric({
    grid: csvDebitKredit,
    mapping: { date: 0, description: 1, debit: 2, credit: 3 }
  });
  assert.strictEqual(dkRes.rows.length, 2);
  assert.strictEqual(dkRes.rows[0].type, "EXPENSE");
  assert.strictEqual(dkRes.rows[0].amount, 35000);
  assert.strictEqual(dkRes.rows[1].type, "INCOME");
  assert.strictEqual(dkRes.rows[1].amount, 100000);
  console.log("OK - Generic parser dengan mapping indeks debit/kredit");

  // 3. Uji Dekripsi File Sampel Mandiri
  const samplePath =
    process.env.MANDIRI_SAMPLE_PATH ||
    "C:\\Users\\DW\\Downloads\\e-Statement_XXXXXXXXX8990_01 Agu 2026-31 Agu 2026.xlsx";

  if (fs.existsSync(samplePath)) {
    const sampleBuffer = fs.readFileSync(samplePath);
    const validPassword = process.env.MANDIRI_SAMPLE_PASSWORD;

    if (!validPassword) {
      throw new Error("MANDIRI_SAMPLE_PASSWORD tidak ditemukan di environment");
    }

    // Uji password salah -> harus melempar error 400 domain "Password file salah"
    let wrongPassCaught = false;
    try {
      await readFileBuffer({
        buffer: sampleBuffer,
        fileName: "mandiri.xlsx",
        password: "wrong_password_12345"
      });
    } catch (err) {
      wrongPassCaught = true;
      assert.strictEqual(err.statusCode, 400);
      assert.strictEqual(err.message, "Password file salah");
    }
    assert.strictEqual(wrongPassCaught, true, "Password salah harus ditolak dengan HTTP 400");
    console.log("OK - Reader menolak password salah dengan HTTP 400 bersih");

    // Uji password benar
    const readResult = await readFileBuffer({
      buffer: sampleBuffer,
      fileName: "e-Statement_XXXXXXXXX8990_01 Agu 2026-31 Agu 2026.xlsx",
      password: validPassword
    });
    assert.strictEqual(readResult.format, "xlsx");
    assert.strictEqual(readResult.isEncrypted, true);
    assert.ok(readResult.grid.length > 20);
    console.log("OK - Reader mendekripsi file sampel Mandiri dengan password benar");

    // 4. Uji Mandiri Parser terhadap Sampel Nyata
    const mandiriRes = parseMandiri({
      grid: readResult.grid,
      fileName: "e-Statement_XXXXXXXXX8990_01 Agu 2026-31 Agu 2026.xlsx"
    });

    assert.strictEqual(mandiriRes.rows.length, 10, "Sampel Mandiri harus memiliki 10 transaksi");
    // Verifikasi tanggal dan jam transaksi pertama
    assert.ok(mandiriRes.rows[0].date instanceof Date);
    assert.strictEqual(mandiriRes.rows[0].time, "17:10:32");
    assert.strictEqual(mandiriRes.rows[0].type, "EXPENSE");
    assert.strictEqual(mandiriRes.rows[0].amount, 283000);
    assert.strictEqual(mandiriRes.rows[0].balance, 3540391);

    // Verifikasi metadata saldo
    assert.strictEqual(mandiriRes.meta.initialBalance, 3823391);
    assert.strictEqual(mandiriRes.meta.closingBalance, 1452422);
    assert.strictEqual(mandiriRes.meta.accountNumberMasked, "...8990");

    // Verifikasi peringatan rekonsiliasi non-blocking
    assert.ok(mandiriRes.warnings.length > 0, "Peringatan rekonsiliasi harus muncul untuk sampel parsial");
    console.log("OK - Mandiri parser: 10 transaksi, jam 17:10:32, saldo awal/akhir, rekonsiliasi non-blocking");

    // 5. Uji Parser Registry & Auto Detection
    const detected = detectParser({
      grid: readResult.grid,
      fileName: "e-Statement_XXXXXXXXX8990_01 Agu 2026-31 Agu 2026.xlsx"
    });
    assert.strictEqual(detected.name, "mandiri");
    console.log("OK - Registry mendeteksi parser Mandiri otomatis dengan skor tinggi");

    // Uji registry list
    const list = listParsers();
    assert.ok(list.some((p) => p.name === "mandiri"));
    assert.ok(list.some((p) => p.name === "generic"));
    console.log("OK - Registry list parsers");
  } else {
    console.log("File sampel Mandiri tidak ditemukan di path:", samplePath);
  }

  console.log("Semua pengujian unit Batch M8.1-3 BERHASIL!");
}

runTests().catch((err) => {
  console.error("Gagal menjalankan uji Batch M8.1-3:", err);
  process.exit(1);
});
