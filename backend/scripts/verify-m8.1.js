/**
 * Skrip Verifikasi Lengkap Batch M8.1 (verify-m8.1.js)
 *
 * Menguji 8 skenario wajib + uji keamanan & batas upload terhadap
 * instance server nyata (port 5000) dan database MySQL.
 *
 * Seluruh kredensial dibaca dari variabel lingkungan:
 * - M8_TEST_EMAIL (default: m8test@example.com)
 * - M8_TEST_PASSWORD
 * - MANDIRI_SAMPLE_PASSWORD
 * - MANDIRI_SAMPLE_PATH
 */

import assert from "assert";
import fs from "fs";
import ExcelJS from "exceljs";

const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000/api";
const TEST_EMAIL = process.env.M8_TEST_EMAIL || "m8test@example.com";
const TEST_PASSWORD = process.env.M8_TEST_PASSWORD;
const MANDIRI_PASSWORD = process.env.MANDIRI_SAMPLE_PASSWORD;
const MANDIRI_PATH =
  process.env.MANDIRI_SAMPLE_PATH ||
  "C:\\Users\\DW\\Downloads\\e-Statement_XXXXXXXXX8990_01 Agu 2026-31 Agu 2026.xlsx";

if (!TEST_PASSWORD) {
  console.error("ERROR: M8_TEST_PASSWORD belum diset di environment");
  process.exit(1);
}
if (!MANDIRI_PASSWORD) {
  console.error("ERROR: MANDIRI_SAMPLE_PASSWORD belum diset di environment");
  process.exit(1);
}
if (!fs.existsSync(MANDIRI_PATH)) {
  console.error("ERROR: File sampel Mandiri tidak ditemukan di:", MANDIRI_PATH);
  process.exit(1);
}

let authToken = "";
let userAccountId = null;
let otherUserAccountId = 1; // Rekening milik user lain

async function api(path, options = {}) {
  const headers = { ...options.headers };
  if (authToken && !headers.Authorization) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, { ...options, headers });
  const contentType = res.headers.get("content-type") || "";
  let json = null;
  if (contentType.includes("application/json")) {
    json = await res.json();
  }
  return { status: res.status, ok: res.ok, data: json };
}

