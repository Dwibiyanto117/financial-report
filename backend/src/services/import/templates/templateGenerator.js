/**
 * Generator Berkas Template Standar FinReport
 *
 * Menghasilkan template XLSX atau CSV standar di dalam memori tanpa menulis berkas ke disk.
 */

import ExcelJS from "exceljs";
import { getBankTemplate } from "./bankTemplates.js";

const TEMPLATE_HEADERS = [
  "Tanggal",
  "Waktu",
  "Keterangan",
  "Jenis",
  "Nominal",
  "Saldo",
  "Kategori"
];

/**
 * Menghasilkan buffer berkas template XLSX standar FinReport.
 *
 * @param {string} bankCode
 * @returns {Promise<{ buffer: Buffer, fileName: string, contentType: string }>}
 */
export async function generateXlsxTemplate(bankCode) {
  const bankConfig = getBankTemplate(bankCode);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FinReport";
  workbook.created = new Date();

  // 1. Sheet Mutasi
  const wsMutasi = workbook.addWorksheet("Mutasi", {
    views: [{ state: "frozen", ySplit: 1 }]
  });

  wsMutasi.columns = [
    { header: "Tanggal", key: "date", width: 14 },
    { header: "Waktu", key: "time", width: 12 },
    { header: "Keterangan", key: "description", width: 35 },
    { header: "Jenis", key: "type", width: 12 },
    { header: "Nominal", key: "amount", width: 18 },
    { header: "Saldo", key: "balance", width: 18 },
    { header: "Kategori", key: "category", width: 22 }
  ];

  // Styling Header Mutasi
  const headerRow = wsMutasi.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1D4ED8" } // Blue primary
  };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = 24;

  // Format kolom & Data Validation pada kolom Jenis (baris 2-2001)
  for (let r = 2; r <= 2001; r++) {
    const row = wsMutasi.getRow(r);
    // Kolom Tanggal: format Date
    row.getCell(1).numFmt = "dd/mm/yyyy";
    // Kolom Waktu: format Text/Time
    row.getCell(2).numFmt = "@";
    // Kolom Jenis: Dropdown validation
    row.getCell(4).dataValidation = {
      type: "list",
      allowBlank: true,
      formulae: ['"MASUK,KELUAR"']
    };
    // Kolom Nominal & Saldo: Format Currency / Decimal
    row.getCell(5).numFmt = "#,##0.00";
    row.getCell(6).numFmt = "#,##0.00";
  }

  // 2. Sheet Info (Metadata)
  const wsInfo = workbook.addWorksheet("Info");
  wsInfo.columns = [
    { header: "Parameter", key: "param", width: 30 },
    { header: "Nilai", key: "val", width: 30 }
  ];
  wsInfo.addRow(["Template", "FINREPORT-IMPORT-V1"]);
  wsInfo.addRow(["Bank", bankConfig.code]);
  wsInfo.addRow(["4 digit akhir rekening (opsional)", ""]);

  // 3. Sheet Petunjuk
  const wsPetunjuk = workbook.addWorksheet("Petunjuk");
  wsPetunjuk.columns = [
    { header: "No", key: "no", width: 6 },
    { header: "Petunjuk & Panduan Penggunaan", key: "guide", width: 80 }
  ];

  wsPetunjuk.addRow([1, "Salin data mutasi Anda dari e-statement/m-banking ke lembar kerja 'Mutasi' pada kolom yang sesuai."]);
  wsPetunjuk.addRow([2, "Format ini dipakai bersama oleh semua bank; salin data mutasi Anda ke kolom yang sesuai."]);
  wsPetunjuk.addRow([3, "Jangan mengubah nama atau urutan header pada baris pertama lembar 'Mutasi'."]);
  wsPetunjuk.addRow([4, "Jangan menghapus atau mengubah lembar 'Info' agar template dapat dikenali otomatis."]);
  wsPetunjuk.addRow([5, "Kolom Wajib: Tanggal, Keterangan, Jenis, Nominal."]);
  wsPetunjuk.addRow([6, "Kolom Opsional: Waktu (HH:mm:ss), Saldo (nominal), Kategori (nama kategori keuangan)."]);
  wsPetunjuk.addRow([7, "Nilai kolom 'Jenis' yang diterima: MASUK, KREDIT, CR, IN, INCOME (untuk pemasukan) atau KELUAR, DEBIT, DB, OUT, EXPENSE (untuk pengeluaran)."]);
  wsPetunjuk.addRow([8, "Batas berkas maksimum: 2.000 baris transaksi dan ukuran berkas maksimal 5 MB."]);
  wsPetunjuk.addRow([9, "Catatan Privasi: Berkas diproses sepenuhnya di dalam memori server tanpa disimpan ke media penyimpanan permanen."]);
  wsPetunjuk.addRow([]);
  wsPetunjuk.addRow(["Contoh", "Data Fiktif Transaksi (Hanya Contoh Panduan, Jangan Tulis di Sini):"]);
  wsPetunjuk.addRow(["-", "01/08/2026 | 09:15:00 | Gaji Bulanan Kantor | MASUK | 5000000.00 | 5000000.00 | Gaji"]);
  wsPetunjuk.addRow(["-", "02/08/2026 | 12:30:15 | Makan Siang Bersama | KELUAR | 35000.00 | 4965000.00 | Makanan & Minuman"]);
  wsPetunjuk.addRow(["-", "03/08/2026 | 17:45:00 | Pembelian Token Listrik | KELUAR | 100000.00 | 4865000.00 | Tagihan & Utilitas"]);

  const buffer = await workbook.xlsx.writeBuffer();
  const fileName = `finreport-template-${bankConfig.code.toLowerCase()}.xlsx`;

  return {
    buffer: Buffer.from(buffer),
    fileName,
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  };
}

/**
 * Menghasilkan buffer berkas template CSV standar FinReport.
 *
 * @param {string} bankCode
 * @returns {{ buffer: Buffer, fileName: string, contentType: string }}
 */
export function generateCsvTemplate(bankCode) {
  const bankConfig = getBankTemplate(bankCode);
  const csvContent = `${TEMPLATE_HEADERS.join(",")}\n`;
  const fileName = `finreport-template-${bankConfig.code.toLowerCase()}.csv`;

  return {
    buffer: Buffer.from(csvContent, "utf8"),
    fileName,
    contentType: "text/csv; charset=utf-8"
  };
}
