/**
 * Skrip Uji Regresi Formula Injection pada Ekspor Excel (M8.4-1a)
 *
 * Menguji bahwa endpoint GET /api/reports/export/excel:
 * 1. Menulis transaksi dengan deskripsi berawalan '=', '+', '-', '@' sebagai sel teks murni (t="s" atau inlineStr)
 * 2. Tidak memuat elemen formula (<f>) pada sel deskripsi transaksi di sheet XML
 * 3. ExcelJS membaca sel sebagai ValueType.String dengan cell.formula === undefined
 *
 * Membersihkan seluruh transaksi ujinya sendiri di akhir eksekusi.
 */

import assert from "assert";
import zlib from "zlib";
import ExcelJS from "exceljs";
import prisma from "../src/config/prisma.js";

const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000/api";
const TEST_EMAIL = process.env.M8_TEST_EMAIL || "m8test2@example.com";
const TEST_PASSWORD = process.env.M8_TEST_PASSWORD;

if (!TEST_PASSWORD) {
  console.error("ERROR: M8_TEST_PASSWORD wajib diset di environment!");
  process.exit(1);
}

/**
 * Ekstrak berkas dari buffer ZIP (XLSX) menggunakan struktur standar PKZIP dan zlib bawaan Node.js.
 */
function extractZipFile(zipBuf, targetPath) {
  let pos = 0;
  while (pos < zipBuf.length - 4) {
    if (zipBuf.readUInt32LE(pos) === 0x04034b50) {
      const method = zipBuf.readUInt16LE(pos + 8);
      const cSize = zipBuf.readUInt32LE(pos + 18);
      const fnLen = zipBuf.readUInt16LE(pos + 26);
      const exLen = zipBuf.readUInt16LE(pos + 28);
      const fn = zipBuf.toString("utf8", pos + 30, pos + 30 + fnLen);
      const dataStart = pos + 30 + fnLen + exLen;
      const dataEnd = dataStart + cSize;
      const data = zipBuf.subarray(dataStart, dataEnd);

      if (fn === targetPath) {
        if (method === 0) {
          return data.toString("utf8");
        } else if (method === 8) {
          return zlib.inflateRawSync(data).toString("utf8");
        } else {
          throw new Error(`Kompresi metode ${method} tidak didukung`);
        }
      }
      pos = dataEnd;
    } else {
      pos++;
    }
  }
  return null;
}

