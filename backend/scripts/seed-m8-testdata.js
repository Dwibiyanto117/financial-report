/**
 * Seed M8 Synthetic Test Data Generator
 *
 * Menghasilkan:
 * 1. User uji: m8test2@example.com (password dari process.env.M8_TEST_PASSWORD)
 * 2. 2 Rekening uji:
 *    - "Uji Bank Mandiri Fiktif" (BANK, saldo awal 5.000.000)
 *    - "Uji Dompet Fiktif" (EWALLET, saldo awal 1.000.000)
 * 3. 9 Berkas uji sintetis di os.tmpdir()/finreport-m8-fixtures/:
 *    - generic-normal.csv (30 baris)
 *    - generic-indonesia.csv (format 1.234.567,00, debit/kredit terpisah)
 *    - generic-overlap-a.csv & generic-overlap-b.csv (tumpang tindih untuk uji duplikasi)
 *    - generic-kembar.csv (transaksi identik pada hari sama, beda urutan kemunculan)
 *    - generic-formula.csv (sel deskripsi berawalan =, +, -, @)
 *    - generic-deskripsi-panjang.csv (deskripsi > 255 karakter)
 *    - generic-2000.csv (tepat 2000 baris)
 *    - generic-2001.csv (2001 baris, harus ditolak)
 *    - generic-rusak.csv (tanggal invalid & nominal non-angka)
 *    - plain-xlsx.xlsx (format XLSX generic)
 *    - mandiri-sintetis.xlsx (format e-Statement Mandiri terenkripsi Agile ECMA-376 via officecrypto-tool)
 *
 * Mendukung opsi CLI:
 *   node backend/scripts/seed-m8-testdata.js --clean
 */

import fs from "fs";
import path from "path";
import os from "os";
import bcrypt from "bcryptjs";
import ExcelJS from "exceljs";
import officecrypto from "officecrypto-tool";
import PdfPrinter from "pdfmake";
import prisma from "../src/config/prisma.js";

const pdfFonts = {
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique"
  }
};
const pdfPrinter = new PdfPrinter(pdfFonts);

function createPdfBuffer(docDefinition, options = {}) {
  return new Promise((resolve, reject) => {
    const doc = pdfPrinter.createPdfKitDocument(docDefinition, options);
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (err) => reject(err));
    doc.end();
  });
}

const TEST_EMAIL = process.env.M8_TEST_EMAIL || "m8test2@example.com";
const TEST_PASSWORD = process.env.M8_TEST_PASSWORD;
const FIXTURE_PASSWORD = process.env.M8_FIXTURE_PASSWORD;

export const FIXTURE_DIR = path.join(os.tmpdir(), "finreport-m8-fixtures");

async function cleanTestData() {
  console.log(`Membersihkan data user uji ${TEST_EMAIL}...`);
  const user = await prisma.user.findUnique({
    where: { email: TEST_EMAIL }
  });

  if (!user) {
    console.log(`User ${TEST_EMAIL} tidak ditemukan. Tidak ada data yang dibersihkan.`);
    return;
  }

  const uId = user.id;
  await prisma.$transaction(async (tx) => {
    await tx.transaction.deleteMany({ where: { userId: uId } });
    await tx.importBatch.deleteMany({ where: { userId: uId } });
    await tx.categoryRule.deleteMany({ where: { userId: uId } });
    await tx.category.deleteMany({ where: { userId: uId } });
    await tx.account.deleteMany({ where: { userId: uId } });
    await tx.user.delete({ where: { id: uId } });
  });

  console.log(`Data user ${TEST_EMAIL} berhasil dibersihkan sepenuhnya.`);

  // Bersihkan folder fixtures jika ada
  if (fs.existsSync(FIXTURE_DIR)) {
    fs.rmSync(FIXTURE_DIR, { recursive: true, force: true });
    console.log(`Folder fixtures sementara ${FIXTURE_DIR} dibersihkan.`);
  }
}

