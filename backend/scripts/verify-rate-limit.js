/**
 * Skrip Pengujian Rate Limiting Upload Mutasi (verify-rate-limit.js)
 *
 * Menguji batas bawaan 10 upload per 10 menit (express-rate-limit):
 * - Mengunggah berkas CSV kecil sebanyak 12 kali berurutan
 * - 10 permintaan pertama harus berhasil (status bukan 429)
 * - Permintaan ke-11 dan ke-12 harus ditolak dengan HTTP 429 (Too Many Requests)
 *
 * PRASYARAT & CARA MENJALANKAN:
 * 1. Pastikan server backend berjalan pada mode batas bawaan (port 5000)
 *    TANPA mengatur variabel lingkungan IMPORT_RATE_LIMIT_MAX di server:
 *      cd backend && npm run dev
 * 2. Pastikan variabel lingkungan M8_TEST_PASSWORD terisi di shell penguji:
 *      $env:M8_TEST_PASSWORD="password_anda"  # PowerShell
 *      export M8_TEST_PASSWORD="password_anda" # Bash
 * 3. Jalankan skrip ini:
 *      node backend/scripts/verify-rate-limit.js
 */

import assert from "assert";
import prisma from "../src/config/prisma.js";

const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000/api";
const TEST_EMAIL = process.env.M8_TEST_EMAIL || "m8test2@example.com";
const TEST_PASSWORD = process.env.M8_TEST_PASSWORD;

if (!TEST_PASSWORD) {
  console.error("ERROR: M8_TEST_PASSWORD wajib diset di environment!");
  process.exit(1);
}

let authToken = "";
let userAccountId = null;
const createdBatchIds = [];

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

async function runRateLimitVerification() {
  console.log("==================================================================");
  console.log("PENGUJIAN RATE LIMIT UPLOAD MUTASI (10 REQ / 10 MENIT)");
  console.log("==================================================================");

  // 1. Login user uji
  console.log("\n[Setup] Login user uji...");
  const loginRes = await api("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
  });
  assert.strictEqual(loginRes.status, 200, `Login gagal: status ${loginRes.status}`);
  authToken = loginRes.data.data.token;

  // 2. Ambil rekening aktif
  const accRes = await api("/accounts");
  assert.strictEqual(accRes.status, 200);
  const accounts = accRes.data.data;
  assert.ok(accounts.length > 0, "User harus memiliki setidaknya 1 rekening");
  userAccountId = accounts[0].id;

  const tinyCsv = "Tanggal,Keterangan,Nominal,Jenis\n2026-08-01,Uji Rate Limit,10000,KELUAR\n";

  console.log("\n[Uji] Mengirim 12 permintaan upload berurutan...");
  const statuses = [];

  for (let i = 1; i <= 12; i++) {
    const formData = new FormData();
    formData.append("account_id", String(userAccountId));
    formData.append("file", new Blob([tinyCsv]), `rate-limit-${i}.csv`);
    formData.append("parser", "generic");
    formData.append("mapping", JSON.stringify({ date: "Tanggal", description: "Keterangan", amount: "Nominal", type: "Jenis" }));

    const res = await api("/imports/preview", {
      method: "POST",
      body: formData
    });

    statuses.push(res.status);
    console.log(`  Upload #${i}: HTTP ${res.status}`);

    if (res.status === 200 && res.data && res.data.data && res.data.data.batch_id) {
      createdBatchIds.push(res.data.data.batch_id);
    }
  }

  // Verifikasi 10 permintaan pertama bukan 429
  for (let i = 0; i < 10; i++) {
    assert.notStrictEqual(
      statuses[i],
      429,
      `Permintaan ke-${i + 1} tidak boleh terkena rate limit 429 (didapat: ${statuses[i]})`
    );
  }
  console.log("\nPASSED - 10 permintaan pertama lolos rate limit.");

  // Verifikasi permintaan ke-11 dan ke-12 menghasilkan HTTP 429
  assert.strictEqual(statuses[10], 429, `Permintaan ke-11 harus HTTP 429, didapat: ${statuses[10]}`);
  assert.strictEqual(statuses[11], 429, `Permintaan ke-12 harus HTTP 429, didapat: ${statuses[11]}`);
  console.log("PASSED - Permintaan ke-11 dan ke-12 berhasil ditolak dengan HTTP 429 (Too Many Requests).");

  console.log("\n==================================================================");
  console.log("VERIFIKASI RATE LIMIT UPLOAD BERHASIL LULUS 100%!");
  console.log("==================================================================");
}

async function cleanup() {
  console.log("Membersihkan batch uji rate limit...");
  for (const bId of createdBatchIds) {
    try {
      await api(`/imports/${bId}`, { method: "DELETE" });
    } catch {
      // Abaikan jika sudah terhapus
    }
  }
}

async function main() {
  try {
    await runRateLimitVerification();
  } catch (err) {
    console.error("\nGAGAL PENGUJIAN RATE LIMIT:", err);
    process.exit(1);
  } finally {
    await cleanup();
    await prisma.$disconnect();
  }
}

main();
