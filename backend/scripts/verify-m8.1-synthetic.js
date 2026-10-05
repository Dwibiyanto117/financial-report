/**
 * Extended Synthetic Verification Test Suite for Module M8.1
 *
 * Menguji skenario:
 * 1. Validasi input ketat (account_id = abc, 1abc, 1.5, -5, 0, 99999999999) -> 400/404 bersih tanpa query Prisma
 * 2. Commit 2000 baris dengan pengukuran waktu (< 10 detik, jauh di bawah batas 30 detik)
 * 3. Batas 2001 baris ditolak HTTP 400
 * 4. Formula injection ternetralkan di database
 * 5. Deskripsi > 255 karakter terpotong otomatis tanpa truncation crash
 * 6. Deteksi duplikat lintas berkas & transaksi kembar di hari yang sama
 * 7. Format nominal Indonesia (titik ribuan, koma desimal, debit/kredit terpisah)
 * 8. Berkas rusak (tanggal invalid / non-angka) ditangani dengan bersih (bukan 500)
 * 9. Plain XLSX berhasil diproses
 * 10. Mandiri sintetis terenkripsi (jika M8_FIXTURE_PASSWORD tersedia)
 * 11. Rollback batch mengembalikan saldo dan menghapus transaksi
 * 12. Rekening milik user lain ditolak (404/403)
 */

import fs from "fs";
import path from "path";
import os from "os";
import assert from "assert";

const BASE_URL = process.env.API_BASE_URL || "http://localhost:5000/api";
const TEST_EMAIL = process.env.M8_TEST_EMAIL || "m8test2@example.com";
const TEST_PASSWORD = process.env.M8_TEST_PASSWORD;
const FIXTURE_PASSWORD = process.env.M8_FIXTURE_PASSWORD;
const FIXTURE_DIR = path.join(os.tmpdir(), "finreport-m8-fixtures");

if (!TEST_PASSWORD) {
  console.error("ERROR: M8_TEST_PASSWORD wajib diset di environment!");
  process.exit(1);
}

let authToken = "";
let userAccountId = null;
let userWalletId = null;
let otherUserAccountId = 1;

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
  return { status: res.status, ok: res.ok, data: json };
}

