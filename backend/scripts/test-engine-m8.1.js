/**
 * Test Engine Import (Batch M8.1-4)
 *
 * Menguji categorizer, import.service (preview, commit, rollback), dan categoryRule.service
 * terhadap user uji m8test@example.com.
 */

import assert from "assert";
import fs from "fs";
import prisma from "../src/config/prisma.js";
import { suggestCategoryId, loadCategoriesForUser, loadUserCategoryRules } from "../src/services/import/categorizer.js";
import * as importService from "../src/services/import/import.service.js";
import * as categoryRuleService from "../src/services/categoryRule.service.js";

async function runTest() {
  console.log("Menjalankan uji Engine Import (Batch M8.1-4)...");

  // 1. Dapatkan user uji m8test
  const testUser = await prisma.user.findUnique({
    where: { email: "m8test@example.com" },
    include: { accounts: true }
  });
  assert.ok(testUser, "User m8test@example.com harus sudah ada dari tahap baseline");
  assert.ok(testUser.accounts.length > 0, "User harus memiliki rekening");
  const testAccount = testUser.accounts[0];

  // 2. Uji Categorizer
  const categories = await loadCategoriesForUser(testUser.id);
  const userRules = await loadUserCategoryRules(testUser.id);

  // Uji built-in keyword
  const catGrab = suggestCategoryId({
    description: "Pembayaran GrabFood Delivery",
    type: "EXPENSE",
    userRules,
    categories
  });
  const catTransport = categories.find((c) => c.name === "Transportasi");
  assert.strictEqual(catGrab, catTransport.id, "Grab harus disarankan ke Transportasi");

  const catGaji = suggestCategoryId({
    description: "PAYROLL GAJI AGUSTUS 2026",
    type: "INCOME",
    userRules,
    categories
  });
  const catSalary = categories.find((c) => c.name === "Gaji");
  assert.strictEqual(catGaji, catSalary.id, "Payroll harus disarankan ke Gaji");

  // Uji fallback
  const catFallback = suggestCategoryId({
    description: "PENGELUARAN RANDOM 12345",
    type: "EXPENSE",
    userRules,
    categories
  });
  const catLainnya = categories.find((c) => c.name === "Pengeluaran Lainnya");
  assert.strictEqual(catFallback, catLainnya.id, "Deskripsi tidak dikenal harus fallback ke Pengeluaran Lainnya");
  console.log("OK - Categorizer built-in & fallback");

  // 3. Uji CategoryRule CRUD
  const customRule = await categoryRuleService.createCategoryRule(testUser.id, {
    keyword: "WARTEG BAHARI",
    categoryId: catTransport.id // testing mapping to transport
  });
  assert.ok(customRule.id);

  const updatedRules = await loadUserCategoryRules(testUser.id);
  const catCustom = suggestCategoryId({
    description: "Makan di Warteg Bahari 88",
    type: "EXPENSE",
    userRules: updatedRules,
    categories
  });
  assert.strictEqual(catCustom, catTransport.id, "Custom user rule harus diutamakan");

  // Bersihkan custom rule
  await categoryRuleService.deleteCategoryRule(testUser.id, customRule.id);
  console.log("OK - CategoryRule CRUD & override priority");

  // 4. Uji Preview -> Commit -> Rollback pada sample Mandiri
  const samplePath =
    process.env.MANDIRI_SAMPLE_PATH ||
    "C:\\Users\\DW\\Downloads\\e-Statement_XXXXXXXXX8990_01 Agu 2026-31 Agu 2026.xlsx";
  const password = process.env.MANDIRI_SAMPLE_PASSWORD;

  if (fs.existsSync(samplePath) && password) {
    const fileBuf = fs.readFileSync(samplePath);
    const mockFile = {
      buffer: fileBuf,
      originalname: "e-Statement_XXXXXXXXX8990_01 Agu 2026-31 Agu 2026.xlsx",
      size: fileBuf.length,
      mimetype: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    };

    // Preview pertama
    const preview1 = await importService.preview({
      userId: testUser.id,
      accountId: testAccount.id,
      file: mockFile,
      filePassword: password
    });
    assert.strictEqual(preview1.summary.total, 10);
    assert.strictEqual(preview1.summary.duplicate, 0);
    assert.strictEqual(preview1.summary.new, 10);
    assert.ok(preview1.batch_id);
    console.log("OK - Preview pertama: 10 transaksi baru, 0 duplikat");

    // Commit batch
    const commitRes = await importService.commit({
      userId: testUser.id,
      batchId: preview1.batch_id
    });
    assert.strictEqual(commitRes.status, "COMMITTED");
    assert.strictEqual(commitRes.imported_rows, 10);
    assert.strictEqual(commitRes.duplicate_rows, 0);

    // Verifikasi transaksi tercatat di database
    const txCount = await prisma.transaction.count({
      where: { importBatchId: preview1.batch_id, userId: testUser.id }
    });
    assert.strictEqual(txCount, 10);
    console.log("OK - Commit batch atomic: 10 transaksi berhasil masuk ke database");

    // Preview kedua dengan file yang sama -> harus 10 duplikat!
    const preview2 = await importService.preview({
      userId: testUser.id,
      accountId: testAccount.id,
      file: mockFile,
      filePassword: password
    });
    assert.strictEqual(preview2.summary.total, 10);
    assert.strictEqual(preview2.summary.duplicate, 10, "Semua baris harus terdeteksi sebagai duplikat");
    assert.strictEqual(preview2.summary.new, 0);
    console.log("OK - Preview kedua: semua 10 baris terdeteksi sebagai duplikat via fingerprint");

    // Rollback batch pertama
    const rollbackRes = await importService.rollback({
      userId: testUser.id,
      batchId: preview1.batch_id
    });
    assert.strictEqual(rollbackRes.status, "CANCELLED");
    assert.strictEqual(rollbackRes.deleted_transactions, 10);

    // Verifikasi transaksi benar-benar terhapus
    const txAfterRollback = await prisma.transaction.count({
      where: { importBatchId: preview1.batch_id, userId: testUser.id }
    });
    assert.strictEqual(txAfterRollback, 0);
    console.log("OK - Rollback atomic: semua transaksi batch berhasil dihapus");

    // Bersihkan batch kedua (status PREVIEW)
    await prisma.importBatch.delete({ where: { id: preview2.batch_id } });
    await prisma.importBatch.delete({ where: { id: preview1.batch_id } });
  }

  console.log("Semua pengujian Engine Batch M8.1-4 BERHASIL!");
}

runTest()
  .catch((err) => {
    console.error("Gagal menjalankan uji Engine Batch M8.1-4:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
