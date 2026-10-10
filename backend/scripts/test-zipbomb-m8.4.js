/**
 * Skrip Uji Proteksi Batas Dekompresi XLSX / Zip Bomb (M8.4-1b)
 *
 * Menguji bahwa:
 * 1. Berkas XLSX dengan total ukuran tak-terkompresi > 50 MB ditolak 400 ("Berkas Excel terlalu besar setelah diekstrak")
 * 2. Berkas XLSX dengan jumlah entri ZIP > 2000 ditolak 400 ("Struktur berkas Excel tidak wajar")
 * 3. Berkas XLSX terenkripsi yang setelah didekripsi menghasilkan ukuran tak-terkompresi > 50 MB ditolak 400
 * 4. Berkas XLSX normal tetap lolos validasi
 * 5. Uji end-to-end via POST /api/imports/preview mengembalikan HTTP 400 secara bersih
 */

import assert from "assert";
import JSZip from "jszip";
import officecrypto from "officecrypto-tool";
import prisma from "../src/config/prisma.js";
import {
  readFileBuffer,
  validateXlsxZipStructure,
  MAX_XLSX_UNCOMPRESSED_BYTES,
  MAX_XLSX_ZIP_ENTRIES
} from "../src/services/import/parsers/reader.js";

const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000/api";
const TEST_EMAIL = process.env.M8_TEST_EMAIL || "m8test2@example.com";
const TEST_PASSWORD = process.env.M8_TEST_PASSWORD;

if (!TEST_PASSWORD) {
  console.error("ERROR: M8_TEST_PASSWORD wajib diset di environment!");
  process.exit(1);
}

/**
 * Menghasilkan buffer XLSX sintetis dengan entri mengembang besar (> 50 MB)
 * namun ukuran file terkompresi sangat kecil (< 100 KB).
 */
