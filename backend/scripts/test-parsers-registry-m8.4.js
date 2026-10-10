/**
 * Skrip Uji Parser Registry & Dynamic Upload Formats (M8.4-3)
 *
 * Menguji bahwa:
 * 1. listParsers() dan getAllowedUploadFormats() berfungsi dengan benar di registry.
 * 2. registerParser() dan unregisterParser() memungkinkan ekstensi dinamis tanpa modifikasi hardcoded.
 * 3. GET /api/imports/parsers mengembalikan daftar parser terdaftar beserta metadata formats dan requiresMapping.
 * 4. POST /api/imports/preview menolak berkas .pdf dengan HTTP 400 dan pesan panduan yang tepat saat belum ada PDF parser.
 * 5. POST /api/imports/preview menolak format berkas di luar allowlist (misal .txt atau .json).
 */

import assert from "assert";
import prisma from "../src/config/prisma.js";
import {
  listParsers,
  getAllowedUploadFormats,
  registerParser,
  unregisterParser
} from "../src/services/import/parsers/index.js";

const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000/api";
const TEST_EMAIL = process.env.M8_TEST_EMAIL || "m8test2@example.com";
const TEST_PASSWORD = process.env.M8_TEST_PASSWORD;

if (!TEST_PASSWORD) {
  console.error("ERROR: M8_TEST_PASSWORD wajib diset di environment!");
  process.exit(1);
}

let authToken = null;
let testAccountId = null;

async function authenticate() {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
  });

  const body = await res.json();
  if (!res.ok || !body.data?.token) {
    throw new Error(`Login gagal: ${res.status} - ${JSON.stringify(body)}`);
  }

  authToken = body.data.token;

  // Dapatkan rekening milik user
  const accRes = await fetch(`${BASE_URL}/accounts`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  const accBody = await accRes.json();
  if (accBody.data && accBody.data.length > 0) {
    testAccountId = accBody.data[0].id;
  }
}

async function runUnitTests() {
  console.log("\n--- Menjalankan Unit Tests Registry Parser ---");

  // 1. Uji listParsers
  const parsers = listParsers();
  assert(Array.isArray(parsers), "listParsers harus mengembalikan array");
  assert(parsers.length >= 3, "Harus ada minimal 3 parser bawaan");

  const mandiri = parsers.find((p) => p.name === "mandiri");
  assert(mandiri, "Parser mandiri harus terdaftar");
  assert.deepStrictEqual(mandiri.formats, ["xlsx"], "Format mandiri harus xlsx");
  assert.strictEqual(mandiri.requiresMapping, false, "Mandiri requiresMapping harus false");

  const template = parsers.find((p) => p.name === "template");
  assert(template, "Parser template harus terdaftar");
  assert.deepStrictEqual(template.formats, ["csv", "xlsx"], "Format template harus csv, xlsx");
  assert.strictEqual(template.requiresMapping, false, "Template requiresMapping harus false");

  const generic = parsers.find((p) => p.name === "generic");
  assert(generic, "Parser generic harus terdaftar");
  assert.deepStrictEqual(generic.formats, ["csv", "xlsx"], "Format generic harus csv, xlsx");
  assert.strictEqual(generic.requiresMapping, true, "Generic requiresMapping harus true");

  console.log("PASS 1: listParsers() mengembalikan metadata format & mapping yang valid");

  // 2. Uji getAllowedUploadFormats bawaan (Jalur A)
  const initialFormats = getAllowedUploadFormats();
  assert(initialFormats.includes("csv"), "Allowlist awal harus mencakup csv");
  assert(initialFormats.includes("xlsx"), "Allowlist awal harus mencakup xlsx");
  assert(!initialFormats.includes("pdf"), "Allowlist awal TIDAK boleh mencakup pdf di Jalur A");
  console.log("PASS 2: getAllowedUploadFormats() awal hanya memuat csv dan xlsx");

  // 3. Uji pendaftaran dan pencabutan parser dinamis (Switch Mechanism ke Jalur B)
  const mockPdfParser = {
    name: "mock-pdf-bank",
    label: "Mock PDF Bank Parser",
    description: "Parser simulasi untuk uji switch registry",
    formats: ["pdf"],
    requiresMapping: false,
    parse: async () => ({ rows: [] })
  };

  registerParser(mockPdfParser);
  const updatedFormats = getAllowedUploadFormats();
  assert(updatedFormats.includes("pdf"), "Allowlist harus otomatis mencakup pdf setelah registerParser");
  const registered = listParsers().find((p) => p.name === "mock-pdf-bank");
  assert(registered, "mock-pdf-bank harus muncul di listParsers");

  // Unregister mock
  unregisterParser("mock-pdf-bank");
  const revertedFormats = getAllowedUploadFormats();
  assert(!revertedFormats.includes("pdf"), "Allowlist tidak boleh mencakup pdf setelah unregisterParser");
  const unregistered = listParsers().find((p) => p.name === "mock-pdf-bank");
  assert(!unregistered, "mock-pdf-bank harus terhapus dari listParsers");

  console.log("PASS 3: registerParser & unregisterParser dinamis memutakhirkan allowlist secara instan");
}

