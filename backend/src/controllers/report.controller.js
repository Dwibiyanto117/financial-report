import * as exportService from "../services/export.service.js";

export const exportExcel = async (req, res, next) => {
  try {
    const workbook = await exportService.generateExcelReport(req.user.id, req.query);

    const filename = `FinReport_Transaksi_${new Date().toISOString().split("T")[0]}.xlsx`;

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
};

export const exportPdf = async (req, res, next) => {
  try {
    const pdfDoc = await exportService.generatePdfReport(req.user.id, req.query);

    const filename = `FinReport_Ringkasan_${new Date().toISOString().split("T")[0]}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    pdfDoc.pipe(res);
    pdfDoc.end();
  } catch (error) {
    next(error);
  }
};