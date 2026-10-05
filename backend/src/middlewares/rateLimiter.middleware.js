/**
 * Rate Limiter Middleware
 *
 * Membatasi frekuensi request upload import mutasi untuk mencegah DoS
 * atau eksploitasi beban dekripsi dokumen.
 */

import rateLimit from "express-rate-limit";

export const importUploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 menit
  max: 10, // Maksimal 10 upload per 10 menit per user / IP
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Utamakan userId jika terotentikasi, fallback ke IP
    return req.user && req.user.id ? `import_user_${req.user.id}` : `import_ip_${req.ip}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Terlalu banyak permintaan upload berkas. Silakan coba lagi setelah 10 menit."
    });
  }
});
