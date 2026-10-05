/**
 * Controller Pipeline Import Mutasi
 */

import * as importService from "../services/import/import.service.js";

/**
 * POST /api/imports/preview
 * Memproses berkas mutasi dan mengembalikan preview transaksi.
 */
export async function previewImport(req, res, next) {
  try {
    const accountId = req.body.account_id || req.body.accountId;
    if (!accountId) {
      return res.status(400).json({
        success: false,
        message: "account_id wajib diisi"
      });
    }

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
    const batchId = parseInt(req.params.id, 10);
    if (isNaN(batchId)) {
      return res.status(400).json({
        success: false,
        message: "ID batch import tidak valid"
      });
    }

    const { rows = [] } = req.body;

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
    const batchId = parseInt(req.params.id, 10);
    if (isNaN(batchId)) {
      return res.status(400).json({
        success: false,
        message: "ID batch import tidak valid"
      });
    }

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
    const accountId = req.query.account_id || req.query.accountId;
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
    const batchId = parseInt(req.params.id, 10);
    if (isNaN(batchId)) {
      return res.status(400).json({
        success: false,
        message: "ID batch import tidak valid"
      });
    }

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