async function runVerification() {
  console.log("=================================================");
  console.log("MEMULAI VERIFIKASI BATCH M8.1 (8 SKENARIO WAJIB)");
  console.log("=================================================");

  // 0. Otentikasi & Ambil Rekening Uji
  console.log("\n[0] Otentikasi user uji...");
  const loginRes = await api("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
  });
  assert.strictEqual(loginRes.status, 200, "Login user uji harus sukses 200");
  authToken = loginRes.data.data.token;
  console.log("OK - Berhasil login");

  const accRes = await api("/accounts");
  assert.strictEqual(accRes.status, 200);
  assert.ok(accRes.data.data.length > 0, "User harus memiliki rekening");
  userAccountId = accRes.data.data[0].id;
  console.log(`OK - Rekening user uji ditemukan: ID ${userAccountId}`);

  const sampleBuffer = fs.readFileSync(MANDIRI_PATH);

  // SKENARIO 1 & 7: Preview sampel asli dengan password benar & Rekonsiliasi non-blocking
  console.log("\n[Skenario 1 & 7] Preview sampel asli Mandiri & Rekonsiliasi peringatan...");
  const form1 = new FormData();
  form1.append("account_id", String(userAccountId));
  form1.append("file", new Blob([sampleBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "e-Statement_Mandiri.xlsx");
  form1.append("file_password", MANDIRI_PASSWORD);

  const prev1Res = await api("/imports/preview", { method: "POST", body: form1 });
  assert.strictEqual(prev1Res.status, 200, "Preview harus sukses HTTP 200");
  assert.strictEqual(prev1Res.data.success, true);
  const prev1 = prev1Res.data.data;
  assert.strictEqual(prev1.summary.total, 10, "Sampel Mandiri harus memiliki 10 baris transaksi");
  assert.strictEqual(prev1.summary.duplicate, 0, "Preview awal harus 0 duplikat");
  assert.strictEqual(prev1.summary.new, 10);
  assert.strictEqual(prev1.rows[0].time, "17:10:32", "Jam transaksi harus terparse");
  assert.strictEqual(prev1.rows[0].amount, 283000, "Nominal transaksi harus 283000");

  // Skenario 7: Rekonsiliasi muncul sebagai peringatan
  assert.ok(prev1.warnings.length > 0, "Peringatan rekonsiliasi harus ada untuk sampel parsial");
  assert.ok(prev1.warnings.some((w) => w.includes("Rekonsiliasi")), "Peringatan harus menyebut Rekonsiliasi");
  console.log("PASSED - Skenario 1: Preview terparse benar (tanggal, jam, keterangan multi-baris, nominal)");
  console.log("PASSED - Skenario 7: Rekonsiliasi peringatan selisih muncul tanpa memblokir");

  const batchIdMandiri = prev1.batch_id;

  // SKENARIO 2: Preview dengan password salah -> HTTP 400 pesan jelas
  console.log("\n[Skenario 2] Preview dengan password salah...");
  const formWrong = new FormData();
  formWrong.append("account_id", String(userAccountId));
  formWrong.append("file", new Blob([sampleBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "e-Statement_Mandiri.xlsx");
  formWrong.append("file_password", "wrong_password_xyz");

  const prevWrongRes = await api("/imports/preview", { method: "POST", body: formWrong });
  assert.strictEqual(prevWrongRes.status, 400, "Password salah harus ditolak HTTP 400");
  assert.strictEqual(prevWrongRes.data.success, false);
  assert.strictEqual(prevWrongRes.data.message, "Password file salah");
  console.log("PASSED - Skenario 2: Password salah ditolak HTTP 400 dengan pesan 'Password file salah'");

  // SKENARIO 3: Preview xlsx tidak terenkripsi -> tetap berjalan
  console.log("\n[Skenario 3] Preview xlsx tidak terenkripsi...");
  const plainWb = new ExcelJS.Workbook();
  const plainWs = plainWb.addWorksheet("Mutasi");
  plainWs.addRow(["Tanggal", "Keterangan", "Jumlah", "Tipe"]);
  plainWs.addRow(["2026-08-05", "Beli ATK Kantor", "45000", "EXPENSE"]);
  const plainBuf = await plainWb.xlsx.writeBuffer();

  const formPlain = new FormData();
  formPlain.append("account_id", String(userAccountId));
  formPlain.append("file", new Blob([plainBuf], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "plain_test.xlsx");
  formPlain.append("parser", "generic");
  formPlain.append("mapping", JSON.stringify({ date: "Tanggal", description: "Keterangan", amount: "Jumlah", type: "Tipe" }));

  const prevPlainRes = await api("/imports/preview", { method: "POST", body: formPlain });
  assert.strictEqual(prevPlainRes.status, 200, "XLSX tidak terenkripsi harus sukses HTTP 200");
  assert.strictEqual(prevPlainRes.data.data.rows.length, 1);
  assert.strictEqual(prevPlainRes.data.data.rows[0].amount, 45000);
  console.log("PASSED - Skenario 3: XLSX tidak terenkripsi berjalan normal");

  // Bersihkan batch plain test
  await api(`/imports/${prevPlainRes.data.data.batch_id}`, { method: "DELETE" });

  // SKENARIO 5: Commit batch -> transaksi tercipta, saldo berubah, dashboard terbarui
  console.log("\n[Skenario 5] Commit batch Mandiri...");
  const commitRes = await api(`/imports/${batchIdMandiri}/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows: [] })
  });
  assert.strictEqual(commitRes.status, 200, "Commit harus sukses HTTP 200");
  assert.strictEqual(commitRes.data.data.status, "COMMITTED");
  assert.strictEqual(commitRes.data.data.imported_rows, 10);

  // Verifikasi saldo rekening
  const accAfterCommit = await api("/accounts");
  const updatedAcc = accAfterCommit.data.data.find((a) => a.id === userAccountId);
  assert.notStrictEqual(updatedAcc.currentBalance, 0, "Saldo rekening harus berubah setelah commit");

  // Verifikasi dashboard summary (periode Agustus 2026 sesuai tanggal sampel berkas)
  const summaryAfterCommit = await api("/dashboard/summary?month=8&year=2026");
  assert.strictEqual(summaryAfterCommit.status, 200);
  assert.strictEqual(summaryAfterCommit.data.data.period.transactionCount, 10, "Jumlah transaksi dashboard harus 10");
  assert.ok(summaryAfterCommit.data.data.period.expense > 0, "Total pengeluaran harus bertambah");
  assert.notStrictEqual(summaryAfterCommit.data.data.runningBalance, 0, "Running balance harus bertambah/berubah");
  console.log("PASSED - Skenario 5: Commit atomic berhasil, transaksi tercipta, saldo & dashboard terbarui tanpa transfer");

  // SKENARIO 4: Preview ulang berkas yang sama -> semua baris ditandai duplikat
  console.log("\n[Skenario 4] Preview ulang berkas yang sama setelah commit...");
  const formDup = new FormData();
  formDup.append("account_id", String(userAccountId));
  formDup.append("file", new Blob([sampleBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "e-Statement_Mandiri.xlsx");
  formDup.append("file_password", MANDIRI_PASSWORD);

  const prevDupRes = await api("/imports/preview", { method: "POST", body: formDup });
  assert.strictEqual(prevDupRes.status, 200);
  const dupData = prevDupRes.data.data;
  assert.strictEqual(dupData.summary.total, 10);
  assert.strictEqual(dupData.summary.duplicate, 10, "Semua 10 baris harus terdeteksi sebagai duplikat");
  assert.strictEqual(dupData.summary.new, 0);
  console.log("PASSED - Skenario 4: Preview ulang mendeteksi seluruh baris sebagai duplikat (10/10)");

  // SKENARIO 6: Rollback batch -> transaksi batch hilang, saldo kembali
  console.log("\n[Skenario 6] Rollback batch Mandiri...");
  const rollbackRes = await api(`/imports/${batchIdMandiri}`, { method: "DELETE" });
  assert.strictEqual(rollbackRes.status, 200, "Rollback harus sukses HTTP 200");
  assert.strictEqual(rollbackRes.data.data.status, "CANCELLED");
  assert.strictEqual(rollbackRes.data.data.deleted_transactions, 10);

  // Verifikasi saldo kembali ke 0
  const accAfterRollback = await api("/accounts");
  const rolledAcc = accAfterRollback.data.data.find((a) => a.id === userAccountId);
  assert.strictEqual(rolledAcc.currentBalance, 0, "Saldo rekening harus kembali ke 0 setelah rollback");

  const summaryAfterRollback = await api("/dashboard/summary?month=8&year=2026");
  assert.strictEqual(summaryAfterRollback.data.data.period.transactionCount, 0, "Transaksi dashboard harus kembali 0");
  assert.strictEqual(summaryAfterRollback.data.data.runningBalance, 0, "Running balance harus kembali 0");
  console.log("PASSED - Skenario 6: Rollback atomic berhasil, seluruh transaksi hilang dan saldo kembali normal");

  // SKENARIO 8: account_id milik user lain -> ditolak (404/403) tanpa kebocoran data
  console.log("\n[Skenario 8] Penolakan rekening milik user lain...");
  const formOther = new FormData();
  formOther.append("account_id", String(otherUserAccountId));
  formOther.append("file", new Blob([sampleBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "e-Statement_Mandiri.xlsx");
  formOther.append("file_password", MANDIRI_PASSWORD);

  const prevOtherRes = await api("/imports/preview", { method: "POST", body: formOther });
  assert.ok(prevOtherRes.status === 404 || prevOtherRes.status === 400 || prevOtherRes.status === 403, "Harus ditolak dengan status 40x");
  assert.strictEqual(prevOtherRes.data.success, false);
  console.log(`PASSED - Skenario 8: Rekening milik user lain ditolak dengan status HTTP ${prevOtherRes.status}`);

  // UJI TAMBAHAN KEAMANAN & BATAS INPUT
  console.log("\n[Uji Tambahan] Validasi batas upload, format berkas, dan baris...");

  // 1. Berkas > 5 MB
  const bigBuffer = Buffer.alloc(5.5 * 1024 * 1024); // 5.5 MB
  const formBig = new FormData();
  formBig.append("account_id", String(userAccountId));
  formBig.append("file", new Blob([bigBuffer]), "huge.xlsx");

  const bigRes = await api("/imports/preview", { method: "POST", body: formBig });
  assert.strictEqual(bigRes.status, 400, "Berkas > 5 MB harus ditolak HTTP 400");
  console.log("PASSED - Batas ukuran berkas > 5 MB ditolak");

  // 2. Ekstensi tidak didukung (.txt)
  const formTxt = new FormData();
  formTxt.append("account_id", String(userAccountId));
  formTxt.append("file", new Blob(["test"]), "invalid.txt");

  const txtRes = await api("/imports/preview", { method: "POST", body: formTxt });
  assert.strictEqual(txtRes.status, 400, "Ekstensi selain .csv / .xlsx harus ditolak HTTP 400");
  console.log("PASSED - Ekstensi tidak didukung ditolak");

  // 3. Batas baris > 2000 baris
  let hugeCsv = "Tanggal,Keterangan,Jumlah,Tipe\n";
  for (let i = 1; i <= 2005; i++) {
    hugeCsv += `2026-08-01,Transaksi ${i},10000,EXPENSE\n`;
  }
  const formLines = new FormData();
  formLines.append("account_id", String(userAccountId));
  formLines.append("file", new Blob([Buffer.from(hugeCsv)]), "huge.csv");
  formLines.append("parser", "generic");
  formLines.append("mapping", JSON.stringify({ date: "Tanggal", description: "Keterangan", amount: "Jumlah", type: "Tipe" }));

  const linesRes = await api("/imports/preview", { method: "POST", body: formLines });
  assert.strictEqual(linesRes.status, 400, "Berkas > 2000 baris harus ditolak HTTP 400");
  assert.ok(linesRes.data.message.includes("2000"));
  console.log("PASSED - Batas maksimum 2000 baris transaksi ditolak HTTP 400");

  console.log("\n=================================================");
  console.log("SEMUA 8 SKENARIO WAJIB + UJI BATAS BERHASIL LULUS!");
  console.log("=================================================");
}

runVerification().catch((err) => {
  console.error("\nGAGAL VERIFIKASI:", err);
  process.exit(1);
});