async function runIntegrationTests() {
  console.log("\n--- Menjalankan Integration Tests HTTP Endpoints ---");

  // 1. GET /api/imports/parsers tanpa autentikasi (wajib 401)
  const unauthRes = await fetch(`${BASE_URL}/imports/parsers`);
  assert.strictEqual(unauthRes.status, 401, "GET /parsers tanpa token harus 401");
  console.log("PASS 4: GET /api/imports/parsers tanpa token ditolak 401");

  // 2. GET /api/imports/parsers dengan autentikasi (wajib 200)
  const parsersRes = await fetch(`${BASE_URL}/imports/parsers`, {
    headers: { Authorization: `Bearer ${authToken}` }
  });
  assert.strictEqual(parsersRes.status, 200, "GET /parsers harus mengembalikan status 200");
  const parsersBody = await parsersRes.json();
  assert.strictEqual(parsersBody.success, true, "Response harus success: true");
  assert(Array.isArray(parsersBody.data), "Response data harus berupa array");
  assert(parsersBody.data.length >= 3, "Harus ada minimal 3 parser");

  for (const p of parsersBody.data) {
    assert(p.name, "Setiap parser harus memiliki properti name");
    assert(p.label, "Setiap parser harus memiliki properti label");
    assert(Array.isArray(p.formats), "Setiap parser harus memiliki array formats");
    assert(typeof p.requiresMapping === "boolean", "requiresMapping harus boolean");
  }
  console.log("PASS 5: GET /api/imports/parsers mengembalikan daftar parser terstruktur dengan metadata");

  // 3. POST /api/imports/preview dengan file .pdf saat PDF belum didukung (wajib 400 dengan pesan panduan)
  const fakePdfBlob = new Blob(["%PDF-1.4 dummy content"], { type: "application/pdf" });
  const pdfFormData = new FormData();
  pdfFormData.append("account_id", String(testAccountId || 1));
  pdfFormData.append("file", fakePdfBlob, "rekening-koran.pdf");

  const pdfPreviewRes = await fetch(`${BASE_URL}/imports/preview`, {
    method: "POST",
    headers: { Authorization: `Bearer ${authToken}` },
    body: pdfFormData
  });

  assert.strictEqual(pdfPreviewRes.status, 400, "Upload .pdf harus ditolak 400");
  const pdfPreviewBody = await pdfPreviewRes.json();
  assert.strictEqual(pdfPreviewBody.success, false, "Upload .pdf harus success: false");
  assert(
    pdfPreviewBody.message.includes("Format berkas .pdf belum didukung langsung") &&
    pdfPreviewBody.message.includes("unduh template standar FinReport"),
    `Pesan penolakan PDF harus memuat panduan template standar. Diterima: ${pdfPreviewBody.message}`
  );
  console.log("PASS 6: Upload berkas .pdf ditolak 400 dengan pesan panduan unduh template standar");

  // 4. POST /api/imports/preview dengan ekstensi di luar allowlist (misal .json / .txt) (wajib 400)
  const fakeTxtBlob = new Blob(["tanggal,keterangan,nominal"], { type: "text/plain" });
  const txtFormData = new FormData();
  txtFormData.append("account_id", String(testAccountId || 1));
  txtFormData.append("file", fakeTxtBlob, "mutasi.txt");

  const txtPreviewRes = await fetch(`${BASE_URL}/imports/preview`, {
    method: "POST",
    headers: { Authorization: `Bearer ${authToken}` },
    body: txtFormData
  });

  assert.strictEqual(txtPreviewRes.status, 400, "Upload .txt harus ditolak 400");
  const txtPreviewBody = await txtPreviewRes.json();
  assert.strictEqual(txtPreviewBody.success, false);
  assert(
    txtPreviewBody.message.includes("Format berkas tidak didukung"),
    `Pesan penolakan harus memberitahukan format tidak didukung. Diterima: ${txtPreviewBody.message}`
  );
  console.log("PASS 7: Upload berkas ekstensi tidak didukung (.txt) ditolak 400");
}

async function verifyDbBaseline() {
  const users = await prisma.user.count();
  const tx = await prisma.transaction.count();
  const acc = await prisma.account.count();
  const rules = await prisma.categoryRule.count();
  const batches = await prisma.importBatch.count();
  const state = { users, tx, acc, rules, batches };
  console.log("Status DB setelah pengujian:", JSON.stringify(state));
  assert.strictEqual(batches, 0, "Jumlah import batches harus 0");
}

async function main() {
  try {
    await authenticate();
    await runUnitTests();
    await runIntegrationTests();
    await verifyDbBaseline();
    console.log("\n=== SEMUA PENGUJIAN REGISTRY PARSER & UPLOAD FORMATS (M8.4-3) BERHASIL ===");
    process.exit(0);
  } catch (err) {
    console.error("\nTEST GAGAL:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
