/**
 * Skrip Verifikasi Sintetis Batch M8.3-1 (verify-m8.3-backend.js)
 *
 * Menguji seluruh fitur dukungan backend M8.3-1:
 * 1. GET /api/imports/template/banks mengembalikan allowlist bank sesuai BANK_TEMPLATES
 * 2. Galat file terenkripsi membawa error.errors = [{ field: "file_password", message: ... }]
 *    - Tanpa password -> HTTP 400 dengan field file_password
 *    - Password salah -> HTTP 400 dengan field file_password
 * 3. DELETE /api/imports/:id:
 *    - Batch PREVIEW -> status berubah CANCELLED, deleted_transactions: 0
 *    - Batch CANCELLED dibatalkan ulang -> HTTP 400
 * 4. Pembersihan malas batch PREVIEW > 24 jam saat POST /api/imports/preview
 */

import assert from "assert";
import ExcelJS from "exceljs";
import officecrypto from "officecrypto-tool";
import prisma from "../src/config/prisma.js";
import { BANK_TEMPLATES } from "../src/services/import/templates/bankTemplates.js";

const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000/api";
const TEST_EMAIL = process.env.M8_TEST_EMAIL || "m8test2@example.com";
const TEST_PASSWORD = process.env.M8_TEST_PASSWORD;

if (!TEST_PASSWORD) {
  console.error("ERROR: M8_TEST_PASSWORD wajib diset di environment!");
  process.exit(1);
}

let authToken = "";
let userAccountId = null;
let testUserId = null;

