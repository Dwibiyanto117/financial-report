/**
 * Rate Limiter Middleware
 *
 * Membatasi frekuensi request upload import mutasi untuk mencegah DoS
 * atau eksploitasi beban dekripsi dokumen.
 */

import rateLimit from "express-rate-limit";

const parseRateLimitMax = () => {
  const envVal = process.env.IMPORT_RATE_LIMIT_MAX;
  if (envVal && /^[1-9]\d*$/.test(String(envVal).trim())) {
    return Number(envVal);
  }
  return 10;
};

export const importUploadLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 menit
  max: parseRateLimitMax, // Bawaan ketat: 10 upload per 10 menit; konfigurasi lewat IMPORT_RATE_LIMIT_MAX
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

const parseCommitRateLimitMax = () => {
  const envVal = process.env.IMPORT_COMMIT_RATE_LIMIT_MAX;
  if (envVal && /^[1-9]\d*$/.test(String(envVal).trim())) {
    return Number(envVal);
  }
  return 30;
};

export const importCommitLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 menit
  max: parseCommitRateLimitMax, // Bawaan: 30 commit per 10 menit; konfigurasi lewat IMPORT_COMMIT_RATE_LIMIT_MAX
  standardHeaders: true,
  legacyHeaders: false,
  validate: { keyGeneratorIpFallback: false },
  keyGenerator: (req) => {
    return req.user && req.user.id ? `import_commit_user_${req.user.id}` : `import_commit_ip_${req.ip}`;
  },
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "Terlalu banyak permintaan commit transaksi. Silakan coba lagi setelah 10 menit."
    });
  }
});

