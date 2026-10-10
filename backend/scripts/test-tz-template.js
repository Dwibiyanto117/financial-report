/**
 * Helper Skrip Uji Invariansi Zona Waktu & Waktu Template FinReport
 *
 * Dijalankan sebagai proses anak dengan berbagai variabel lingkungan TZ
 * (UTC, Asia/Jakarta, America/Los_Angeles, Pacific/Kiritimati).
 */

import ExcelJS from "exceljs";
import { readFileBuffer } from "../src/services/import/parsers/reader.js";
import { parse as parseTemplateGrid } from "../src/services/import/parsers/template.js";

async function run() {
  const wb = new ExcelJS.Workbook();
  const wsMut = wb.addWorksheet("Mutasi");
  wsMut.addRow(["Tanggal", "Waktu", "Keterangan", "Jenis", "Nominal", "Saldo", "Kategori"]);

  // Baris 1: Date object UTC + Date object time (1899 UTC)
  wsMut.addRow([
    new Date(Date.UTC(2026, 7, 15, 0, 0, 0)),
    new Date(Date.UTC(1899, 11, 30, 9, 30, 0)),
    "Uji Tanggal Date UTC",
    "MASUK",
    100000,
    100000,
    ""
  ]);

  // Baris 2: Tanggal teks format dd/mm/yyyy + Waktu teks "14:15"
  wsMut.addRow(["16/08/2026", "14:15", "Uji Tanggal DD/MM/YYYY", "CR", 50000, 150000, ""]);

  // Baris 3: Tanggal teks ISO YYYY-MM-DD + Waktu teks "08:45:10"
  wsMut.addRow(["2026-08-17", "08:45:10", "Uji Tanggal ISO", "KELUAR", 25000, 125000, ""]);

  // Baris 4: Tanggal valid + Waktu string tidak valid (menghasilkan peringatan per baris)
  wsMut.addRow(["2026-08-18", "bukan_waktu_valid", "Uji Waktu Rusak", "KELUAR", 10000, 115000, ""]);

  const wsInfo = wb.addWorksheet("Info");
  wsInfo.addRow(["Template", "FINREPORT-IMPORT-V1"]);
  wsInfo.addRow(["Bank", "MANDIRI"]);

  const buf = await wb.xlsx.writeBuffer();

  const fileRes = await readFileBuffer({
    buffer: Buffer.from(buf),
    fileName: "tz-test.xlsx"
  });

  const parsed = parseTemplateGrid({
    grid: fileRes.grid,
    sheets: fileRes.sheets,
    fileName: "tz-test.xlsx"
  });

  const serializedRows = parsed.rows.map((r) => ({
    index: r.index,
    date: r.date instanceof Date ? r.date.toISOString().slice(0, 10) : String(r.date).slice(0, 10),
    time: r.time,
    description: r.description,
    type: r.type,
    amount: r.amount,
    balance: r.balance
  }));

  console.log(
    JSON.stringify({
      rows: serializedRows,
      warnings: parsed.warnings,
      summary: parsed.summary
    })
  );
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
