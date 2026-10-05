/**
 * Controller Pipeline Import Mutasi
 */

import * as importService from "../services/import/import.service.js";
import { parsePositiveInt } from "../utils/query.js";

/**
 * POST /api/imports/preview
 * Memproses berkas mutasi dan mengembalikan preview transaksi.
 */
export async function previewImport(req, res, next) {
  try {
    const rawAccountId = req.body.account_id || req.body.accountId;
    const accountId = parsePositiveInt(rawAccountId, "account_id");

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File mutasi wajib diunggah"
      });
    }

    const parser = req.body.parser || null;
    const mapping = req.body.mapping || null;
    const filePassword = req.body.file_password || req.body.filePassword || null;

    const result = await importService.preview({
      userId: req.user.id,
      accountId,
      file: req.file,
      parser,
      mapping,
      filePassword
    });

    return res.status(200).json({
      success: true,
      message: "Preview berkas mutasi berhasil dibuat",
      data: result
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/imports/:id/commit
 * Menyimpan transaksi dari batch preview ke database secara atomic.
 */
export const commitImport = async (req, res, next) => {
  try {
    const batchId = parsePositiveInt(req.params.id, "ID batch import");

    const { rows = [] } = req.body;
    if (!Array.isArray(rows)) {
      return res.status(400).json({
        success: false,
        message: "rows harus berupa array"
      });
    }

    for (const item of rows) {
      if (item && item.category_id !== undefined && item.category_id !== null) {
        parsePositiveInt(item.category_id, "category_id");
      }
    }

    const result = await importService.commit({
      userId: req.user.id,
      batchId,
      rows
    });

    return res.status(200).json({
      success: true,
      message: "Batch transaksi berhasil di-commit",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/imports/:id
 * Membatalkan batch import dan menghapus semua transaksi terkait secara atomic.
 */
export const rollbackImport = async (req, res, next) => {
  try {
    const batchId = parsePositiveInt(req.params.id, "ID batch import");

    const result = await importService.rollback({
      userId: req.user.id,
      batchId
    });

    return res.status(200).json({
      success: true,
      message: result.message || "Batch import berhasil di-rollback",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/imports
 * Mengambil daftar riwayat batch import milik pengguna.
 */
export const getImports = async (req, res, next) => {
  try {
    const rawAccountId = req.query.account_id || req.query.accountId;
    let accountId = undefined;
    if (rawAccountId !== undefined && rawAccountId !== null && String(rawAccountId).trim() !== "") {
      accountId = parsePositiveInt(rawAccountId, "account_id");
    }

    const batches = await importService.listBatches(req.user.id, { accountId });

    return res.status(200).json({
      success: true,
      message: "Daftar riwayat import berhasil diambil",
      data: batches
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/imports/:id
 * Mengambil detail batch import beserta informasi rekening.
 */
export const getImportById = async (req, res, next) => {
  try {
    const batchId = parsePositiveInt(req.params.id, "ID batch import");

    const batch = await importService.getBatch(req.user.id, batchId);

    return res.status(200).json({
      success: true,
      message: "Detail batch import berhasil diambil",
      data: batch
    });
  } catch (error) {
    next(error);
  }
};

