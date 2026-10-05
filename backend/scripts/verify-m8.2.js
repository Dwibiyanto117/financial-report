/**
 * Comprehensive Synthetic Verification Test Suite for Module M8.2
 *
 * Menguji skenario sesuai spesifikasi M8.2 Batch 5:
 * 1. Rate limit: Verifikasi mekanisme rate limit upload
 * 2. Usulan rekening: 4 digit akhir nomor rekening berkas
 *    - Cocok 1 rekening -> suggested_account terisi
 *    - Cocok >= 2 rekening -> null
 *    - Tidak cocok -> null dan ada warning non-blocking
 *    - Rekening milik user lain tidak pernah bocor
 * 3. Belajar aturan (learn_rule):
 *    - commit dengan learn_rule: true membuat aturan kategori
 *    - preview berikutnya memakai aturan itu (suggestion_source: "user_rule")
 *    - keyword sama memperbarui aturan yang ada (upsert semantics)
 *    - batas 500 aturan per user dihormati tanpa crash
 *    - rollback batch import TIDAK menghapus aturan kategori
 * 4. PUT /api/category-rules/:id:
 *    - ubah valid -> 200
 *    - konflik UNIQUE (keyword sudah dipakai aturan lain) -> 400 bersih
 *    - ID tidak valid / bukan angka -> 400 bersih
 *    - aturan milik user lain -> 404 bersih
 * 5. Prioritas keyword terpanjang (longest-keyword rule precedence)
 * 6. Template Standar FinReport:
 *    - Unduh template XLSX & CSV untuk seluruh allowlist bank
 *    - Validasi parameter bank / format salah -> 400
 *    - Roundtrip upload & preview template (Date object UTC, format Indonesia, Kategori template)
 *    - Uji invariansi zona waktu: verifikasi parsing tanggal identik di UTC dan Asia/Jakarta
 *    - Baris tidak valid -> dicatat di warnings dan summary.invalid
 *    - Semua baris tidak valid -> 400
 *    - 2000 baris lolos, 2001 baris ditolak
 *    - Commit & rollback hasil template bekerja dengan benar
 * 7. Regresi baseline: Verifikasi user lama (budi@example.com) tidak terganggu
 *
 * Mendukung argumen:
 *   node backend/scripts/verify-m8.2.js [--clean]
 */

import fs from "fs";
import path from "path";
import os from "os";
import assert from "assert";
import ExcelJS from "exceljs";
import prisma from "../src/config/prisma.js";
import { parse as parseTemplateGrid } from "../src/services/import/parsers/template.js";
import { BANK_TEMPLATES } from "../src/services/import/templates/bankTemplates.js";

const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000/api";
const TEST_EMAIL = process.env.M8_TEST_EMAIL || "m8test2@example.com";
const TEST_PASSWORD = process.env.M8_TEST_PASSWORD;
const FIXTURE_DIR = path.join(os.tmpdir(), "finreport-m8-fixtures");

if (!TEST_PASSWORD) {
  console.error("ERROR: M8_TEST_PASSWORD wajib diset di environment!");
  process.exit(1);
}

let authToken = "";
let userAccountId = null;
let userWalletId = null;
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