async function seedUserAndAccounts() {
  if (!TEST_PASSWORD) {
    console.error("ERROR: M8_TEST_PASSWORD wajib diset di environment!");
    process.exit(1);
  }

  console.log(`Membuat / memastikan user uji ${TEST_EMAIL}...`);
  let user = await prisma.user.findUnique({
    where: { email: TEST_EMAIL },
    include: { accounts: true }
  });

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: TEST_EMAIL,
        passwordHash,
        name: "Akun Uji Sintetis M8"
      },
      include: { accounts: true }
    });
    console.log(`User ${TEST_EMAIL} berhasil dibuat (ID: ${user.id}).`);
  }

  // Pastikan 2 rekening uji tersedia
  let accBank = user.accounts.find((a) => a.name === "Uji Bank Mandiri Fiktif");
  if (!accBank) {
    accBank = await prisma.account.create({
      data: {
        userId: user.id,
        name: "Uji Bank Mandiri Fiktif",
        type: "BANK",
        institution: "MANDIRI",
        openingBalance: 5000000,
        color: "#1d4ed8",
        accountNoMasked: "...1234"
      }
    });
    console.log(`Rekening bank dibuat (ID: ${accBank.id}).`);
  }

  let accWallet = user.accounts.find((a) => a.name === "Uji Dompet Fiktif");
  if (!accWallet) {
    accWallet = await prisma.account.create({
      data: {
        userId: user.id,
        name: "Uji Dompet Fiktif",
        type: "EWALLET",
        institution: "LAINNYA",
        openingBalance: 1000000,
        color: "#10b981",
        accountNoMasked: null
      }
    });
    console.log(`Rekening wallet dibuat (ID: ${accWallet.id}).`);
  }

  return { user, accBank, accWallet };
}

