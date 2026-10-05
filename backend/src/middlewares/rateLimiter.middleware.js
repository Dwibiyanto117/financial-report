/**
 * Rate Limiter Middleware
 *
 * Membatasi frekuensi request upload import mutasi untuk mencegah DoS
 * atau eksploitasi beban dekripsi dokumen.
 */

import rateLimit from "express-rate-limit";

export const importUploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 menit
  max: process.env.NODE_ENV === "production" ? 10 : 200, // 200 di dev/test, 10 di prod
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
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