async function runFormulaExportTest() {
  console.log("==================================================================");
  console.log("MENJALANKAN UJI REGRESI EKSPOR EXCEL (M8.4-1a)");
  console.log("==================================================================");

  // 1. Dapatkan user dan akun
  const user = await prisma.user.findUnique({
    where: { email: TEST_EMAIL },
    include: { accounts: true }
  });
  assert.ok(user, `User ${TEST_EMAIL} harus ada (jalankan seed-m8-testdata.js terlebih dahulu)`);
  assert.ok(user.accounts.length > 0, "User harus memiliki setidaknya satu rekening");
  const account = user.accounts[0];

  // 2. Login untuk mendapatkan JWT token
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
  });
  assert.strictEqual(loginRes.status, 200, "Login gagal");
  const loginData = await loginRes.json();
  const token = loginData.data.token;

  // 3. Sisipkan transaksi uji dengan awalan formula
  const formulaDescriptions = [
    "=1+1 Formula Injection Test",
    "+SUM(A1:B10) Plus Formula Test",
    "-20*5 Minus Formula Test",
    "@HYPERLINK(\"http://evil.com\") At Formula Test"
  ];

  const createdTxIds = [];
  try {
    for (const desc of formulaDescriptions) {
      const tx = await prisma.transaction.create({
        data: {
          userId: user.id,
          accountId: account.id,
          amount: 50000,
          type: "EXPENSE",
          description: desc,
          transactionDate: new Date()
        }
      });
      createdTxIds.push(tx.id);
    }
    console.log(`[Setup] Membuat ${createdTxIds.length} transaksi uji dengan karakter awalan formula.`);

    // 4. Unduh ekspor Excel
    console.log("[Test] Mengambil berkas ekspor dari GET /api/reports/export/excel...");
    const exportRes = await fetch(`${BASE_URL}/reports/export/excel?accountId=${account.id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    assert.strictEqual(exportRes.status, 200, `Ekspor gagal dengan status: ${exportRes.status}`);
    const contentType = exportRes.headers.get("content-type") || "";
    assert.ok(
      contentType.includes("spreadsheetml") || contentType.includes("octet-stream"),
      `Content-type tidak sesuai: ${contentType}`
    );

    const arrayBuffer = await exportRes.arrayBuffer();
    const xlsxBuffer = Buffer.from(arrayBuffer);
    assert.ok(xlsxBuffer.length > 0, "Buffer Excel tidak boleh kosong");

    // 5. Verifikasi via ExcelJS parser
    console.log("[Verifikasi 1] Memeriksa tipe sel via ExcelJS...");
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(xlsxBuffer);
    const ws = wb.getWorksheet("Laporan Keuangan");
    assert.ok(ws, "Lembar 'Laporan Keuangan' harus ditemukan di workbook");

    const foundDescriptions = [];
    ws.eachRow((row, rowNumber) => {
      if (rowNumber >= 8) { // Data dimulai setelah header
        const descCell = row.getCell(7); // Kolom 7 = Keterangan
        const val = descCell.value;
        if (typeof val === "string" && formulaDescriptions.includes(val)) {
          foundDescriptions.push(val);
          // Pastikan tipe sel adalah string murni (ExcelJS.ValueType.String = 3)
          assert.strictEqual(
            descCell.type,
            ExcelJS.ValueType.String,
            `Sel ${descCell.address} harus bertipe String, ditemukan: ${descCell.type}`
          );
          // Pastikan tidak ada properti formula
          assert.strictEqual(
            descCell.formula,
            undefined,
            `Sel ${descCell.address} tidak boleh memiliki formula! Formula ditemukan: ${descCell.formula}`
          );
        }
      }
    });

    assert.strictEqual(
      foundDescriptions.length,
      formulaDescriptions.length,
      `Seluruh ${formulaDescriptions.length} deskripsi formula harus ditemukan di tabel ekspor`
    );
    console.log(`PASSED - ExcelJS membaca ${foundDescriptions.length} sel sebagai string murni tanpa formula.`);

    // 6. Verifikasi XML sheet langsung (OpenXML specification check)
    console.log("[Verifikasi 2] Memeriksa XML mentah sheet1.xml (OpenXML)...");
    const sheetXml = extractZipFile(xlsxBuffer, "xl/worksheets/sheet1.xml");
    assert.ok(sheetXml, "Berkas xl/worksheets/sheet1.xml harus dapat diekstrak dari berkas XLSX");

    // Cari seluruh tag <c ...> di sheetData
    // Di OpenXML, formula selalu didefinisikan dengan elemen anak <f>...</f>
    // Sel teks menggunakan t="s" (shared strings) atau t="inlineStr"
    assert.strictEqual(
      sheetXml.includes("<f>"),
      false,
      "Tabel transaksi tidak boleh memuat elemen formula <f> sama sekali!"
    );
    assert.strictEqual(
      sheetXml.includes("<f "),
      false,
      "Tabel transaksi tidak boleh memuat tag <f ...> sama sekali!"
    );
    console.log("PASSED - Berkas sheet1.xml terverifikasi tidak memuat tag formula <f>.");

    // Periksa shared strings bila ada
    const sharedStringsXml = extractZipFile(xlsxBuffer, "xl/sharedStrings.xml");
    if (sharedStringsXml) {
      for (const desc of formulaDescriptions) {
        const escapedDesc = desc
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&apos;");
        assert.ok(
          sharedStringsXml.includes(escapedDesc) || sharedStringsXml.includes(desc) || sheetXml.includes(escapedDesc) || sheetXml.includes(desc),
          `Deskripsi "${desc}" harus tersimpan aman di sharedStrings.xml atau sheet1.xml`
        );
      }
      console.log("PASSED - String formula tersimpan sebagai entri teks biasa di sharedStrings.xml.");
    }

    console.log("\nSELURUH VERIFIKASI M8.4-1a BERHASIL!");
  } finally {
    // 7. Cleanup selalu dieksekusi
    if (createdTxIds.length > 0) {
      await prisma.transaction.deleteMany({
        where: { id: { in: createdTxIds } }
      });
      console.log(`[Cleanup] Menghapus ${createdTxIds.length} transaksi uji.`);
    }
  }
}

runFormulaExportTest().catch((err) => {
  console.error("GAGAL:", err);
  process.exit(1);
});
