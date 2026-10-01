/**
 * Query Parameter Utilities
 *
 * Menormalkan parameter query dari klien. API menerima dua gaya penamaan
 * (snake_case sesuai `planning/api-contract.md` dan camelCase yang dipakai
 * frontend) agar tidak ada permintaan yang diam-diam diabaikan.
 */

/**
 * Mengambil nilai pertama dari sebuah parameter query.
 * Express memberi array bila parameter dikirim lebih dari sekali.
 */
function readParam(source, name) {
  const raw = source ? source[name] : undefined;
  if (Array.isArray(raw)) return raw[0];
  return raw;
}

/**
 * Mengambil nilai parameter dengan menerima beberapa alias sekaligus.
 * Alias pertama yang benar-benar berisi nilai yang dipakai.
 */
export function getParam(source, ...aliases) {
  for (const alias of aliases) {
    const value = readParam(source, alias);
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return undefined;
}

/**
 * Mengubah nilai parameter tanggal menjadi objek Date.
 *
 * - Parameter tidak dikirim / kosong -> null (berarti tanpa batas).
 * - Nilai tidak dapat diartikan sebagai tanggal -> error 400, bukan error
 *   internal, sehingga klien tidak pernah menerima kegagalan query mentah.
 * - Hanya format ISO 8601 (`YYYY-MM-DD`, opsional diikuti waktu) yang
 *   diterima. Format lain seperti `01/09/2026` ditolak karena JavaScript
 *   membacanya sebagai 8 Januari, bukan 1 September — tanggal yang salah
 *   tanpa peringatan jauh lebih berbahaya daripada penolakan.
 */
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}([T ].*)?$/;

export function parseDateParam(value, label) {
  if (value === undefined) return null;

  if (!ISO_DATE_PATTERN.test(value)) {
    const error = new Error(
      `Parameter ${label} tidak valid: "${value}". Gunakan format tanggal ISO 8601, contoh 2026-09-30.`
    );
    error.statusCode = 400;
    throw error;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    const error = new Error(
      `Parameter ${label} tidak valid: "${value}". Gunakan format tanggal ISO 8601, contoh 2026-09-30.`
    );
    error.statusCode = 400;
    throw error;
  }

  return parsed;
}

/**
 * Mengambil sekaligus mengubah pasangan tanggal mulai/selesai.
 * Menerima `start_date`/`startDate` dan `end_date`/`endDate`.
 */
export function parseDateRange(source, { startAliases, endAliases } = {}) {
  const startValue = getParam(source, ...(startAliases || ["start_date", "startDate"]));
  const endValue = getParam(source, ...(endAliases || ["end_date", "endDate"]));

  return {
    startDate: parseDateParam(startValue, "tanggal mulai"),
    endDate: parseDateParam(endValue, "tanggal selesai")
  };
}

/**
 * Mengubah nilai parameter menjadi bilangan bulat.
 *
 * - Nilai kosong / tidak berupa bilangan bulat -> null tanpa melempar error,
 *   kecuali `strict` diminta (dipakai untuk nilai yang wajib benar).
 * - `min`/`max` adalah BATAS NILAI YANG SAH. Nilai di luar rentang ditolak
 *   dengan HTTP 400, bukan dipangkas ke batas terdekat. Memangkas membuat
 *   permintaan seperti `?month=13` diam-diam mengembalikan bulan yang berbeda
 *   dari yang diminta — kesalahan yang tidak terlihat oleh klien.
 */
export function parseIntParam(value, label, { strict = false, min = null, max = null } = {}) {
  if (value === undefined) return null;

  const parsed = Number(value);
  if (!Number.isInteger(parsed)) {
    if (strict) {
      const error = new Error(`Parameter ${label} harus berupa bilangan bulat, diterima "${value}".`);
      error.statusCode = 400;
      throw error;
    }
    return null;
  }

  if ((min !== null && parsed < min) || (max !== null && parsed > max)) {
    const range = min !== null && max !== null
      ? `${min} sampai ${max}`
      : min !== null ? `minimal ${min}` : `maksimal ${max}`;
    const error = new Error(`Parameter ${label} harus bernilai ${range}, diterima "${value}".`);
    error.statusCode = 400;
    throw error;
  }

  return parsed;
}

/**
 * Membatasi nilai parameter ke daftar nilai yang diizinkan.
 * Nilai di luar daftar -> error 400, bukan diabaikan diam-diam.
 */
export function parseEnumParam(value, label, allowed) {
  if (value === undefined) return null;

  const normalized = String(value).trim().toUpperCase();
  if (!allowed.includes(normalized)) {
    const error = new Error(
      `Parameter ${label} harus salah satu dari: ${allowed.join(", ")}.`
    );
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}
