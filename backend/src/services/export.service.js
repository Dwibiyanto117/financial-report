import ExcelJS from "exceljs";
import PdfPrinter from "pdfmake";
import prisma from "../config/prisma.js";
import { parseDateRange, parseIntParam, getParam } from "../utils/query.js";

// Setup font standar untuk PDFMake
const fonts = {
  Helvetica: {
    normal: "Helvetica",
    bold: "Helvetica-Bold",
    italics: "Helvetica-Oblique",
    bolditalics: "Helvetica-BoldOblique"
  }
};

const printer = new PdfPrinter(fonts);

/**
 * Filter tanggal untuk laporan ekspor.
 * Menerima `start_date`/`startDate` dan `end_date`/`endDate`, dan menolak
 * nilai tak valid dengan pesan yang jelas alih-alih gagal di lapisan query.
 */
function buildReportDateFilter(query) {
  const { startDate, endDate } = parseDateRange(query);

  if (!startDate && !endDate) return {};

  const filter = {};
  if (startDate) filter.gte = startDate;
  if (endDate) filter.lte = endDate;
  return filter;
}

function formatTransactionType(type) {
  switch (type) {
    case "INCOME":
      return "Pemasukan";
    case "EXPENSE":
      return "Pengeluaran";
    case "TRANSFER_IN":
      return "Transfer Masuk";
    case "TRANSFER_OUT":
      return "Transfer Keluar";
    default:
      return type;
  }
}

