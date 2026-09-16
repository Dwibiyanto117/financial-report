import { Router } from "express";
import * as reportController from "../controllers/report.controller.js";
import { authenticateToken } from "../middlewares/auth.middleware.js";

const router = Router();

router.use(authenticateToken); // Proteksi seluruh rute ekspor laporan

router.get("/export/excel", reportController.exportExcel);
router.get("/export/pdf", reportController.exportPdf);

export default router;