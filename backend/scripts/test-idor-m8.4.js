/**
 * Skrip Uji Matriks Akses Antar-Pengguna / IDOR (M8.4-1e)
 *
 * Menguji isolasi data multi-tenant (IDOR prevention):
 * 1. User A mengunggah preview dengan account_id milik User B -> 400 / 404
 * 2. User A melakukan commit pada batch_id milik User B -> 404
 * 3. User A melakukan rollback / cancel pada batch_id milik User B -> 404
 * 4. User A melihat detail batch_id milik User B -> 404
 * 5. User A meminta daftar import dengan filter accountId milik User B -> daftar kosong (0 data)
 * 6. User A meminta daftar category rules -> tidak memuat rule milik User B
 * 7. User A mengubah (PUT) category rule milik User B -> 404
 * 8. User A menghapus (DELETE) category rule milik User B -> 404
 *
 * Pengujian dijalankan dua arah (User A -> B dan User B -> A).
 * Seluruh data uji dibersihkan sepenuhnya di akhir eksekusi.
 */

import assert from "assert";
import bcrypt from "bcryptjs";
import prisma from "../src/config/prisma.js";

const BASE_URL = process.env.API_BASE_URL || "http://localhost:5056/api";
const PASSWORD_SECRET = process.env.M8_TEST_PASSWORD || "TestPassword123!";

const USER_A_EMAIL = "m8_idor_a@example.com";
const USER_B_EMAIL = "m8_idor_b@example.com";

let userA = null;
let userB = null;
let tokenA = "";
let tokenB = "";

async function loginUser(email, password) {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  assert.strictEqual(res.status, 200, `Login ${email} gagal`);
  const data = await res.json();
  return data.data.token;
}

async function setupUsers() {
  console.log("[Setup] Membersihkan sisa data IDOR lama bila ada...");
  await cleanupUsers();

  console.log("[Setup] Membuat 2 pengguna uji sintetis untuk matriks IDOR...");
  const hashedPassword = await bcrypt.hash(PASSWORD_SECRET, 10);

  // User A
  userA = await prisma.user.create({
    data: {
      name: "User IDOR A",
      email: USER_A_EMAIL,
      passwordHash: hashedPassword,
      accounts: {
        create: {
          name: "Rekening IDOR A",
          type: "BANK",
          openingBalance: 1000000
        }
      },
      categories: {
        create: {
          name: "Kategori IDOR A",
          type: "EXPENSE"
        }
      }
    },
    include: { accounts: true, categories: true }
  });

  const ruleA = await prisma.categoryRule.create({
    data: {
      userId: userA.id,
      categoryId: userA.categories[0].id,
      keyword: "KATA_KUNCI_USER_A"
    }
  });
  userA.categoryRules = [ruleA];

  // User B
  userB = await prisma.user.create({
    data: {
      name: "User IDOR B",
      email: USER_B_EMAIL,
      passwordHash: hashedPassword,
      accounts: {
        create: {
          name: "Rekening IDOR B",
          type: "BANK",
          openingBalance: 2000000
        }
      },
      categories: {
        create: {
          name: "Kategori IDOR B",
          type: "EXPENSE"
        }
      }
    },
    include: { accounts: true, categories: true }
  });

  const ruleB = await prisma.categoryRule.create({
    data: {
      userId: userB.id,
      categoryId: userB.categories[0].id,
      keyword: "KATA_KUNCI_USER_B"
    }
  });
  userB.categoryRules = [ruleB];

  // Batch untuk User A
  userA.batch = await prisma.importBatch.create({
    data: {
      userId: userA.id,
      accountId: userA.accounts[0].id,
      fileName: "mutasi_a.csv",
      parser: "generic",
      status: "PREVIEW",
      totalRows: 1,
      importedRows: 0,
      duplicateRows: 0,
      parsedPayload: [
        { date: "2026-08-01", description: "Batch A Tx", amount: 10000, type: "EXPENSE", valid: true }
      ]
    }
  });

  // Batch untuk User B
  userB.batch = await prisma.importBatch.create({
    data: {
      userId: userB.id,
      accountId: userB.accounts[0].id,
      fileName: "mutasi_b.csv",
      parser: "generic",
      status: "PREVIEW",
      totalRows: 1,
      importedRows: 0,
      duplicateRows: 0,
      parsedPayload: [
        { date: "2026-08-01", description: "Batch B Tx", amount: 20000, type: "EXPENSE", valid: true }
      ]
    }
  });

  tokenA = await loginUser(USER_A_EMAIL, PASSWORD_SECRET);
  tokenB = await loginUser(USER_B_EMAIL, PASSWORD_SECRET);
  console.log(`[Setup] User A (ID: ${userA.id}), User B (ID: ${userB.id}) siap dengan token otentikasi.`);
}