export const generateExcelReport = async (userId, query = {}) => {
  const whereClause = { userId };
  const dateFilter = buildReportDateFilter(query);
  if (Object.keys(dateFilter).length > 0) {
    whereClause.transactionDate = dateFilter;
  }

  const accountId = parseIntParam(getParam(query, "accountId", "account_id"), "rekening", { strict: true, min: 1 });
  if (accountId !== null) {
    whereClause.accountId = accountId;
  }

  const [user, transactions, selectedAccount] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
    prisma.transaction.findMany({
      where: whereClause,
      orderBy: [{ transactionDate: "asc" }, { id: "asc" }],
      include: {
        account: {
          select: { name: true, institution: true }
        },
        category: {
          select: { name: true, type: true }
        }
      }
    }),
    accountId !== null ? prisma.account.findFirst({ where: { id: accountId, userId } }) : null
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "FinReport";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Laporan Keuangan", {
    views: [{ showGridLines: true }]
  });

  // Judul Laporan
  sheet.mergeCells("A1:G1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = "LAPORAN ARUS KAS PERSONAL (FINREPORT)";
  titleCell.font = { name: "Arial", size: 14, bold: true, color: { argb: "FF065F46" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };
  sheet.getRow(1).height = 25;

  // Metadata Pengguna
  sheet.getCell("A2").value = `Nama Pengguna: ${user ? user.name : "-"}`;
  sheet.getCell("A3").value = `Tanggal Cetak: ${new Date().toLocaleDateString("id-ID")}`;
  if (selectedAccount) {
    sheet.getCell("A4").value = `Rekening: ${selectedAccount.name} (${selectedAccount.institution})`;
  }
  if (query.startDate || query.endDate) {
    const periodRow = selectedAccount ? "A5" : "A4";
    sheet.getCell(periodRow).value = `Periode: ${query.startDate || "Awal"} s.d. ${query.endDate || "Sekarang"}`;
  }

  // Header Kolom Tabel
  const headerRowIndex = 7;
  const headers = ["No", "Tanggal", "Rekening", "Tipe", "Kategori", "Nominal (IDR)", "Keterangan"];
  sheet.getRow(headerRowIndex).values = headers;
  sheet.getRow(headerRowIndex).height = 22;

  sheet.columns = [
    { key: "no", width: 6 },
    { key: "date", width: 14 },
    { key: "account", width: 18 },
    { key: "type", width: 16 },
    { key: "category", width: 22 },
    { key: "amount", width: 18 },
    { key: "description", width: 35 }
  ];

  const headerRow = sheet.getRow(headerRowIndex);
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF059669" }
    };
    cell.font = { name: "Arial", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  });

  let totalIncome = 0;
  let totalExpense = 0;
  let currentRow = headerRowIndex + 1;

  transactions.forEach((tx, idx) => {
    const amountNum = Number(tx.amount);
    if (tx.type === "INCOME") {
      totalIncome += amountNum;
    } else if (tx.type === "EXPENSE") {
      totalExpense += amountNum;
    }

    const row = sheet.getRow(currentRow);
    row.values = [
      idx + 1,
      new Date(tx.transactionDate).toISOString().split("T")[0],
      tx.account ? tx.account.name : "-",
      formatTransactionType(tx.type),
      tx.category ? tx.category.name : (tx.type.startsWith("TRANSFER") ? "Transfer" : "-"),
      amountNum,
      tx.description || "-"
    ];

    row.getCell(1).alignment = { horizontal: "center" };
    row.getCell(2).alignment = { horizontal: "center" };
    row.getCell(4).alignment = { horizontal: "center" };
    row.getCell(6).numFmt = "#,##0";
    if (tx.type === "INCOME") {
      row.getCell(4).font = { color: { argb: "FF047857" }, bold: true };
    } else if (tx.type === "EXPENSE") {
      row.getCell(4).font = { color: { argb: "FFE11D48" }, bold: true };
    } else {
      row.getCell(4).font = { color: { argb: "FF2563EB" }, bold: true };
    }

    currentRow++;
  });

  // Baris Ringkasan
  currentRow++;
  sheet.getCell(`D${currentRow}`).value = "Total Pemasukan:";
  sheet.getCell(`D${currentRow}`).font = { bold: true };
  sheet.getCell(`F${currentRow}`).value = totalIncome;
  sheet.getCell(`F${currentRow}`).numFmt = "#,##0";
  sheet.getCell(`F${currentRow}`).font = { bold: true, color: { argb: "FF047857" } };

  currentRow++;
  sheet.getCell(`D${currentRow}`).value = "Total Pengeluaran:";
  sheet.getCell(`D${currentRow}`).font = { bold: true };
  sheet.getCell(`F${currentRow}`).value = totalExpense;
  sheet.getCell(`F${currentRow}`).numFmt = "#,##0";
  sheet.getCell(`F${currentRow}`).font = { bold: true, color: { argb: "FFE11D48" } };

  currentRow++;
  sheet.getCell(`D${currentRow}`).value = "Selisih Bersih (Net):";
  sheet.getCell(`D${currentRow}`).font = { bold: true };
  sheet.getCell(`F${currentRow}`).value = totalIncome - totalExpense;
  sheet.getCell(`F${currentRow}`).numFmt = "#,##0";
  sheet.getCell(`F${currentRow}`).font = { bold: true, color: { argb: "FF1E40AF" } };

  return workbook;
};

