/**
 * Middleware Upload Berkas Import Mutasi (In-Memory)
 *
 * Menggunakan Multer memoryStorage dengan batas 5 MB, 1 file,
 * dan validasi ekstensi (.csv, .xlsx).
 */

import multer from "multer";

const ALLOWED_EXTENSIONS = [".csv", ".xlsx"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const storage = multer.memoryStorage();

const multerInstance = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1
  },
  fileFilter: (req, file, cb) => {
    const ext = "." + (file.originalname.toLowerCase().split(".").pop() || "");
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      const error = new Error("Format berkas tidak didukung. Hanya file .csv dan .xlsx yang diperbolehkan");
      error.statusCode = 400;
      return cb(error, false);
    }
    cb(null, true);
  }
}).single("file");

/**
 * Middleware pembungkus untuk menangani error multer secara ramah.
 */
export function handleImportUpload(req, res, next) {
  multerInstance(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          message: "Ukuran berkas melebihi batas maksimum 5 MB"
        });
      }
      if (err.code === "LIMIT_UNEXPECTED_FILE") {
        return res.status(400).json({
          success: false,
          message: "Hanya satu file yang diizinkan untuk diunggah (field: 'file')"
        });
      }
      return res.status(err.statusCode || 400).json({
        success: false,
        message: err.message || "Gagal mengunggah berkas"
      });
    }

    next();
  });
}