async function createSyntheticZipBombBuffer() {
  const zip = new JSZip();
  // Alokasi 55 MB karakter 'A', terkompresi DEFLATE menjadi hanya ~55 KB
  const bigContent = Buffer.alloc(55 * 1024 * 1024, 65);
  zip.file("xl/worksheets/sheet1.xml", bigContent, { compression: "DEFLATE" });
  zip.file("[Content_Types].xml", "<Types><Default Extension=\"xml\" ContentType=\"application/xml\"/></Types>");
  zip.file("_rels/.rels", "<Relationships/>");
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

/**
 * Menghasilkan buffer XLSX sintetis dengan jumlah entri melebihi batas (> 2000 entri).
 */
async function createExcessiveEntriesZipBuffer() {
  const zip = new JSZip();
  for (let i = 0; i < 2005; i++) {
    zip.file(`xl/worksheets/sheet_${i}.xml`, `<worksheet id="${i}"/>`);
  }
  zip.file("[Content_Types].xml", "<Types/>");
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

/**
 * Menghasilkan buffer XLSX normal yang valid.
 */
async function createNormalXlsxBuffer() {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`);
  zip.file("xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>`);
  zip.file("xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Mutasi" sheetId="1" r:id="rId1"/></sheets>
</workbook>`);
  zip.file("xl/worksheets/sheet1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>
    <row r="1"><c r="A1" t="inlineStr"><is><t>Tanggal</t></is></c><c r="B1" t="inlineStr"><is><t>Keterangan</t></is></c><c r="C1" t="inlineStr"><is><t>Nominal</t></is></c></row>
    <row r="2"><c r="A2" t="inlineStr"><is><t>2026-08-01</t></is></c><c r="B2" t="inlineStr"><is><t>Uji Normal</t></is></c><c r="C2" t="inlineStr"><is><t>50000</t></is></c></row>
  </sheetData>
</worksheet>`);
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

async function runZipBombTests() {
  console.log("==================================================================");
  console.log("MENJALANKAN UJI PROTEKSI DEKOMPRESI XLSX / ZIP BOMB (M8.4-1b)");
  console.log("==================================================================");

  // 1. Uji Unit: validateXlsxZipStructure langsung
  console.log("\n[Uji Unit 1] Memvalidasi XLSX dengan uncompressed size > 50 MB...");
  const bombBuffer = await createSyntheticZipBombBuffer();
  console.log(`Ukuran terkompresi di memori: ${(bombBuffer.length / 1024).toFixed(1)} KB`);

  await assert.rejects(
    async () => {
      await validateXlsxZipStructure(bombBuffer);
    },
    (err) => {
      assert.strictEqual(err.statusCode, 400);
      assert.strictEqual(err.message, "Berkas Excel terlalu besar setelah diekstrak");
      return true;
    },
    "Buffer zip bomb harus ditolak dengan error 'Berkas Excel terlalu besar setelah diekstrak'"
  );
  console.log("PASSED - validateXlsxZipStructure menolak uncompressed size > 50 MB dengan HTTP 400.");

  // 2. Uji Unit: Batas jumlah entri > 2000
  console.log("\n[Uji Unit 2] Memvalidasi XLSX dengan entri > 2000...");
  const excessiveEntriesBuffer = await createExcessiveEntriesZipBuffer();
  await assert.rejects(
    async () => {
      await validateXlsxZipStructure(excessiveEntriesBuffer);
    },
    (err) => {
      assert.strictEqual(err.statusCode, 400);
      assert.strictEqual(err.message, "Struktur berkas Excel tidak wajar");
      return true;
    },
    "Buffer dengan > 2000 entri harus ditolak dengan error 'Struktur berkas Excel tidak wajar'"
  );
  console.log("PASSED - validateXlsxZipStructure menolak arsip dengan > 2000 entri dengan HTTP 400.");

  // 3. Uji Unit: XLSX normal lolos validasi
  console.log("\n[Uji Unit 3] Memvalidasi XLSX normal...");
  const normalBuffer = await createNormalXlsxBuffer();
  const normalResult = await validateXlsxZipStructure(normalBuffer);
  assert.ok(normalResult.totalUncompressedSize < MAX_XLSX_UNCOMPRESSED_BYTES);
  assert.ok(normalResult.entryCount <= MAX_XLSX_ZIP_ENTRIES);
  console.log(`PASSED - XLSX normal lolos (ukuran tak-terkompresi: ${normalResult.totalUncompressedSize} bytes, entri: ${normalResult.entryCount}).`);

  // 4. Uji Unit: readFileBuffer dengan berkas terenkripsi yang didekripsi menjadi zip bomb
  console.log("\n[Uji Unit 4] Memvalidasi berkas XLSX terenkripsi yang berisi zip bomb...");
  const encryptedBombBuffer = await officecrypto.encrypt(bombBuffer, {
    password: "TestPassword123"
  });
  await assert.rejects(
    async () => {
      await readFileBuffer({
        buffer: Buffer.from(encryptedBombBuffer),
        fileName: "mutasi-encrypted.xlsx",
        password: "TestPassword123"
      });
    },
    (err) => {
      assert.strictEqual(err.statusCode, 400);
      assert.strictEqual(err.message, "Berkas Excel terlalu besar setelah diekstrak");
      return true;
    },
    "Berkas terenkripsi yang menghasilkan payload > 50 MB harus ditolak saat dibaca"
  );
  console.log("PASSED - readFileBuffer menolak payload terenkripsi yang dekompresinya melebihi batas.");

  // 5. Uji Integrasi API: POST /api/imports/preview
  console.log("\n[Uji Integrasi API] Menguji upload zip bomb via POST /api/imports/preview...");
  const user = await prisma.user.findUnique({
    where: { email: TEST_EMAIL },
    include: { accounts: true }
  });
  assert.ok(user, "User uji harus ada");
  const accountId = user.accounts[0].id;

  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
  });
  assert.strictEqual(loginRes.status, 200);
  const { token } = (await loginRes.json()).data;

  // Unggah zip bomb
  const formBomb = new FormData();
  formBomb.append("file", new Blob([bombBuffer]), "synthetic-bomb.xlsx");
  formBomb.append("account_id", String(accountId));
  formBomb.append("parser", "generic");
  formBomb.append("mapping", JSON.stringify({ date: "Tanggal", description: "Keterangan", amount: "Nominal" }));

  const bombRes = await fetch(`${BASE_URL}/imports/preview`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formBomb
  });

  const bombJson = await bombRes.json();
  assert.strictEqual(bombRes.status, 400, `Zip bomb harus menghasilkan 400, didapat: ${bombRes.status}`);
  assert.strictEqual(bombJson.success, false);
  assert.ok(
    bombJson.message.includes("Berkas Excel terlalu besar setelah diekstrak") ||
    bombJson.message.includes("Struktur berkas Excel tidak wajar"),
    `Pesan error tidak sesuai: ${bombJson.message}`
  );
  console.log(`PASSED - API menolak zip bomb dengan HTTP 400: "${bombJson.message}".`);

  // Unggah file normal
  console.log("\n[Uji Integrasi API] Menguji upload berkas XLSX normal...");
  const formNormal = new FormData();
  formNormal.append("file", new Blob([normalBuffer]), "normal.xlsx");
  formNormal.append("account_id", String(accountId));
  formNormal.append("parser", "generic");
  formNormal.append("mapping", JSON.stringify({ date: "Tanggal", description: "Keterangan", amount: "Nominal" }));

  const normalRes = await fetch(`${BASE_URL}/imports/preview`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    },
    body: formNormal
  });

  assert.strictEqual(normalRes.status, 200, `Upload normal harus berhasil, didapat: ${normalRes.status}`);
  const normalJson = await normalRes.json();
  assert.strictEqual(normalJson.success, true);
  console.log(`PASSED - API berhasil memproses berkas XLSX normal (batchId: ${normalJson.data.batch_id}).`);

  // Bersihkan batch preview yang baru dibuat
  if (normalJson.data && normalJson.data.batch_id) {
    await prisma.importBatch.delete({
      where: { id: normalJson.data.batch_id }
    });
    console.log(`[Cleanup] Menghapus batch preview ${normalJson.data.batch_id}.`);
  }

  console.log("\nSELURUH VERIFIKASI M8.4-1b BERHASIL!");
}

runZipBombTests().catch((err) => {
  console.error("GAGAL:", err);
  process.exit(1);
});