export const generatePdfReport = async (userId, query = {}) => {
  const whereClause = { userId };
  const dateFilter = buildReportDateFilter(query);
  if (Object.keys(dateFilter).length > 0) {
    whereClause.transactionDate = dateFilter;
  }

  const accountId = parseIntParam(getParam(query, "accountId", "account_id"), "rekening", { strict: true, min: 1 });
  if (accountId !== null) {
    whereClause.accountId = accountId;
  }

  const [user, transactions, selectedAccount] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } }),
    prisma.transaction.findMany({
      where: whereClause,
      orderBy: [{ transactionDate: "asc" }, { id: "asc" }],
      include: {
        account: {
          select: { name: true, institution: true }
        },
        category: {
          select: { name: true, type: true }
        }
      }
    }),
    accountId !== null ? prisma.account.findFirst({ where: { id: accountId, userId } }) : null
  ]);

  let totalIncome = 0;
  let totalExpense = 0;

  const tableBody = [
    [
      { text: "No", style: "tableHeader", alignment: "center" },
      { text: "Tanggal", style: "tableHeader", alignment: "center" },
      { text: "Rekening", style: "tableHeader" },
      { text: "Tipe", style: "tableHeader", alignment: "center" },
      { text: "Kategori", style: "tableHeader" },
      { text: "Nominal (IDR)", style: "tableHeader", alignment: "right" },
      { text: "Keterangan", style: "tableHeader" }
    ]
  ];

  transactions.forEach((tx, idx) => {
    const amountNum = Number(tx.amount);
    if (tx.type === "INCOME") {
      totalIncome += amountNum;
    } else if (tx.type === "EXPENSE") {
      totalExpense += amountNum;
    }

    let typeColor = "#64748B";
    if (tx.type === "INCOME") typeColor = "#047857";
    else if (tx.type === "EXPENSE") typeColor = "#E11D48";
    else typeColor = "#2563EB";

    tableBody.push([
      { text: (idx + 1).toString(), alignment: "center" },
      { text: new Date(tx.transactionDate).toISOString().split("T")[0], alignment: "center" },
      { text: tx.account ? tx.account.name : "-" },
      {
        text: formatTransactionType(tx.type),
        color: typeColor,
        bold: true,
        alignment: "center"
      },
      { text: tx.category ? tx.category.name : (tx.type.startsWith("TRANSFER") ? "Transfer" : "-") },
      { text: amountNum.toLocaleString("id-ID"), alignment: "right" },
      { text: tx.description || "-" }
    ]);
  });

  const netAmount = totalIncome - totalExpense;

  const docDefinition = {
    defaultStyle: {
      font: "Helvetica",
      fontSize: 9
    },
    content: [
      { text: "FINREPORT — LAPORAN KEUANGAN PERSONAL", style: "header" },
      { text: `Nama Pengguna: ${user ? user.name : "-"} (${user ? user.email : "-"})`, style: "subHeader" },
      {
        text: `Tanggal Laporan: ${new Date().toLocaleDateString("id-ID")}${selectedAccount ? ` | Rekening: ${selectedAccount.name}` : ""} | Periode: ${query.startDate || "Awal"} s.d. ${query.endDate || "Sekarang"}`,
        style: "meta"
      },
      { text: " ", margin: [0, 5] },

      // Ringkasan Agregat
      {
        table: {
          widths: ["*", "*", "*"],
          body: [
            [
              { text: `Total Pemasukan\nRp ${totalIncome.toLocaleString("id-ID")}`, fillColor: "#ECFDF5", bold: true, color: "#047857", alignment: "center", margin: [0, 5] },
              { text: `Total Pengeluaran\nRp ${totalExpense.toLocaleString("id-ID")}`, fillColor: "#FFF1F2", bold: true, color: "#E11D48", alignment: "center", margin: [0, 5] },
              { text: `Selisih Bersih (Net)\nRp ${netAmount.toLocaleString("id-ID")}`, fillColor: "#EFF6FF", bold: true, color: "#1D4ED8", alignment: "center", margin: [0, 5] }
            ]
          ]
        },
        layout: "noBorders",
        margin: [0, 0, 0, 15]
      },

      // Tabel Transaksi
      {
        table: {
          headerRows: 1,
          widths: [20, 55, 65, 65, 80, 75, "*"],
          body: tableBody
        },
        layout: "lightHorizontalLines"
      }
    ],
    styles: {
      header: {
        fontSize: 14,
        bold: true,
        color: "#065F46",
        alignment: "center",
        margin: [0, 0, 0, 4]
      },
      subHeader: {
        fontSize: 10,
        alignment: "center",
        color: "#334155"
      },
      meta: {
        fontSize: 8,
        color: "#64748B",
        alignment: "center",
        margin: [0, 2, 0, 8]
      },
      tableHeader: {
        bold: true,
        fontSize: 9,
        color: "#0F172A",
        fillColor: "#F1F5F9"
      }
    }
  };

  return printer.createPdfKitDocument(docDefinition);
};