async function api(pathUrl, options = {}) {
  const headers = { ...options.headers };
  if (authToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const url = `${BASE_URL}${pathUrl}`;
  const res = await fetch(url, { ...options, headers });
  const contentType = res.headers.get("content-type") || "";
  let json = null;
  if (contentType.includes("application/json")) {
    json = await res.json();
  }
  return { status: res.status, ok: res.ok, data: json, headers: res.headers };
}

async function runM831Verification() {
  console.log("==================================================================");
  console.log("MENJALANKAN VERIFIKASI SINTETIS DUKUNGAN BACKEND M8.3-1");
  console.log("==================================================================");

  // 0. Login & Ambil Rekening
  console.log("\n[Setup] Login user uji...");
  const loginRes = await api("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
  });
  assert.strictEqual(loginRes.status, 200, `Login gagal: status ${loginRes.status}`);
  authToken = loginRes.data.data.token;
  testUserId = loginRes.data.data.user.id;

  const accRes = await api("/accounts");
  assert.strictEqual(accRes.status, 200);
  assert.ok(accRes.data.data.length > 0);
  userAccountId = accRes.data.data[0].id;

  // ==================================================================
  // Uji 1: GET /api/imports/template/banks
  // ==================================================================
  console.log("\n[Uji 1] Menguji endpoint GET /api/imports/template/banks...");
  const banksRes = await api("/imports/template/banks");
  assert.strictEqual(banksRes.status, 200);
  assert.strictEqual(banksRes.data.success, true);
  assert.ok(Array.isArray(banksRes.data.data), "Data harus berupa array");
  assert.strictEqual(banksRes.data.data.length, BANK_TEMPLATES.length);
  for (let i = 0; i < BANK_TEMPLATES.length; i++) {
    assert.strictEqual(banksRes.data.data[i].code, BANK_TEMPLATES[i].code);
    assert.strictEqual(banksRes.data.data[i].label, BANK_TEMPLATES[i].label);
  }
  console.log("PASSED - GET /api/imports/template/banks mengembalikan seluruh allowlist bank dengan tepat.");

  // ==================================================================
  // Uji 2: Galat berkas terenkripsi membawa errors: [{ field: "file_password" }]
  // ==================================================================
  console.log("\n[Uji 2] Menguji error format field file_password pada berkas terenkripsi...");
  // Buat berkas XLSX terenkripsi di memori
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet1");
  ws.addRow(["Tanggal", "Keterangan", "Nominal", "Jenis"]);
  ws.addRow(["2026-08-01", "Uji Enkripsi", 10000, "KELUAR"]);
  const plainBuf = await wb.xlsx.writeBuffer();
  const encryptedBuf = await officecrypto.encrypt(Buffer.from(plainBuf), {
    password: "SecretPassword123"
  });

  // 2a. Kirim tanpa password
  const formNoPass = new FormData();
  formNoPass.append("account_id", String(userAccountId));
  formNoPass.append("file", new Blob([encryptedBuf]), "encrypted.xlsx");
  const resNoPass = await api("/imports/preview", { method: "POST", body: formNoPass });
  assert.strictEqual(resNoPass.status, 400);
  assert.strictEqual(resNoPass.data.success, false);
  assert.ok(Array.isArray(resNoPass.data.errors), "errors harus berupa array");
  assert.ok(
    resNoPass.data.errors.some((e) => e.field === "file_password"),
    "Harus memuat field file_password pada errors"
  );
  console.log("PASSED - Berkas terenkripsi tanpa password ditolak 400 dengan field file_password.");

  // 2b. Kirim dengan password salah
  const formWrongPass = new FormData();
  formWrongPass.append("account_id", String(userAccountId));
  formWrongPass.append("file", new Blob([encryptedBuf]), "encrypted.xlsx");
  formWrongPass.append("file_password", "PasswordYangSalah999");
  const resWrongPass = await api("/imports/preview", { method: "POST", body: formWrongPass });
  assert.strictEqual(resWrongPass.status, 400);
  assert.strictEqual(resWrongPass.data.success, false);
  assert.ok(Array.isArray(resWrongPass.data.errors), "errors harus berupa array");
  assert.ok(
    resWrongPass.data.errors.some((e) => e.field === "file_password"),
    "Harus memuat field file_password pada errors"
  );
  console.log("PASSED - Berkas terenkripsi dengan password salah ditolak 400 dengan field file_password.");

  // ==================================================================
  // Uji 3: Batalkan batch PREVIEW via DELETE /api/imports/:id
  // ==================================================================
  console.log("\n[Uji 3] Menguji pembatalan batch PREVIEW via DELETE /api/imports/:id...");
  const tinyCsv = "Tanggal,Keterangan,Nominal,Jenis\n2026-08-01,Uji Cancel Preview,15000,KELUAR\n";
  const formPreview = new FormData();
  formPreview.append("account_id", String(userAccountId));
  formPreview.append("file", new Blob([tinyCsv]), "preview-cancel.csv");
  formPreview.append("parser", "generic");
  formPreview.append("mapping", JSON.stringify({ date: "Tanggal", description: "Keterangan", amount: "Nominal", type: "Jenis" }));

  const prevRes = await api("/imports/preview", { method: "POST", body: formPreview });
  assert.strictEqual(prevRes.status, 200);
  const previewBatchId = prevRes.data.data.batch_id;
  assert.ok(previewBatchId, "Batch ID harus ada");

  // Batalkan batch berstatus PREVIEW
  const cancelRes = await api(`/imports/${previewBatchId}`, { method: "DELETE" });
  assert.strictEqual(cancelRes.status, 200);
  assert.strictEqual(cancelRes.data.success, true);
  assert.strictEqual(cancelRes.data.data.status, "CANCELLED");
  assert.strictEqual(cancelRes.data.data.deleted_transactions, 0);

  // Cek langsung di database
  const batchInDb = await prisma.importBatch.findUnique({ where: { id: previewBatchId } });
  assert.strictEqual(batchInDb.status, "CANCELLED");
  assert.strictEqual(batchInDb.parsedPayload, null, "parsedPayload harus dikosongkan");
  console.log("PASSED - Batch PREVIEW berhasil dibatalkan menjadi CANCELLED tanpa transaksi terhapus.");

  // Coba batalkan ulang -> 400
  const cancelAgainRes = await api(`/imports/${previewBatchId}`, { method: "DELETE" });
  assert.strictEqual(cancelAgainRes.status, 400);
  console.log("PASSED - Batch yang sudah CANCELLED ditolak pembatalan ulang dengan HTTP 400.");

  // ==================================================================
  // Uji 4: Pembersihan malas batch PREVIEW > 24 jam saat preview
  // ==================================================================
  console.log("\n[Uji 4] Menguji pembersihan malas batch PREVIEW usang (> 24 jam)...");
  // Buat batch dummy PREVIEW buatan 26 jam yang lalu
  const oldDate = new Date(Date.now() - 26 * 60 * 60 * 1000);
  const oldBatch = await prisma.importBatch.create({
    data: {
      userId: testUserId,
      accountId: userAccountId,
      parser: "generic",
      fileName: "old-abandoned-batch.csv",
      status: "PREVIEW",
      totalRows: 5,
      parsedPayload: { dummy: "data" },
      createdAt: oldDate,
      updatedAt: oldDate
    }
  });

  // Lakukan request preview baru
  const formTrigger = new FormData();
  formTrigger.append("account_id", String(userAccountId));
  formTrigger.append("file", new Blob([tinyCsv]), "trigger-lazy-clean.csv");
  formTrigger.append("parser", "generic");
  formTrigger.append("mapping", JSON.stringify({ date: "Tanggal", description: "Keterangan", amount: "Nominal", type: "Jenis" }));

  const trigRes = await api("/imports/preview", { method: "POST", body: formTrigger });
  assert.strictEqual(trigRes.status, 200);
  const newBatchId = trigRes.data.data.batch_id;

  // Cek apakah batch lama telah diubah statusnya menjadi CANCELLED secara malas
  const oldBatchAfter = await prisma.importBatch.findUnique({ where: { id: oldBatch.id } });
  assert.strictEqual(oldBatchAfter.status, "CANCELLED", "Batch usang > 24 jam harus otomatis dibatalkan");
  assert.strictEqual(oldBatchAfter.parsedPayload, null, "Payload batch usang harus dikosongkan");
  console.log("PASSED - Batch PREVIEW usang (> 24 jam) otomatis dibersihkan saat request preview baru.");

  // Bersihkan batch trigger baru
  await api(`/imports/${newBatchId}`, { method: "DELETE" });
  await prisma.importBatch.delete({ where: { id: oldBatch.id } });

  console.log("\n==================================================================");
  console.log("SELURUH VERIFIKASI DUKUNGAN BACKEND M8.3-1 BERHASIL 100%!");
  console.log("==================================================================");
}

runM831Verification()
  .catch((err) => {
    console.error("\nGAGAL VERIFIKASI M8.3-1:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
