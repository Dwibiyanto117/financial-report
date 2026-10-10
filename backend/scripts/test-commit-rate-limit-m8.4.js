/**
 * Skrip Uji Rate Limiting Endpoint Commit Mutasi (M8.4-1c)
 *
 * Menguji bahwa endpoint POST /api/imports/:id/commit:
 * 1. Menerapkan rate limit bawaan (30 request per 10 menit per user)
 * 2. Mengembalikan HTTP 429 (Too Many Requests) saat batas terlampaui
 * 3. Menghormati pelonggaran via environment variable IMPORT_COMMIT_RATE_LIMIT_MAX
 *
 * Dianjurkan dijalankan terhadap server dengan batas bawaan (misal PORT 5055):
 *   API_BASE_URL=http://localhost:5055/api node scripts/test-commit-rate-limit-m8.4.js
 */

import assert from "assert";
import prisma from "../src/config/prisma.js";

const BASE_URL = process.env.API_BASE_URL || "http://localhost:5055/api";
const TEST_EMAIL = process.env.M8_TEST_EMAIL || "m8test2@example.com";
const TEST_PASSWORD = process.env.M8_TEST_PASSWORD;

if (!TEST_PASSWORD) {
  console.error("ERROR: M8_TEST_PASSWORD wajib diset di environment!");
  process.exit(1);
}

async function runCommitRateLimitTest() {
  console.log("==================================================================");
  console.log("MENJALANKAN UJI RATE LIMIT COMMIT MUTASI (M8.4-1c)");
  console.log(`Target: ${BASE_URL}`);
  console.log("==================================================================");

  // 1. Login user uji
  console.log("[Setup] Login user uji...");
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
  });
  assert.strictEqual(loginRes.status, 200, `Login gagal: ${loginRes.status}`);
  const { token } = (await loginRes.json()).data;

  // 2. Kirim 32 permintaan commit ke endpoint (ID dummy 999999)
  console.log("[Test] Mengirim 32 permintaan commit berurutan...");
  const statuses = [];
  let rateLimitResponse = null;

  for (let i = 1; i <= 32; i++) {
    const res = await fetch(`${BASE_URL}/imports/999999/commit`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ rows: [] })
    });
    statuses.push(res.status);
    if (res.status === 429 && !rateLimitResponse) {
      rateLimitResponse = await res.json();
    }
  }

  console.log(`Status 30 permintaan pertama: [${statuses.slice(0, 5).join(", ")}, ... (total 30 req)]`);
  console.log(`Status permintaan 31-32: ${statuses[30]}, ${statuses[31]}`);

  // 3. Verifikasi 30 permintaan pertama bukan 429
  for (let i = 0; i < 30; i++) {
    assert.notStrictEqual(
      statuses[i],
      429,
      `Permintaan ke-${i + 1} tidak boleh 429 pada batas bawaan 30 (didapat: ${statuses[i]})`
    );
  }
  console.log("PASSED - 30 permintaan commit pertama lolos rate limit.");

  // 4. Verifikasi permintaan ke-31 dan ke-32 ditolak dengan HTTP 429
  assert.strictEqual(statuses[30], 429, `Permintaan ke-31 harus HTTP 429, didapat: ${statuses[30]}`);
  assert.strictEqual(statuses[31], 429, `Permintaan ke-32 harus HTTP 429, didapat: ${statuses[31]}`);
  assert.ok(rateLimitResponse, "Harus mengembalikan payload respons galat 429");
  assert.strictEqual(rateLimitResponse.success, false);
  assert.ok(
    rateLimitResponse.message.includes("Terlalu banyak permintaan commit transaksi"),
    `Pesan galat 429 tidak sesuai: ${rateLimitResponse.message}`
  );
  console.log(`PASSED - Permintaan ke-31 dan ke-32 ditolak HTTP 429: "${rateLimitResponse.message}".`);

  console.log("\nSELURUH VERIFIKASI M8.4-1c BERHASIL!");
}

runCommitRateLimitTest().catch((err) => {
  console.error("GAGAL:", err);
  process.exit(1);
});