async function generateFixtures() {
  if (!fs.existsSync(FIXTURE_DIR)) {
    fs.mkdirSync(FIXTURE_DIR, { recursive: true });
  }

  console.log(`Menghasilkan berkas fixtures di: ${FIXTURE_DIR}`);

  // 1. generic-normal.csv (30 baris)
  let normalCsv = "Tanggal,Keterangan,Jumlah,Tipe\n";
  for (let i = 1; i <= 30; i++) {
    const day = String(i).padStart(2, "0");
    const type = i % 4 === 0 ? "INCOME" : "EXPENSE";
    const amount = (i * 25000).toFixed(0);
    normalCsv += `2026-08-${day},Transaksi Normal ${i},${amount},${type}\n`;
  }
  fs.writeFileSync(path.join(FIXTURE_DIR, "generic-normal.csv"), normalCsv, "utf8");

  // 2. generic-indonesia.csv (format 1.234.567,00, debit/kredit terpisah, tanggal 01 Agu 2026)
  let idCsv = "Tanggal;Keterangan;Debit;Kredit\n";
  idCsv += "01 Agu 2026;Pembelian Barang Toko;150.000,00;\n";
  idCsv += "02 Agu 2026;Penerimaan Transfer Teman;;500.000,00\n";
  idCsv += "03 Agu 2026;Biaya Listrik Kantor;275.500,50;\n";
  idCsv += "04 Agu 2026;Gaji Bulanan;;2.500.000,00\n";
  fs.writeFileSync(path.join(FIXTURE_DIR, "generic-indonesia.csv"), idCsv, "utf8");

  // 3. generic-overlap-a.csv & generic-overlap-b.csv
  let overlapA = "Tanggal,Keterangan,Jumlah,Tipe\n";
  overlapA += "2026-08-10,Kopi Sore,25000,EXPENSE\n";
  overlapA += "2026-08-11,Makan Siang,45000,EXPENSE\n";
  overlapA += "2026-08-12,Bensin Motor,30000,EXPENSE\n";
  fs.writeFileSync(path.join(FIXTURE_DIR, "generic-overlap-a.csv"), overlapA, "utf8");

  let overlapB = "Tanggal,Keterangan,Jumlah,Tipe\n";
  overlapB += "2026-08-11,Makan Siang,45000,EXPENSE\n"; // DUPLIKAT
  overlapB += "2026-08-12,Bensin Motor,30000,EXPENSE\n"; // DUPLIKAT
  overlapB += "2026-08-13,Belanja Mingguan,150000,EXPENSE\n"; // BARU
  fs.writeFileSync(path.join(FIXTURE_DIR, "generic-overlap-b.csv"), overlapB, "utf8");

  // 4. generic-kembar.csv (dua transaksi identik di hari yang sama, beda urutan/occurrence)
  let kembarCsv = "Tanggal,Keterangan,Jumlah,Tipe\n";
  kembarCsv += "2026-08-15,Parkir Mall,5000,EXPENSE\n";
  kembarCsv += "2026-08-15,Parkir Mall,5000,EXPENSE\n"; // Identik tapi baris ke-2 (occurrence 1 vs 2)
  kembarCsv += "2026-08-15,Parkir Mall,5000,EXPENSE\n"; // Identik baris ke-3
  fs.writeFileSync(path.join(FIXTURE_DIR, "generic-kembar.csv"), kembarCsv, "utf8");

  // 5. generic-formula.csv (sel berbahaya diawali =, +, -, @)
  let formulaCsv = "Tanggal,Keterangan,Jumlah,Tipe\n";
  formulaCsv += "2026-08-16,=CMD|' /C calc'!A0,10000,EXPENSE\n";
  formulaCsv += "2026-08-16,+1234567890 Formula Plus,20000,EXPENSE\n";
  formulaCsv += "2026-08-16,-Minus Formula,30000,EXPENSE\n";
  formulaCsv += "2026-08-16,@SUM(1,2) At Formula,40000,EXPENSE\n";
  fs.writeFileSync(path.join(FIXTURE_DIR, "generic-formula.csv"), formulaCsv, "utf8");

  // 6. generic-deskripsi-panjang.csv (> 255 karakter)
  const superLongDesc = "A".repeat(400);
  let longCsv = "Tanggal,Keterangan,Jumlah,Tipe\n";
  longCsv += `2026-08-17,Deskripsi Panjang ${superLongDesc},75000,EXPENSE\n`;
  fs.writeFileSync(path.join(FIXTURE_DIR, "generic-deskripsi-panjang.csv"), longCsv, "utf8");

  // 7. generic-2000.csv dan generic-2001.csv
  let csv2000 = "Tanggal,Keterangan,Jumlah,Tipe\n";
  for (let i = 1; i <= 2000; i++) {
    csv2000 += `2026-08-18,Bulk Tx ${i},1000,EXPENSE\n`;
  }
  fs.writeFileSync(path.join(FIXTURE_DIR, "generic-2000.csv"), csv2000, "utf8");

  let csv2001 = "Tanggal,Keterangan,Jumlah,Tipe\n";
  for (let i = 1; i <= 2001; i++) {
    csv2001 += `2026-08-18,Bulk Tx ${i},1000,EXPENSE\n`;
  }
  fs.writeFileSync(path.join(FIXTURE_DIR, "generic-2001.csv"), csv2001, "utf8");

  // 8. generic-rusak.csv (tanggal rusak, nominal non-angka)
  let rusakCsv = "Tanggal,Keterangan,Jumlah,Tipe\n";
  rusakCsv += "BukanTanggal,Pembelian Barang,50000,EXPENSE\n";
  rusakCsv += "2026-08-19,Pembelian Lain,BukanNominal,EXPENSE\n";
  fs.writeFileSync(path.join(FIXTURE_DIR, "generic-rusak.csv"), rusakCsv, "utf8");

  // 9. plain-xlsx.xlsx
  const plainWb = new ExcelJS.Workbook();
  const plainWs = plainWb.addWorksheet("Mutasi");
  plainWs.addRow(["Tanggal", "Keterangan", "Jumlah", "Tipe"]);
  plainWs.addRow(["2026-08-20", "Beli ATK Sintetis", "45000", "EXPENSE"]);
  plainWs.addRow(["2026-08-21", "Bonus Penjualan Sintetis", "150000", "INCOME"]);
  const plainBuf = await plainWb.xlsx.writeBuffer();
  fs.writeFileSync(path.join(FIXTURE_DIR, "plain-xlsx.xlsx"), Buffer.from(plainBuf));

  // 10. mandiri-sintetis.xlsx (meniru struktur e-Statement Mandiri, dienkripsi Agile)
  if (FIXTURE_PASSWORD) {
    const mandiriWb = new ExcelJS.Workbook();
    const mandiriWs = mandiriWb.addWorksheet("e-Statement");

    // Header metadata Bank Mandiri fiktif
    mandiriWs.addRow(["PT BANK MANDIRI (PERSERO) TBK."]);
    mandiriWs.addRow(["e-Statement Rekening Mandiri Tabungan"]);
    mandiriWs.addRow([]);
    mandiriWs.addRow(["Nama Nasabah", "", "", "", "", "", "NASABAH UJI SINTETIS", "", "", "", "", "Nomor Rekening", "", "XXXXXXXXX1234"]);
    mandiriWs.addRow(["Periode", "", "", "", "", "", "01 Agu 2026 - 31 Agu 2026", "", "", "", "", "Mata Uang", "", "IDR"]);
    mandiriWs.addRow([]);
    mandiriWs.addRow(["Saldo Awal", "", "", "", "", "", "3.000.000,00", "", "", "", "", "Dana Masuk", "", "500.000,00"]);
    mandiriWs.addRow(["Dana Keluar", "", "", "", "", "", "283.000,00", "", "", "", "", "Saldo Akhir", "", "3.217.000,00"]);
    mandiriWs.addRow([]);

    // Baris header tabel transaksi (dua baris: Indonesia dan Inggris)
    // Kolom: Tanggal (A), Keterangan (D), Dana Keluar (G), Dana Masuk (J), Saldo (M)
    mandiriWs.addRow([
      "Tanggal", "", "", "Keterangan", "", "", "Dana Keluar", "", "", "Dana Masuk", "", "", "Saldo"
    ]);
    mandiriWs.addRow([
      "Date", "", "", "Remarks", "", "", "Outgoing", "", "", "Incoming", "", "", "Balance"
    ]);

    // Transaksi 1: EXPENSE 283.000, Jam 17:10:32 WIB
    mandiriWs.addRow([
      "01/08/2026", "", "", "DEBIT BELANJA GROSIR SINTETIS", "", "", "283.000,00", "", "", "", "", "", "2.717.000,00"
    ]);
    mandiriWs.addRow([
      "17:10:32 WIB", "", "", "REF: 999888111", "", "", "", "", "", "", "", "", ""
    ]);

    // Transaksi 2: INCOME 500.000, Jam 09:15:00 WIB
    mandiriWs.addRow([
      "05/08/2026", "", "", "TRANSFER MASUK REKAN SINTETIS", "", "", "", "", "", "500.000,00", "", "", "3.217.000,00"
    ]);
    mandiriWs.addRow([
      "09:15:00 WIB", "", "", "REF: 111222333", "", "", "", "", "", "", "", "", ""
    ]);

    // Footer
    mandiriWs.addRow([]);
    mandiriWs.addRow(["PT BANK MANDIRI (PERSERO) TBK. BERIZIN DAN DIAWASI OLEH OTORITAS JASA KEUANGAN"]);

    const mandiriBuf = await mandiriWb.xlsx.writeBuffer();
    const encryptedBuf = await officecrypto.encrypt(Buffer.from(mandiriBuf), {
      password: FIXTURE_PASSWORD
    });
    fs.writeFileSync(path.join(FIXTURE_DIR, "mandiri-sintetis.xlsx"), encryptedBuf);
    console.log(`mandiri-sintetis.xlsx berhasil dibuat dan dienkripsi.`);
  } else {
    console.log("INFO: M8_FIXTURE_PASSWORD tidak diset, melewati pembuatan mandiri-sintetis.xlsx terenkripsi.");
  }

  // 11. Fixtures PDF Sintetis
  // 11a. pdf-single-page.pdf (1 halaman tabel)
  const singlePdfBuf = await createPdfBuffer({
    defaultStyle: { font: "Helvetica", fontSize: 9 },
    content: [
      { text: "LAPORAN MUTASI REKENING (SINTETIS)", bold: true, fontSize: 12, margin: [0, 0, 0, 10] },
      {
        table: {
          widths: [70, 180, 80, 50],
          body: [
            ["Tanggal", "Keterangan", "Nominal", "Tipe"],
            ["2026-08-01", "Gaji Pokok Agustus", "10000000", "CR"],
            ["2026-08-02", "Belanja Supermarket", "450000", "DB"],
            ["2026-08-03", "Pembayaran Listrik PLN", "250000", "DB"],
            ["2026-08-04", "Transfer Masuk Teman", "500000", "CR"]
          ]
        }
      }
    ]
  });
  fs.writeFileSync(path.join(FIXTURE_DIR, "pdf-single-page.pdf"), singlePdfBuf);

  // 11b. pdf-multi-page.pdf (Banyak halaman dengan header tabel berulang)
  const multiPageRows = [["Tanggal", "Keterangan", "Nominal", "Tipe"]];
  for (let i = 1; i <= 80; i++) {
    multiPageRows.push([
      `2026-08-${String((i % 28) + 1).padStart(2, "0")}`,
      `Transaksi Multi Page #${i}`,
      `${10000 * i}`,
      i % 2 === 0 ? "CR" : "DB"
    ]);
  }
  const multiPdfBuf = await createPdfBuffer({
    defaultStyle: { font: "Helvetica", fontSize: 9 },
    content: [
      { text: "MUTASI TRANSAKSI PANJANG", bold: true, fontSize: 12, margin: [0, 0, 0, 10] },
      {
        table: {
          headerRows: 1,
          widths: [70, 180, 80, 50],
          body: multiPageRows
        }
      }
    ]
  });
  fs.writeFileSync(path.join(FIXTURE_DIR, "pdf-multi-page.pdf"), multiPdfBuf);

  // 11c. pdf-multiline-desc.pdf (Deskripsi multi-baris)
  const multilinePdfBuf = await createPdfBuffer({
    defaultStyle: { font: "Helvetica", fontSize: 9 },
    content: [
      { text: "MUTASI DENGAN DESKRIPSI MULTI-BARIS", bold: true, fontSize: 12, margin: [0, 0, 0, 10] },
      {
        table: {
          widths: [70, 200, 80, 50],
          body: [
            ["Tanggal", "Keterangan", "Nominal", "Tipe"],
            ["2026-08-01", "DEBIT PEMBELIAN GROSIR\nREF: TRX-998811\nTERMINAL: EDC-102", "750000", "DB"],
            ["2026-08-02", "TRANSFER MASUK\nDARI PT SINTETIS JAYA\nBERITA: BONUS PROYEK", "2500000", "CR"]
          ]
        }
      }
    ]
  });
  fs.writeFileSync(path.join(FIXTURE_DIR, "pdf-multiline-desc.pdf"), multilinePdfBuf);

  // 11d. pdf-debit-credit.pdf (Kolom Debit, Kredit, Saldo terpisah)
  const debitCreditPdfBuf = await createPdfBuffer({
    defaultStyle: { font: "Helvetica", fontSize: 9 },
    content: [
      { text: "MUTASI DENGAN KOLOM DEBIT KREDIT", bold: true, fontSize: 12, margin: [0, 0, 0, 10] },
      {
        table: {
          widths: [65, 140, 75, 75, 75],
          body: [
            ["Tanggal", "Keterangan", "Debit", "Kredit", "Saldo"],
            ["2026-08-01", "Setoran Awal", "-", "5000000", "5000000"],
            ["2026-08-02", "Tarik Tunai ATM", "200000", "-", "4800000"],
            ["2026-08-03", "Bunga Tabungan", "-", "15000", "4815000"]
          ]
        }
      }
    ]
  });
  fs.writeFileSync(path.join(FIXTURE_DIR, "pdf-debit-credit.pdf"), debitCreditPdfBuf);

  // 11e. pdf-scanned-no-text.pdf (PDF gambar tanpa teks)
  const transparentPngBase64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  const scannedPdfBuf = await createPdfBuffer({
    content: [
      { image: transparentPngBase64, width: 250, height: 250 }
    ]
  });
  fs.writeFileSync(path.join(FIXTURE_DIR, "pdf-scanned-no-text.pdf"), scannedPdfBuf);

  // 11f. pdf-51-pages.pdf (51 halaman, melebihi batas 50 halaman)
  const p51Content = [];
  for (let i = 1; i <= 51; i++) {
    p51Content.push({ text: `Halaman ${i}`, pageBreak: i < 51 ? "after" : undefined });
  }
  const p51PdfBuf = await createPdfBuffer({
    defaultStyle: { font: "Helvetica", fontSize: 10 },
    content: p51Content
  });
  fs.writeFileSync(path.join(FIXTURE_DIR, "pdf-51-pages.pdf"), p51PdfBuf);

  // 11g. pdf-encrypted.pdf (PDF berpassword)
  if (FIXTURE_PASSWORD) {
    const encPdfBuf = await createPdfBuffer({
      defaultStyle: { font: "Helvetica", fontSize: 9 },
      userPassword: FIXTURE_PASSWORD,
      content: [
        { text: "MUTASI PDF TERENKRIPSI SINTETIS", bold: true, fontSize: 12, margin: [0, 0, 0, 10] },
        {
          table: {
            widths: [70, 180, 80, 50],
            body: [
              ["Tanggal", "Keterangan", "Nominal", "Tipe"],
              ["2026-08-01", "Transaksi Rahasia Encrypted", "1250000", "DB"]
            ]
          }
        }
      ]
    });
    fs.writeFileSync(path.join(FIXTURE_DIR, "pdf-encrypted.pdf"), encPdfBuf);
    console.log("pdf-encrypted.pdf berhasil dibuat dan dienkripsi.");
  }

  console.log("Semua berkas fixtures sintetis berhasil dibuat.");
}

async function main() {
  const isClean = process.argv.includes("--clean");
  if (isClean) {
    await cleanTestData();
    process.exit(0);
  }

  await seedUserAndAccounts();
  await generateFixtures();
  console.log("Seeding data uji sintetis M8 selesai!");
}

main()
  .catch((err) => {
    console.error("Gagal menjalankan seed-m8-testdata:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