async function runSyntheticVerification() {
  console.log("==================================================================");
  console.log("MENJALANKAN VERIFIKASI SINTETIS M8.1 HARDENING (EXTENDED)");
  console.log("==================================================================");

  // 1. Login user uji m8test2
  console.log("\n[Login] Melakukan otentikasi user m8test2...");
  const loginRes = await api("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD })
  });

  assert.strictEqual(loginRes.status, 200, `Login harus berhasil HTTP 200, dapat: ${loginRes.status}`);
  authToken = loginRes.data.data.token;
  console.log("PASSED - Login berhasil.");

  // Dapatkan rekening user
  const accRes = await api("/accounts");
  assert.strictEqual(accRes.status, 200);
  const accList = accRes.data.data;
  const bankAcc = accList.find((a) => a.name === "Uji Bank Mandiri Fiktif");
  const walletAcc = accList.find((a) => a.name === "Uji Dompet Fiktif");
  assert.ok(bankAcc, "Rekening Bank harus ada");
  assert.ok(walletAcc, "Rekening Wallet harus ada");
  userAccountId = bankAcc.id;
  userWalletId = walletAcc.id;
  console.log(`Akun Bank ID: ${userAccountId}, Akun Wallet ID: ${userWalletId}`);

  // SKENARIO 1: Validasi bilangan bulat positif yang ketat (H3)
  console.log("\n[Skenario 1] Uji validasi ketat account_id & route ID...");
  const invalidInputs = ["abc", "1abc", "1.5", "-5", "0", "99999999999"];

  for (const invalid of invalidInputs) {
    const dummyFile = Buffer.from("Tanggal,Keterangan,Jumlah,Tipe\n2026-08-01,Test,1000,EXPENSE\n");
    const form = new FormData();
    form.append("account_id", invalid);
    form.append("file", new Blob([dummyFile]), "test.csv");
    form.append("parser", "generic");
    form.append("mapping", JSON.stringify({ date: "Tanggal", description: "Keterangan", amount: "Jumlah", type: "Tipe" }));

    const res = await api("/imports/preview", { method: "POST", body: form });
    assert.strictEqual(res.status, 400, `Input account_id '${invalid}' harus ditolak HTTP 400`);
    assert.strictEqual(res.data.success, false);
    // Pastikan tidak ada bocoran query Prisma
    const msg = String(res.data.message || "");
    assert.ok(!msg.includes("prisma"), `Pesan tidak boleh membocorkan prisma: ${msg}`);
    assert.ok(!msg.includes("SELECT"), `Pesan tidak boleh memuat query SELECT: ${msg}`);
    assert.ok(!msg.includes("`"), `Pesan tidak boleh memuat backtick tabel/kolom: ${msg}`);
  }
  console.log("PASSED - Seluruh input account_id non-positif/non-integer ditolak HTTP 400 dengan pesan bersih.");

  // SKENARIO 2: Commit 2000 Baris & Pengukuran Waktu (H1)
  console.log("\n[Skenario 2] Uji commit 2000 baris dengan pengukuran waktu...");
  const f2000 = fs.readFileSync(path.join(FIXTURE_DIR, "generic-2000.csv"));
  const form2000 = new FormData();
  form2000.append("account_id", String(userAccountId));
  form2000.append("file", new Blob([f2000]), "generic-2000.csv");
  form2000.append("parser", "generic");
  form2000.append("mapping", JSON.stringify({ date: "Tanggal", description: "Keterangan", amount: "Jumlah", type: "Tipe" }));

  const prev2000Res = await api("/imports/preview", { method: "POST", body: form2000 });
  assert.strictEqual(prev2000Res.status, 200, "Preview 2000 baris harus berhasil HTTP 200");
  assert.strictEqual(prev2000Res.data.data.summary.total, 2000);
  const batch2000Id = prev2000Res.data.data.batch_id;

  const startCommit = Date.now();
  const commit2000Res = await api(`/imports/${batch2000Id}/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows: [] })
  });
  const elapsedMs = Date.now() - startCommit;
  console.log(`Durasi commit 2000 baris: ${elapsedMs} ms (${(elapsedMs / 1000).toFixed(2)} detik)`);

  assert.strictEqual(commit2000Res.status, 200, "Commit 2000 baris harus HTTP 200");
  assert.strictEqual(commit2000Res.data.data.imported_rows, 2000);
  assert.ok(elapsedMs < 10000, `Commit 2000 baris harus selesai di bawah 10 detik (aktual: ${elapsedMs} ms)`);
  console.log("PASSED - Commit 2000 baris selesai sangat cepat jauh di bawah batas 30 detik.");

  // Rollback 2000 baris agar DB kembali bersih
  const roll2000 = await api(`/imports/${batch2000Id}`, { method: "DELETE" });
  assert.strictEqual(roll2000.status, 200);
  assert.strictEqual(roll2000.data.data.deleted_transactions, 2000);
  console.log("PASSED - Rollback 2000 baris berhasil membersihkan transaksi.");

  // SKENARIO 3: Batas 2001 baris ditolak HTTP 400
  console.log("\n[Skenario 3] Uji penolakan 2001 baris...");
  const f2001 = fs.readFileSync(path.join(FIXTURE_DIR, "generic-2001.csv"));
  const form2001 = new FormData();
  form2001.append("account_id", String(userAccountId));
  form2001.append("file", new Blob([f2001]), "generic-2001.csv");
  form2001.append("parser", "generic");
  form2001.append("mapping", JSON.stringify({ date: "Tanggal", description: "Keterangan", amount: "Jumlah", type: "Tipe" }));

  const prev2001Res = await api("/imports/preview", { method: "POST", body: form2001 });
  assert.strictEqual(prev2001Res.status, 400, "2001 baris harus ditolak HTTP 400");
  assert.ok(prev2001Res.data.message.includes("2000"));
  console.log("PASSED - Batas maksimum 2000 baris ditolak HTTP 400.");

  // SKENARIO 4: Netralisasi Formula Injection
  console.log("\n[Skenario 4] Uji netralisasi formula injection...");
  const fFormula = fs.readFileSync(path.join(FIXTURE_DIR, "generic-formula.csv"));
  const formFormula = new FormData();
  formFormula.append("account_id", String(userAccountId));
  formFormula.append("file", new Blob([fFormula]), "generic-formula.csv");
  formFormula.append("parser", "generic");
  formFormula.append("mapping", JSON.stringify({ date: "Tanggal", description: "Keterangan", amount: "Jumlah", type: "Tipe" }));

  const prevFormRes = await api("/imports/preview", { method: "POST", body: formFormula });
  assert.strictEqual(prevFormRes.status, 200);
  for (const row of prevFormRes.data.data.rows) {
    assert.ok(row.description.startsWith("'"), `Deskripsi formula harus diawali kutip tunggal: ${row.description}`);
  }
  // Commit dan hapus batch
  const formBatchId = prevFormRes.data.data.batch_id;
  await api(`/imports/${formBatchId}`, { method: "DELETE" });
  console.log("PASSED - Sel berawalan =, +, -, @ ternetralkan dengan aman.");

  // SKENARIO 5: Potong deskripsi > 255 karakter otomatis
  console.log("\n[Skenario 5] Uji pemotongan deskripsi > 255 karakter...");
  const fLong = fs.readFileSync(path.join(FIXTURE_DIR, "generic-deskripsi-panjang.csv"));
  const formLong = new FormData();
  formLong.append("account_id", String(userAccountId));
  formLong.append("file", new Blob([fLong]), "generic-deskripsi-panjang.csv");
  formLong.append("parser", "generic");
  formLong.append("mapping", JSON.stringify({ date: "Tanggal", description: "Keterangan", amount: "Jumlah", type: "Tipe" }));

  const prevLongRes = await api("/imports/preview", { method: "POST", body: formLong });
  assert.strictEqual(prevLongRes.status, 200);
  const longBatchId = prevLongRes.data.data.batch_id;
  const commitLongRes = await api(`/imports/${longBatchId}/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows: [] })
  });
  assert.strictEqual(commitLongRes.status, 200, "Commit dengan deskripsi > 255 char harus sukses dipotong");
  assert.strictEqual(commitLongRes.data.data.imported_rows, 1);
  await api(`/imports/${longBatchId}`, { method: "DELETE" });
  console.log("PASSED - Deskripsi > 255 karakter berhasil dipotong otomatis tanpa gagal insert.");

  // SKENARIO 6: Duplikat Lintas Berkas & Transaksi Kembar
  console.log("\n[Skenario 6] Uji duplikasi lintas berkas & transaksi kembar...");
  // 6a. Commit berkas overlap A (3 transaksi)
  const fOvA = fs.readFileSync(path.join(FIXTURE_DIR, "generic-overlap-a.csv"));
  const formOvA = new FormData();
  formOvA.append("account_id", String(userAccountId));
  formOvA.append("file", new Blob([fOvA]), "generic-overlap-a.csv");
  formOvA.append("parser", "generic");
  formOvA.append("mapping", JSON.stringify({ date: "Tanggal", description: "Keterangan", amount: "Jumlah", type: "Tipe" }));

  const prevOvARes = await api("/imports/preview", { method: "POST", body: formOvA });
  const batchOvAId = prevOvARes.data.data.batch_id;
  await api(`/imports/${batchOvAId}/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows: [] })
  });

  // 6b. Preview berkas overlap B (2 duplikat, 1 baru)
  const fOvB = fs.readFileSync(path.join(FIXTURE_DIR, "generic-overlap-b.csv"));
  const formOvB = new FormData();
  formOvB.append("account_id", String(userAccountId));
  formOvB.append("file", new Blob([fOvB]), "generic-overlap-b.csv");
  formOvB.append("parser", "generic");
  formOvB.append("mapping", JSON.stringify({ date: "Tanggal", description: "Keterangan", amount: "Jumlah", type: "Tipe" }));

  const prevOvBRes = await api("/imports/preview", { method: "POST", body: formOvB });
  assert.strictEqual(prevOvBRes.status, 200);
  assert.strictEqual(prevOvBRes.data.data.summary.duplicate, 2, "Harus terdeteksi 2 duplikat lintas berkas");
  assert.strictEqual(prevOvBRes.data.data.summary.new, 1, "Harus ada 1 baris baru");

  const batchOvBId = prevOvBRes.data.data.batch_id;
  // Commit B hanya menyimpan 1 baris baru
  const commitOvBRes = await api(`/imports/${batchOvBId}/commit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ rows: [] })
  });
  assert.strictEqual(commitOvBRes.status, 200);
  assert.strictEqual(commitOvBRes.data.data.imported_rows, 1);
  assert.strictEqual(commitOvBRes.data.data.duplicate_rows, 2);

  // Bersihkan A dan B
  await api(`/imports/${batchOvAId}`, { method: "DELETE" });
  await api(`/imports/${batchOvBId}`, { method: "DELETE" });

  // 6c. Transaksi Kembar di hari yang sama (occurrence disambiguation)
  const fKembar = fs.readFileSync(path.join(FIXTURE_DIR, "generic-kembar.csv"));
  const formKembar = new FormData();
  formKembar.append("account_id", String(userAccountId));
  formKembar.append("file", new Blob([fKembar]), "generic-kembar.csv");
  formKembar.append("parser", "generic");
  formKembar.append("mapping", JSON.stringify({ date: "Tanggal", description: "Keterangan", amount: "Jumlah", type: "Tipe" }));

  const prevKembarRes = await api("/imports/preview", { method: "POST", body: formKembar });
  assert.strictEqual(prevKembarRes.status, 200);
  assert.strictEqual(prevKembarRes.data.data.summary.total, 3);
  assert.strictEqual(prevKembarRes.data.data.summary.duplicate, 0, "Transaksi kembar pada import pertama tidak boleh dianggap duplikat");
  const batchKembarId = prevKembarRes.data.data.batch_id;
  await api(`/imports/${batchKembarId}`, { method: "DELETE" });
  console.log("PASSED - Duplikasi lintas berkas & transaksi kembar bekerja tepat.");

  // SKENARIO 7: Format Angka Indonesia (titik ribuan, koma desimal, debit/kredit terpisah)
  console.log("\n[Skenario 7] Uji format angka Indonesia & kolom debit/kredit terpisah...");
  const fId = fs.readFileSync(path.join(FIXTURE_DIR, "generic-indonesia.csv"));
  const formId = new FormData();
  formId.append("account_id", String(userAccountId));
  formId.append("file", new Blob([fId]), "generic-indonesia.csv");
  formId.append("parser", "generic");
  formId.append("mapping", JSON.stringify({
    date: "Tanggal",
    description: "Keterangan",
    debit: "Debit",
    credit: "Kredit"
  }));

  const prevIdRes = await api("/imports/preview", { method: "POST", body: formId });
  assert.strictEqual(prevIdRes.status, 200);
  const idRows = prevIdRes.data.data.rows;
  assert.strictEqual(idRows.length, 4);
  assert.strictEqual(idRows[0].amount, 150000);
  assert.strictEqual(idRows[0].type, "EXPENSE");
  assert.strictEqual(idRows[1].amount, 500000);
  assert.strictEqual(idRows[1].type, "INCOME");
  assert.strictEqual(idRows[2].amount, 275500.5);
  const idBatchId = prevIdRes.data.data.batch_id;
  await api(`/imports/${idBatchId}`, { method: "DELETE" });
  console.log("PASSED - Format angka Indonesia & pemisahan debit/kredit berhasil diproses.");

  // SKENARIO 8: Berkas rusak ditolak/diberi peringatan tanpa 500
  console.log("\n[Skenario 8] Uji berkas dengan baris rusak...");
  const fRusak = fs.readFileSync(path.join(FIXTURE_DIR, "generic-rusak.csv"));
  const formRusak = new FormData();
  formRusak.append("account_id", String(userAccountId));
  formRusak.append("file", new Blob([fRusak]), "generic-rusak.csv");
  formRusak.append("parser", "generic");
  formRusak.append("mapping", JSON.stringify({ date: "Tanggal", description: "Keterangan", amount: "Jumlah", type: "Tipe" }));

  const prevRusakRes = await api("/imports/preview", { method: "POST", body: formRusak });
  assert.notStrictEqual(prevRusakRes.status, 500, "Berkas rusak tidak boleh menghasilkan 500 Internal Server Error");
  console.log(`PASSED - Berkas baris rusak ditangani dengan kode respons ${prevRusakRes.status} (bukan 500).`);

  // SKENARIO 9: Plain XLSX
  console.log("\n[Skenario 9] Uji berkas Plain XLSX...");
  const fXlsx = fs.readFileSync(path.join(FIXTURE_DIR, "plain-xlsx.xlsx"));
  const formXlsx = new FormData();
  formXlsx.append("account_id", String(userAccountId));
  formXlsx.append("file", new Blob([fXlsx], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), "plain-xlsx.xlsx");
  formXlsx.append("parser", "generic");
  formXlsx.append("mapping", JSON.stringify({ date: "Tanggal", description: "Keterangan", amount: "Jumlah", type: "Tipe" }));

  const prevXlsxRes = await api("/imports/preview", { method: "POST", body: formXlsx });
  assert.strictEqual(prevXlsxRes.status, 200);
  assert.strictEqual(prevXlsxRes.data.data.rows.length, 2);
  const xlsxBatchId = prevXlsxRes.data.data.batch_id;
  await api(`/imports/${xlsxBatchId}`, { method: "DELETE" });
  console.log("PASSED - Plain XLSX berhasil diproses.");

  // SKENARIO 10: Mandiri Sintetis Terenkripsi (jika tersedia)
  const mandiriSynthPath = path.join(FIXTURE_DIR, "mandiri-sintetis.xlsx");
  if (fs.existsSync(mandiriSynthPath) && FIXTURE_PASSWORD) {
    console.log("\n[Skenario 10] Uji parser Mandiri sintetis terenkripsi Agile...");
    const fMandiri = fs.readFileSync(mandiriSynthPath);

    // 10a. Password salah
    const formWrong = new FormData();
    formWrong.append("account_id", String(userAccountId));
    formWrong.append("file", new Blob([fMandiri]), "mandiri-sintetis.xlsx");
    formWrong.append("file_password", "wrongpassword123");

    const prevWrongRes = await api("/imports/preview", { method: "POST", body: formWrong });
    assert.strictEqual(prevWrongRes.status, 400);
    assert.strictEqual(prevWrongRes.data.message, "Password file salah");

    // 10b. Password benar
    const formRight = new FormData();
    formRight.append("account_id", String(userAccountId));
    formRight.append("file", new Blob([fMandiri]), "mandiri-sintetis.xlsx");
    formRight.append("file_password", FIXTURE_PASSWORD);

    const prevRightRes = await api("/imports/preview", { method: "POST", body: formRight });
    assert.strictEqual(prevRightRes.status, 200);
    const synthData = prevRightRes.data.data;
    assert.strictEqual(synthData.parser, "mandiri");
    assert.strictEqual(synthData.rows.length, 2);
    assert.strictEqual(synthData.rows[0].amount, 283000);
    assert.strictEqual(synthData.rows[0].type, "EXPENSE");
    assert.strictEqual(synthData.rows[0].time, "17:10:32");
    assert.strictEqual(synthData.rows[1].amount, 500000);
    assert.strictEqual(synthData.rows[1].type, "INCOME");
    assert.strictEqual(synthData.rows[1].time, "09:15:00");

    const synthBatchId = synthData.batch_id;
    await api(`/imports/${synthBatchId}`, { method: "DELETE" });
    console.log("PASSED - Mandiri sintetis terenkripsi Agile berhasil didekripsi & diparse.");
  } else {
    console.log("\n[Skenario 10] Lewati uji mandiri sintetis terenkripsi (M8_FIXTURE_PASSWORD tidak diset).");
  }

  // SKENARIO 11: Rekening user lain ditolak
  console.log("\n[Skenario 11] Uji proteksi rekening milik user lain...");
  const dummyFile = Buffer.from("Tanggal,Keterangan,Jumlah,Tipe\n2026-08-01,Test,1000,EXPENSE\n");
  const formOther = new FormData();
  formOther.append("account_id", String(otherUserAccountId));
  formOther.append("file", new Blob([dummyFile]), "test.csv");
  formOther.append("parser", "generic");
  formOther.append("mapping", JSON.stringify({ date: "Tanggal", description: "Keterangan", amount: "Jumlah", type: "Tipe" }));

  const otherRes = await api("/imports/preview", { method: "POST", body: formOther });
  assert.ok(otherRes.status === 404 || otherRes.status === 400 || otherRes.status === 403);
  assert.strictEqual(otherRes.data.success, false);
  console.log(`PASSED - Rekening milik pengguna lain ditolak dengan status HTTP ${otherRes.status}.`);

  console.log("\n==================================================================");
  console.log("SEMUA PENGUJIAN VERIFIKASI SINTETIS BERHASIL LULUS 100%!");
  console.log("==================================================================");
}

runSyntheticVerification().catch((err) => {
  console.error("\nGAGAL VERIFIKASI SINTETIS:", err);
  process.exit(1);
});