async function cleanupUsers() {
  const users = await prisma.user.findMany({
    where: { email: { in: [USER_A_EMAIL, USER_B_EMAIL] } }
  });
  for (const u of users) {
    await prisma.$transaction([
      prisma.transaction.deleteMany({ where: { userId: u.id } }),
      prisma.importBatch.deleteMany({ where: { userId: u.id } }),
      prisma.categoryRule.deleteMany({ where: { userId: u.id } }),
      prisma.category.deleteMany({ where: { userId: u.id } }),
      prisma.account.deleteMany({ where: { userId: u.id } }),
      prisma.user.delete({ where: { id: u.id } })
    ]);
  }
}

async function runIdorMatrix() {
  console.log("==================================================================");
  console.log("MENJALANKAN UJI MATRIKS ISOLASI AKSES ANTAR-USER / IDOR (M8.4-1e)");
  console.log(`Target: ${BASE_URL}`);
  console.log("==================================================================");

  await setupUsers();

  const dummyCsv = "Tanggal,Keterangan,Nominal,Jenis\n2026-08-01,Test IDOR,10000,KELUAR\n";

  try {
    // ----------------------------------------------------------------
    // SKENARIO 1: POST /api/imports/preview dengan account_id user lain
    // ----------------------------------------------------------------
    console.log("\n[IDOR 1] User A upload preview dengan account_id milik User B...");
    const formA = new FormData();
    formA.append("file", new Blob([dummyCsv]), "idor_preview.csv");
    formA.append("account_id", String(userB.accounts[0].id));
    formA.append("parser", "generic");
    formA.append("mapping", JSON.stringify({ date: "Tanggal", description: "Keterangan", amount: "Nominal", type: "Jenis" }));

    const prevResA = await fetch(`${BASE_URL}/imports/preview`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenA}` },
      body: formA
    });
    assert.ok(
      [400, 404].includes(prevResA.status),
      `Upload preview dengan account_id user lain harus ditolak 400/404, didapat: ${prevResA.status}`
    );
    const prevJsonA = await prevResA.json();
    assert.strictEqual(prevJsonA.success, false);
    assert.ok(
      prevJsonA.message.toLowerCase().includes("rekening") ||
      prevJsonA.message.toLowerCase().includes("tidak ditemukan"),
      `Pesan galat harus menyebut rekening tidak ditemukan: ${prevJsonA.message}`
    );
    console.log(`PASSED - Upload preview lintas akun ditolak HTTP ${prevResA.status}: "${prevJsonA.message}".`);

    // ----------------------------------------------------------------
    // SKENARIO 2: POST /api/imports/:id/commit pada batch milik user lain
    // ----------------------------------------------------------------
    console.log("\n[IDOR 2] User A commit batch_id milik User B...");
    const commitResA = await fetch(`${BASE_URL}/imports/${userB.batch.id}/commit`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ rows: [] })
    });
    assert.strictEqual(commitResA.status, 404, "Commit batch user lain harus menghasilkan 404");
    const commitJsonA = await commitResA.json();
    assert.strictEqual(commitJsonA.success, false);
    console.log(`PASSED - Commit batch lintas user menghasilkan HTTP 404: "${commitJsonA.message}".`);

    // ----------------------------------------------------------------
    // SKENARIO 3: DELETE /api/imports/:id pada batch milik user lain
    // ----------------------------------------------------------------
    console.log("\n[IDOR 3] User A batalkan/rollback batch_id milik User B...");
    const rollbackResA = await fetch(`${BASE_URL}/imports/${userB.batch.id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(rollbackResA.status, 404, "Rollback batch user lain harus menghasilkan 404");
    const rollbackJsonA = await rollbackResA.json();
    assert.strictEqual(rollbackJsonA.success, false);
    console.log(`PASSED - Rollback batch lintas user menghasilkan HTTP 404: "${rollbackJsonA.message}".`);

    // ----------------------------------------------------------------
    // SKENARIO 4: GET /api/imports/:id pada batch milik user lain
    // ----------------------------------------------------------------
    console.log("\n[IDOR 4] User A minta detail batch_id milik User B...");
    const getResA = await fetch(`${BASE_URL}/imports/${userB.batch.id}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(getResA.status, 404, "Get detail batch user lain harus menghasilkan 404");
    const getJsonA = await getResA.json();
    assert.strictEqual(getJsonA.success, false);
    console.log(`PASSED - Get detail batch lintas user menghasilkan HTTP 404: "${getJsonA.message}".`);

    // ----------------------------------------------------------------
    // SKENARIO 5: GET /api/imports?accountId=<milik user B>
    // ----------------------------------------------------------------
    console.log("\n[IDOR 5] User A minta daftar import dengan filter accountId milik User B...");
    const listResA = await fetch(`${BASE_URL}/imports?accountId=${userB.accounts[0].id}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    // Filter rekening user lain harus menghasilkan daftar kosong atau 400/404, tidak boleh membocorkan data User B
    const listJsonA = await listResA.json();
    if (listResA.status === 200) {
      assert.strictEqual(listJsonA.data.length, 0, "Daftar import tidak boleh memuat batch user lain");
    } else {
      assert.ok([400, 403, 404].includes(listResA.status));
    }
    console.log("PASSED - List import dengan accountId user lain tidak membocorkan data.");

    // ----------------------------------------------------------------
    // SKENARIO 6: GET /api/category-rules tidak membocorkan rule user lain
    // ----------------------------------------------------------------
    console.log("\n[IDOR 6] User A meminta daftar category rules...");
    const rulesResA = await fetch(`${BASE_URL}/category-rules`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(rulesResA.status, 200);
    const rulesJsonA = await rulesResA.json();
    const keywordsA = rulesJsonA.data.map((r) => r.keyword);
    assert.ok(keywordsA.includes("KATA_KUNCI_USER_A"), "Harus memuat rule milik User A");
    assert.strictEqual(
      keywordsA.includes("KATA_KUNCI_USER_B"),
      false,
      "Daftar aturan User A TIDAK BOLEH memuat rule milik User B"
    );
    console.log("PASSED - GET /api/category-rules terisolasi sempurna antar-user.");

    // ----------------------------------------------------------------
    // SKENARIO 7: PUT /api/category-rules/:id milik user lain
    // ----------------------------------------------------------------
    console.log("\n[IDOR 7] User A mengubah rule milik User B...");
    const updateRuleResA = await fetch(`${BASE_URL}/category-rules/${userB.categoryRules[0].id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ keyword: "HACKED_KEYWORD" })
    });
    assert.strictEqual(updateRuleResA.status, 404, "Ubah rule user lain harus 404");
    const updateRuleJsonA = await updateRuleResA.json();
    assert.strictEqual(updateRuleJsonA.success, false);
    console.log(`PASSED - PUT /api/category-rules/:id lintas user ditolak 404: "${updateRuleJsonA.message}".`);

    // ----------------------------------------------------------------
    // SKENARIO 8: DELETE /api/category-rules/:id milik user lain
    // ----------------------------------------------------------------
    console.log("\n[IDOR 8] User A menghapus rule milik User B...");
    const delRuleResA = await fetch(`${BASE_URL}/category-rules/${userB.categoryRules[0].id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    assert.strictEqual(delRuleResA.status, 404, "Hapus rule user lain harus 404");
    const delRuleJsonA = await delRuleResA.json();
    assert.strictEqual(delRuleJsonA.success, false);
    console.log(`PASSED - DELETE /api/category-rules/:id lintas user ditolak 404: "${delRuleJsonA.message}".`);

    // ----------------------------------------------------------------
    // SIMETRI: User B mencoba akses sumber daya User A
    // ----------------------------------------------------------------
    console.log("\n[IDOR Simetri] Pengujian simetris User B -> User A...");
    // B commit batch A -> 404
    const commitResB = await fetch(`${BASE_URL}/imports/${userA.batch.id}/commit`, {
      method: "POST",
      headers: { Authorization: `Bearer ${tokenB}`, "Content-Type": "application/json" },
      body: JSON.stringify({ rows: [] })
    });
    assert.strictEqual(commitResB.status, 404);

    // B get batch A -> 404
    const getResB = await fetch(`${BASE_URL}/imports/${userA.batch.id}`, {
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert.strictEqual(getResB.status, 404);

    // B delete rule A -> 404
    const delRuleResB = await fetch(`${BASE_URL}/category-rules/${userA.categoryRules[0].id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${tokenB}` }
    });
    assert.strictEqual(delRuleResB.status, 404);
    console.log("PASSED - Pengujian simetris User B -> User A seluruhnya ditolak HTTP 404.");

    console.log("\nSELURUH VERIFIKASI MATRIKS IDOR M8.4-1e BERHASIL!");
  } finally {
    console.log("\n[Cleanup] Membersihkan data 2 user sintetis...");
    await cleanupUsers();
    console.log("[Cleanup] Seluruh data user IDOR berhasil dibersihkan.");
  }
}

runIdorMatrix().catch((err) => {
  console.error("GAGAL:", err);
  process.exit(1);
});