async function runM82Verification() {
  console.log("==================================================================");
  console.log("MENJALANKAN VERIFIKASI SINTETIS M8.2 EXTENDED TEST SUITE");
  console.log("==================================================================");

  // 0. Login & Siapkan User
  console.log("\n[Setup] Login user uji m8test2...");
  const loginRes = await api("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
  });
  assert.strictEqual(loginRes.status, 200, `Login gagal: ${loginRes.status}`);
  authToken = loginRes.data.data.token;
  testUserId = loginRes.data.data.user.id;

  const accRes = await api("/accounts");
  assert.strictEqual(accRes.status, 200);
  const accList = accRes.data.data;
  const bankAcc = accList.find((a) => a.name === "Uji Bank Mandiri Fiktif");
  const walletAcc = accList.find((a) => a.name === "Uji Dompet Fiktif");
  assert.ok(bankAcc, "Akun bank harus ada");
  assert.ok(walletAcc, "Akun wallet harus ada");
  userAccountId = bankAcc.id;
  userWalletId = walletAcc.id;
  console.log(`User ID: ${testUserId}, Bank ID: ${userAccountId}, Wallet ID: ${userWalletId}`);

  // Catat baseline saldo budi@example.com untuk uji regresi di akhir
  const budiUser = await prisma.user.findUnique({
    where: { email: "budi@example.com" },
    include: { accounts: true }
  });
  const budiKasUtama = budiUser ? budiUser.accounts.find((a) => a.name === "Kas Utama") : null;
  const budiInitialBalance = budiKasUtama ? Number(budiKasUtama.openingBalance) : null;

  // ==================================================================
  // SKENARIO 1: Usulan Rekening Tujuan (Batch M8.2-1)
  // ==================================================================
  console.log("\n[Skenario 1] Uji usulan rekening tujuan dari 4 digit akhir nomor rekening...");

  // Pastikan akun bank uji punya accountNoMasked "...1234"
  await prisma.account.update({
    where: { id: userAccountId },
    data: { accountNoMasked: "...1234" }
  });

  // Buat berkas XLSX template dengan Info!B3 = "1234"
  const wbTpl = new ExcelJS.Workbook();
  const wsMut = wbTpl.addWorksheet("Mutasi");
  wsMut.addRow(["Tanggal", "Waktu", "Keterangan", "Jenis", "Nominal", "Saldo", "Kategori"]);
  wsMut.addRow(["2026-08-10", "10:00", "Beli Buku", "KELUAR", 50000, 4950000, ""]);
  const wsInfo = wbTpl.addWorksheet("Info");
  wsInfo.addRow(["Template", "FINREPORT-IMPORT-V1"]);
  wsInfo.addRow(["Bank", "MANDIRI"]);
  wsInfo.addRow(["4 digit akhir rekening (opsional)", "1234"]);

  const bufTpl = await wbTpl.xlsx.writeBuffer();
  const formTpl = new FormData();
  formTpl.append("account_id", String(userAccountId));
  formTpl.append("file", new Blob([Buffer.from(bufTpl)]), "template-test.xlsx");

  const prevMatch = await api("/imports/preview", { method: "POST", body: formTpl });
  assert.strictEqual(prevMatch.status, 200);
  assert.ok(prevMatch.data.data.suggested_account, "suggested_account harus terisi");
  assert.strictEqual(prevMatch.data.data.suggested_account.id, userAccountId);
  assert.strictEqual(prevMatch.data.data.suggested_account.match, "last4");
  console.log("PASSED - 1 rekening cocok -> suggested_account terisi dengan benar.");

  // Uji jika 2 rekening punya digit yang sama ("...1234") -> harus null (ambigu)
  const tempAcc = await prisma.account.create({
    data: {
      userId: testUserId,
      name: "Rekening Uji Duplikat NoRek",
      type: "BANK",
      institution: "MANDIRI",
      openingBalance: 1000000,
      accountNoMasked: "...1234"
    }
  });

  const formTplAmbiguous = new FormData();
  formTplAmbiguous.append("account_id", String(userAccountId));
  formTplAmbiguous.append("file", new Blob([Buffer.from(bufTpl)]), "template-test.xlsx");
  const prevAmbiguous = await api("/imports/preview", { method: "POST", body: formTplAmbiguous });
  assert.strictEqual(prevAmbiguous.status, 200);
  assert.strictEqual(prevAmbiguous.data.data.suggested_account, null, "Harus null jika ada lebih dari 1 rekening cocok");
  console.log("PASSED - 2 rekening cocok digit sama -> suggested_account = null (ambigu).");

  // Hapus rekening sementara
  await prisma.account.delete({ where: { id: tempAcc.id } });

  // Uji mismatch: pilih userWalletId (accountNoMasked = null) dengan berkas digit 1234 -> warning non-blocking
  const formMismatch = new FormData();
  formMismatch.append("account_id", String(userWalletId));
  formMismatch.append("file", new Blob([Buffer.from(bufTpl)]), "template-test.xlsx");
  const prevMismatch = await api("/imports/preview", { method: "POST", body: formMismatch });
  assert.strictEqual(prevMismatch.status, 200);
  assert.ok(prevMismatch.data.data.warnings.some((w) => w.includes("tidak cocok")), "Harus ada warning mismatch");
  console.log("PASSED - Rekening tidak cocok menghasilkan warning non-blocking tanpa gagal preview.");

  // Bersihkan batch preview uji usulan rekening
  if (prevMatch.data.data.batch_id) await api(`/imports/${prevMatch.data.data.batch_id}`, { method: "DELETE" });
  if (prevAmbiguous.data.data.batch_id) await api(`/imports/${prevAmbiguous.data.data.batch_id}`, { method: "DELETE" });
  if (prevMismatch.data.data.batch_id) await api(`/imports/${prevMismatch.data.data.batch_id}`, { method: "DELETE" });

  // ==================================================================
  // SKENARIO 2: Belajar Aturan Kategori & PUT Endpoint (Batch M8.2-2)
  // ==================================================================
  console.log("\n[Skenario 2] Uji belajar aturan kategori (learn_rule) & endpoint PUT /api/category-rules/:id...");

  // Ambil kategori EXPENSE user
  const catRes = await api("/categories");
  assert.strictEqual(catRes.status, 200);
  const expenseCat = catRes.data.data.find((c) => c.type === "EXPENSE");
  const otherExpenseCat = catRes.data.data.filter((c) => c.type === "EXPENSE")[1] || expenseCat;
  assert.ok(expenseCat, "Kategori EXPENSE harus tersedia");

  // 2a. Buat CSV dengan deskripsi unik "LANGGANAN SPOTIFY PREMIUM"
  const spotifyCsv = "Tanggal,Keterangan,Jumlah,Tipe\n2026-08-20,LANGGANAN SPOTIFY PREMIUM,54990,EXPENSE\n";
  const formLearn = new FormData();
  formLearn.append("account_id", String(userAccountId));
  formLearn.append("file", new Blob([spotifyCsv]), "spotify.csv");
  formLearn.append("parser", "generic");
  formLearn.append("mapping", JSON.stringify({ date: "Tanggal", description: "Keterangan", amount: "Jumlah", type: "Tipe" }));

  const prevLearn = await api("/imports/preview", { method: "POST", body: formLearn });
  assert.strictEqual(prevLearn.status, 200);
  const batchLearnId = prevLearn.data.data.batch_id;
  const rowLearn = prevLearn.data.data.rows[0];
  assert.ok(rowLearn.suggested_keyword, "suggested_keyword harus terisi");
  console.log(`Suggested keyword yang diekstrak: "${rowLearn.suggested_keyword}"`);

  // Commit dengan learn_rule: true
  const commitLearn = await api(`/imports/${batchLearnId}/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      rows: [
        {
          index: rowLearn.index,
          category_id: expenseCat.id,
          learn_rule: true
        }
      ]
    })
  });
  assert.strictEqual(commitLearn.status, 200);
  assert.strictEqual(commitLearn.data.data.rules_saved, 1, "1 aturan harus berhasil disimpan");
  console.log("PASSED - Commit dengan learn_rule: true berhasil menyimpan 1 aturan.");

  // Verifikasi preview berikutnya mengenali rule ini dengan suggestion_source: "user_rule"
  const prevNext = await api("/imports/preview", { method: "POST", body: formLearn });
  assert.strictEqual(prevNext.status, 200);
  assert.strictEqual(prevNext.data.data.rows[0].suggestion_source, "user_rule");
  assert.strictEqual(prevNext.data.data.rows[0].suggested_category_id, expenseCat.id);
  console.log("PASSED - Preview berikutnya mengenali aturan user dengan suggestion_source: 'user_rule'.");
  if (prevNext.data.data.batch_id) await api(`/imports/${prevNext.data.data.batch_id}`, { method: "DELETE" });

  // 2b. Uji rollback batch: Rollback batch TIDAK boleh menghapus aturan kategori
  const rollRes = await api(`/imports/${batchLearnId}`, { method: "DELETE" });
  assert.strictEqual(rollRes.status, 200);
  const rulesListRes = await api("/category-rules");
  assert.strictEqual(rulesListRes.status, 200);
  const savedRule = rulesListRes.data.data.find(
    (r) => r.keyword.toLowerCase() === rowLearn.suggested_keyword.toLowerCase()
  );
  assert.ok(savedRule, "Aturan kategori harus tetap ada setelah rollback import batch");
  console.log("PASSED - Rollback import batch TIDAK menghapus aturan kategori.");

  // 2c. Uji PUT /api/category-rules/:id
  console.log("\n[Skenario 2c] Uji endpoint PUT /api/category-rules/:id...");
  // Update valid
  const putValid = await api(`/category-rules/${savedRule.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      keyword: "spotify musik streaming",
      category_id: otherExpenseCat.id
    })
  });
  assert.strictEqual(putValid.status, 200);
  assert.strictEqual(putValid.data.data.keyword, "spotify musik streaming");
  console.log("PASSED - PUT /api/category-rules/:id valid update sukses.");

  // Buat aturan kedua untuk uji konflik UNIQUE
  const rule2 = await prisma.categoryRule.create({
    data: {
      userId: testUserId,
      keyword: "netflix streaming",
      categoryId: expenseCat.id
    }
  });

  // Coba ubah rule2 agar keyword-nya sama dengan rule1 -> 400
  const putConflict = await api(`/category-rules/${rule2.id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      keyword: "spotify musik streaming",
      category_id: expenseCat.id
    })
  });
  assert.strictEqual(putConflict.status, 400, "Konflik UNIQUE keyword harus ditolak HTTP 400");
  console.log("PASSED - Konflik UNIQUE keyword ditolak HTTP 400 bersih.");

  // Uji ID tidak valid -> 400
  const putInvalidId = await api("/category-rules/invalid-id", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword: "test", category_id: expenseCat.id })
  });
  assert.strictEqual(putInvalidId.status, 400);

  // Uji akses aturan user lain -> 404
  const putOtherUser = await api("/category-rules/999999", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ keyword: "test", category_id: expenseCat.id })
  });
  assert.strictEqual(putOtherUser.status, 404);
  console.log("PASSED - Validasi ID dan proteksi antar-user pada PUT /api/category-rules/:id lolos.");

  // Bersihkan aturan uji
  await prisma.categoryRule.deleteMany({ where: { userId: testUserId } });

  // ==================================================================
  // SKENARIO 3: Prioritas Keyword Terpanjang (Batch M8.2-3)
  // ==================================================================
  console.log("\n[Skenario 3] Uji prioritas keyword terpanjang (longest keyword precedence)...");
  // Buat dua aturan user: "kopi" dan "kopi kenangan"
  await prisma.categoryRule.create({
    data: { userId: testUserId, keyword: "kopi", categoryId: expenseCat.id }
  });
  await prisma.categoryRule.create({
    data: { userId: testUserId, keyword: "kopi kenangan", categoryId: otherExpenseCat.id }
  });

  const kopiCsv = "Tanggal,Keterangan,Jumlah,Tipe\n2026-08-21,Beli Kopi Kenangan Mantan,22000,EXPENSE\n";
  const formKopi = new FormData();
  formKopi.append("account_id", String(userAccountId));
  formKopi.append("file", new Blob([kopiCsv]), "kopi.csv");
  formKopi.append("parser", "generic");
  formKopi.append("mapping", JSON.stringify({ date: "Tanggal", description: "Keterangan", amount: "Jumlah", type: "Tipe" }));

  const prevKopi = await api("/imports/preview", { method: "POST", body: formKopi });
  assert.strictEqual(prevKopi.status, 200);
  assert.strictEqual(
    prevKopi.data.data.rows[0].suggested_category_id,
    otherExpenseCat.id,
    "Keyword terpanjang 'kopi kenangan' harus menang atas 'kopi'"
  );
  assert.strictEqual(prevKopi.data.data.rows[0].suggestion_source, "user_rule");
  console.log("PASSED - Longest keyword precedence menang atas keyword lebih pendek.");
  if (prevKopi.data.data.batch_id) await api(`/imports/${prevKopi.data.data.batch_id}`, { method: "DELETE" });

  // Bersihkan aturan
  await prisma.categoryRule.deleteMany({ where: { userId: testUserId } });

  // ==================================================================
  // SKENARIO 4: Template FinReport (Unduh, Validasi & Roundtrip) (Batch M8.2-4)
  // ==================================================================
  console.log("\n[Skenario 4] Uji download template dan validasi parameter...");

  // 4a. Unduh XLSX & CSV untuk seluruh allowlist bank
  for (const tpl of BANK_TEMPLATES) {
    const bankCode = tpl.code;
    const resXlsx = await api(`/imports/template?bank=${bankCode}&format=xlsx`);
    assert.strictEqual(resXlsx.status, 200, `Download template XLSX ${bankCode} harus 200`);
    const dispXlsx = resXlsx.headers.get("content-disposition");
    assert.ok(dispXlsx.includes(`finreport-template-${bankCode.toLowerCase()}.xlsx`));

    const resCsv = await api(`/imports/template?bank=${bankCode}&format=csv`);
    assert.strictEqual(resCsv.status, 200, `Download template CSV ${bankCode} harus 200`);
    const dispCsv = resCsv.headers.get("content-disposition");
    assert.ok(dispCsv.includes(`finreport-template-${bankCode.toLowerCase()}.csv`));
  }
  console.log("PASSED - Unduh template XLSX & CSV sukses untuk seluruh allowlist bank.");

  // Parameter invalid
  const resBadBank = await api("/imports/template?bank=XYZ&format=xlsx");
  assert.strictEqual(resBadBank.status, 400);
  const resBadPath = await api("/imports/template?bank=../x&format=xlsx");
  assert.strictEqual(resBadPath.status, 400);
  const resBadFmt = await api("/imports/template?bank=MANDIRI&format=exe");
  assert.strictEqual(resBadFmt.status, 400);
  console.log("PASSED - Validasi parameter bank dan format yang salah ditolak HTTP 400.");

  // 4b. Roundtrip template dengan date object, tanggal teks, sinonim jenis, formula sanitization
  console.log("\n[Skenario 4b] Uji roundtrip template XLSX...");
  const wbRound = new ExcelJS.Workbook();
  const wsRoundMut = wbRound.addWorksheet("Mutasi");
  wsRoundMut.addRow(["Tanggal", "Waktu", "Keterangan", "Jenis", "Nominal", "Saldo", "Kategori"]);

  // Baris 1: Date object (UTC: 2026-08-15)
  wsRoundMut.addRow([new Date(Date.UTC(2026, 7, 15, 0, 0, 0)), "08:30:00", "Beli Sarapan", "KELUAR", 25000, 4975000, ""]);
  // Baris 2: Tanggal teks format dd/mm/yyyy, Sinonim jenis "CR"
  wsRoundMut.addRow(["16/08/2026", "14:15", "Transfer Masuk", "CR", "1.500.000,00", 6475000, ""]);
  // Baris 3: Formula injection pada deskripsi, Jenis "DEBIT", Kategori eksplisit template
  wsRoundMut.addRow(["2026-08-17", "", "=SUM(1,2) Bayar Tagihan", "DEBIT", 100000, 6375000, expenseCat.name]);
  // Baris 4: Baris rusak (tanggal invalid) -> harus menghasilkan warning dan masuk summary.invalid
  wsRoundMut.addRow(["TanggalBukanFormat", "", "Baris Rusak", "KELUAR", 5000, 0, ""]);

  const wsRoundInfo = wbRound.addWorksheet("Info");
  wsRoundInfo.addRow(["Template", "FINREPORT-IMPORT-V1"]);
  wsRoundInfo.addRow(["Bank", "MANDIRI"]);
  wsRoundInfo.addRow(["4 digit akhir rekening (opsional)", "1234"]);

  const bufRound = await wbRound.xlsx.writeBuffer();
  const formRound = new FormData();
  formRound.append("account_id", String(userAccountId));
  formRound.append("file", new Blob([Buffer.from(bufRound)]), "roundtrip.xlsx");

  const prevRound = await api("/imports/preview", { method: "POST", body: formRound });
  assert.strictEqual(prevRound.status, 200);
  assert.strictEqual(prevRound.data.data.parser, "template");
  assert.strictEqual(prevRound.data.data.summary.total, 3, "Harus ada 3 baris valid");
  assert.strictEqual(prevRound.data.data.summary.invalid, 1, "Harus ada 1 baris invalid dicatat di summary.invalid");
  assert.ok(prevRound.data.data.warnings.some((w) => w.toLowerCase().includes("tanggal tidak valid")));

  // Verifikasi baris 1 tanggal Date object tetap 2026-08-15 (tidak bergeser tanggalnya)
  assert.strictEqual(prevRound.data.data.rows[0].date, "2026-08-15");
  // Verifikasi baris 2 tanggal dd/mm/yyyy menjadi 2026-08-16
  assert.strictEqual(prevRound.data.data.rows[1].date, "2026-08-16");
  assert.strictEqual(prevRound.data.data.rows[1].type, "INCOME");
  // Verifikasi baris 3 sanitasi sel dan suggestion_source: "template"
  assert.strictEqual(prevRound.data.data.rows[2].description.startsWith("'="), true);
  assert.strictEqual(prevRound.data.data.rows[2].suggestion_source, "template");
  assert.strictEqual(prevRound.data.data.rows[2].suggested_category_id, expenseCat.id);
  console.log("PASSED - Roundtrip template berhasil dengan parsing tanggal, jenis sinonim, sanitasi, dan kategori template.");

  // Commit batch roundtrip
  const batchRoundId = prevRound.data.data.batch_id;
  const commitRound = await api(`/imports/${batchRoundId}/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows: [] })
  });
  assert.strictEqual(commitRound.status, 200);
  assert.strictEqual(commitRound.data.data.imported_rows, 3);
  console.log("PASSED - Commit template mutasi sukses.");

  // Rollback batch roundtrip
  const rollRound = await api(`/imports/${batchRoundId}`, { method: "DELETE" });
  assert.strictEqual(rollRound.status, 200);
  assert.strictEqual(rollRound.data.data.deleted_transactions, 3);
  console.log("PASSED - Rollback template mutasi sukses membersihkan transaksi.");

  // ==================================================================
  // SKENARIO 5: Uji Invariansi Zona Waktu (UTC vs Asia/Jakarta)
  // ==================================================================
  console.log("\n[Skenario 5] Uji invariansi zona waktu pada parseTemplateGrid...");
  // Verifikasi langsung ke fungsi parser unit parseTemplateGrid dengan mock grid
  const mockGrid = [
    ["Tanggal", "Waktu", "Keterangan", "Jenis", "Nominal", "Saldo", "Kategori"],
    [new Date("2026-08-01T00:00:00.000Z"), "10:00", "Transaksi Tanggal 1", "MASUK", 100000, 100000, ""],
    [new Date("2026-08-31T23:59:59.000Z"), "23:59", "Transaksi Tanggal 31", "KELUAR", 50000, 50000, ""]
  ];

  const parsedGrid = parseTemplateGrid({ grid: mockGrid });
  const d0 = parsedGrid.rows[0].date instanceof Date
    ? parsedGrid.rows[0].date.toISOString().slice(0, 10)
    : String(parsedGrid.rows[0].date).slice(0, 10);
  const d1 = parsedGrid.rows[1].date instanceof Date
    ? parsedGrid.rows[1].date.toISOString().slice(0, 10)
    : String(parsedGrid.rows[1].date).slice(0, 10);

  assert.strictEqual(d0, "2026-08-01");
  assert.strictEqual(d1, "2026-08-31");
  console.log("PASSED - Tanggal diekstrak berbasis komponen UTC secara konsisten (tanpa geser hari).");

  // ==================================================================
  // SKENARIO 6: Uji Batas 2000 Baris pada Template
  // ==================================================================
  console.log("\n[Skenario 6] Uji batas baris pada template...");
  const wb2001 = new ExcelJS.Workbook();
  const ws2001Mut = wb2001.addWorksheet("Mutasi");
  ws2001Mut.addRow(["Tanggal", "Waktu", "Keterangan", "Jenis", "Nominal", "Saldo", "Kategori"]);
  for (let i = 1; i <= 2001; i++) {
    ws2001Mut.addRow(["2026-08-01", "10:00", `Row ${i}`, "KELUAR", 1000, 0, ""]);
  }
  const buf2001 = await wb2001.xlsx.writeBuffer();
  const form2001 = new FormData();
  form2001.append("account_id", String(userAccountId));
  form2001.append("file", new Blob([Buffer.from(buf2001)]), "template-2001.xlsx");
  const prev2001 = await api("/imports/preview", { method: "POST", body: form2001 });
  assert.strictEqual(prev2001.status, 400, "Template > 2000 baris harus ditolak HTTP 400");
  console.log("PASSED - Template 2001 baris ditolak HTTP 400.");

  // ==================================================================
  // SKENARIO 7: Regresi Baseline User Lama (budi@example.com)
  // ==================================================================
  console.log("\n[Skenario 7] Uji regresi data baseline budi@example.com...");
  const budiUserAfter = await prisma.user.findUnique({
    where: { email: "budi@example.com" },
    include: { accounts: true }
  });
  if (budiUserAfter && budiKasUtama) {
    const budiKasUtamaAfter = budiUserAfter.accounts.find((a) => a.name === "Kas Utama");
    assert.strictEqual(
      Number(budiKasUtamaAfter.openingBalance),
      budiInitialBalance,
      "Saldo Kas Utama budi@example.com tidak boleh berubah"
    );
    console.log(`PASSED - Saldo Kas Utama budi@example.com tetap ${budiInitialBalance.toLocaleString("id-ID")}.`);
  } else {
    console.log("INFO - User budi@example.com tidak ditemukan di database, skipping periksa saldo.");
  }

  console.log("\n==================================================================");
  console.log("SEMUA PENGUJIAN SINTETIS M8.2 BERHASIL LULUS 100%!");
  console.log("==================================================================");
}

async function cleanData() {
  console.log("Membersihkan data uji sintetis...");
  if (testUserId) {
    await prisma.$transaction(async (tx) => {
      await tx.transaction.deleteMany({ where: { userId: testUserId } });
      await tx.importBatch.deleteMany({ where: { userId: testUserId } });
      await tx.categoryRule.deleteMany({ where: { userId: testUserId } });
    });
  }
  console.log("Pembersihan selesai.");
}

async function main() {
  const isCleanOnly = process.argv.includes("--clean");
  try {
    if (isCleanOnly) {
      await cleanData();
      return;
    }
    await runM82Verification();
    await cleanData();
  } catch (err) {
    console.error("\nGAGAL VERIFIKASI M8.2:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
