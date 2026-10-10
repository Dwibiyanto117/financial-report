/**
 * Routes Pipeline Import Mutasi
 */

import express from "express";
import { authenticateToken } from "../middlewares/auth.middleware.js";
import { handleImportUpload } from "../middlewares/upload.middleware.js";
import { importUploadLimiter } from "../middlewares/rateLimiter.middleware.js";
import * as importController from "../controllers/import.controller.js";

const router = express.Router();

router.use(authenticateToken);

// Upload & Preview (dengan rate limiter khusus dan upload middleware)
router.post("/preview", importUploadLimiter, handleImportUpload, importController.previewImport);

// Commit batch preview menjadi transaksi aktual
router.post("/:id/commit", importController.commitImport);

// Rollback batch yang telah di-commit
router.delete("/:id", importController.rollbackImport);

// Daftar bank allowlist untuk template
router.get("/template/banks", importController.getTemplateBanks);

// Unduh berkas template mutasi standar FinReport
router.get("/template", importController.downloadTemplate);

// Riwayat & Detail batch import
router.get("/", importController.getImports);
router.get("/:id", importController.getImportById);

export default router;
