/**
 * Categorizer Transaksi Import
 *
 * Menentukan kategori transaksi secara otomatis berdasarkan hierarki:
 * 1. Rule kustom pengguna (tabel category_rules)
 * 2. Kata kunci bawaan sistem (GRAB, TOKOPEDIA, PLN, GAJI, dll.)
 * 3. Fallback "Lainnya" sesuai tipe transaksi (INCOME / EXPENSE)
 */

import prisma from "../../config/prisma.js";

// Pola kata kunci bawaan sistem -> Nama Kategori Standar
export const BUILTIN_KEYWORD_RULES = [
  // INCOME
  {
    categoryName: "Gaji",
    type: "INCOME",
    keywords: ["GAJI", "PAYROLL", "SALARY", "UPAH", "HONOR", "HONORARIUM"]
  },
  {
    categoryName: "Bonus & Tunjangan",
    type: "INCOME",
    keywords: ["BONUS", "THR", "INSENTIF", "TUNJANGAN", "REWARD", "CASHBACK", "KOMISI"]
  },
  {
    categoryName: "Investasi & Dividen",
    type: "INCOME",
    keywords: ["DIVIDEN", "DIVIDEND", "BUNGA DEPOSITO", "INVESTASI", "PROFIT", "REKSADANA", "OBLIGASI", "COUPON", "KUAPON", "IMBAL HASIL"]
  },
  {
    categoryName: "Pendapatan Usaha",
    type: "INCOME",
    keywords: ["PENDAPATAN USAHA", "OMSET", "PENJUALAN", "INVOICE", "PEMBAYARAN KLIEN", "SETORAN USAHA", "REVENUE"]
  },
  {
    categoryName: "Pemasukan Lainnya",
    type: "INCOME",
    keywords: ["TRANSFER MASUK", "KIRIMAN DANA", "REFUND", "PENGEMBALIAN DANA"]
  },

  // EXPENSE
  {
    categoryName: "Makanan & Minuman",
    type: "EXPENSE",
    keywords: ["MAKANAN", "MINUMAN", "RESTO", "RESTORAN", "CAFE", "KOPI", "WARUNG", "WARTEG", "KANTIN", "BAKSO", "MIE AYAM", "NASI GORENG", "FOOD", "KULINER", "SNACK", "COFFEE", "ROTI", "BAKERY", "BEVERAGE"]
  },
  {
    categoryName: "Transportasi",
    type: "EXPENSE",
    keywords: ["BENSIN", "PERTAMAX", "PERTALITE", "SOLAR", "BBM", "SPBU", "PARKIR", "TOL", "TARIF TOL", "OJEK", "TAKSI", "KRL", "KERETA", "TIKET PESAWAT", "TIKET KERETA", "KAPAL", "BUS", "LOGISTIK", "ONGKIR", "PENGIRIMAN", "EXPEDISI", "SERVIS MOTOR", "SERVIS MOBIL", "BENGKEL", "TAMBAL BAN", "CUCI MOBIL", "CUCI MOTOR"]
  },
  {
    categoryName: "Tempat Tinggal & Sewa",
    type: "EXPENSE",
    keywords: ["SEWA KOST", "SEWA KONTRAKAN", "SEWA RUMAH", "SEWA APARTEMEN", "IPL", "IURAN WARGA", "KEBERSIHAN", "KEAMANAN", "RENOVASI", "PERBAIKAN RUMAH"]
  },
  {
    categoryName: "Tagihan & Utilitas",
    type: "EXPENSE",
    keywords: ["LISTRIK", "TOKEN LISTRIK", "PLN", "AIR", "PDAM", "PULSA", "PAKET DATA", "INTERNET", "WIFI", "TELEPON", "TAGIHAN", "BPJS", "GAS ELPIJI", "ASURANSI"]
  },
  {
    categoryName: "Belanja Kebutuhan",
    type: "EXPENSE",
    keywords: ["SUPERMARKET", "MINIMARKET", "GROSIR", "PASAR", "BELANJA", "SABUN", "SHAMPO", "DETERJEN", "MINYAK GORENG", "BERAS", "GALON", "GAS", "KASUR", "PERABOTAN"]
  },
  {
    categoryName: "Hiburan & Rekreasi",
    type: "EXPENSE",
    keywords: ["BIOSKOP", "CINEMA", "NONTON", "TIKET WISATA", "REKREASI", "LIBURAN", "HOTEL", "VILLA", "STREAMING", "SUBSCRIPTION", "GAME", "MAINAN", "KARAOKE"]
  },
  {
    categoryName: "Kesehatan & Medis",
    type: "EXPENSE",
    keywords: ["APOTEK", "OBAT", "VITAMIN", "KLINIK", "DOKTER", "RUMAH SAKIT", "LABORATORIUM", "TES DARAH", "GIGI", "KACAMATA", "OPTIK", "MEDIS", "VAKSIN"]
  },
  {
    categoryName: "Pendidikan",
    type: "EXPENSE",
    keywords: ["SEKOLAH", "SPP", "KULIAH", "SEMESTER", "KURSUS", "PELATIHAN", "WORKSHOP", "BUKU", "ALAT TULIS", "ATK", "BIMBEL", "LES", "SERTIFIKASI"]
  },
  {
    categoryName: "Donasi & Sosial",
    type: "EXPENSE",
    keywords: ["ZAKAT", "INFAQ", "INFAK", "SEDEKAH", "DONASI", "SUMBANGAN", "BAKSOS", "KONDANGAN", "AMAL", "PERPULUHAN", "KORBAN"]
  },
  {
    categoryName: "Pengeluaran Lainnya",
    type: "EXPENSE",
    keywords: ["BIAYA ADMIN", "BIAYA TRANSFER", "DENDA", "BUNGA PINJAMAN", "MATERAI", "PAJAK"]
  }
];

/**
 * Menormalkan teks pencarian kata kunci (uppercase, buang karakter tanda baca berlebih, spasi tunggal).
 *
 * @param {string} text
 * @returns {string}
 */
export function normalizeKeywordText(text) {
  if (!text) return "";
  return String(text)
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Menghasilkan kandidat kata kunci (suggested_keyword) dari deskripsi transaksi.
 * Membuang angka, tanggal, nomor referensi panjang, dan mengambil 1-3 kata bermakna pertama.
 *
 * @param {string} description
 * @returns {string|null}
 */
export function deriveKeyword(description) {
  if (!description || typeof description !== "string") return null;

  // 1. Bersihkan karakter awal formula jika ada
  let text = description.replace(/^['=+\-@]+/, "").trim();
  if (!text) return null;

  // 2. Buang tanggal format DD/MM/YYYY, YYYY-MM-DD, DD-MM-YY
  text = text.replace(/\b\d{1,4}[-/]\d{1,2}[-/]\d{2,4}\b/g, " ");

  // 3. Buang waktu HH:mm:ss atau HH:mm
  text = text.replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, " ");

  // 4. Buang pola nomor referensi atau kode angka/heksadesimal panjang (>= 5 digit)
  text = text.replace(/\b[A-Za-z0-9]*\d{4,}[A-Za-z0-9]*\b/g, " ");
  text = text.replace(/\b(REF|NO|TRX|INV|ID)[\s:#-]*[A-Za-z0-9]+/gi, " ");

  // 5. Ganti karakter non-alfanumerik dengan spasi
  text = text.replace(/[^A-Za-z0-9\s]/g, " ");

  // 6. Pisahkan kata-kata, buang kata yang terlalu pendek (<= 1 huruf) atau murni angka
  const words = text
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 2 && !/^\d+$/.test(w));

  if (words.length === 0) return null;

  // 7. Ambil 1 sampai 3 kata bermakna pertama
  const candidateWords = words.slice(0, 3);
  let candidate = candidateWords.join(" ").trim();

  // Jika candidate kurang dari 4 karakter, coba tambahkan kata berikutnya jika ada
  if (candidate.length < 4 && words.length > 3) {
    candidate = words.slice(0, 4).join(" ").trim();
  }

  // Syarat: minimal 4 karakter, maksimal 100 karakter
  if (candidate.length < 4) return null;
  if (candidate.length > 100) {
    candidate = candidate.slice(0, 100).trim();
  }

  return candidate || null;
}

/**
 * Memuat semua kategori yang tersedia untuk pengguna (kategori kustom user + default sistem).
 *
 * @param {number} userId
 * @returns {Promise<Array<object>>}
 */
export async function loadCategoriesForUser(userId) {
  return await prisma.category.findMany({
    where: {
      OR: [
        { isDefault: true, userId: null },
        { userId }
      ]
    }
  });
}

/**
 * Memuat aturan kategori kustom pengguna dari tabel category_rules.
 *
 * @param {number} userId
 * @returns {Promise<Array<object>>}
 */
export async function loadUserCategoryRules(userId) {
  return await prisma.categoryRule.findMany({
    where: { userId },
    include: {
      category: true
    }
  });
}

/**
 * Mencari kategori fallback ("Lainnya") yang sesuai dengan tipe transaksi.
 *
 * @param {Array<object>} categories
 * @param {string} type - INCOME | EXPENSE
 * @returns {object|null}
 */
export function findFallbackCategory(categories, type) {
  const normType = String(type).toUpperCase();
  const fallback = categories.find(
    (c) => c.type === normType && c.name.toLowerCase().includes("lainnya")
  );
  if (fallback) return fallback;
  return categories.find((c) => c.type === normType) || null;
}

/**
 * Mengusulkan category_id dan suggestion_source untuk satu baris transaksi berdasarkan deskripsi dan tipe.
 *
 * Prioritas pencocokan:
 * 1. Aturan user (user_rules): aturan dengan keyword terpanjang menang; jika sama panjang, yang terbaru (id terbesar / urutan) menang.
 * 2. Aturan kata kunci bawaan (builtin).
 * 3. Fallback kategori "Lainnya" sesuai tipe transaksi.
 *
 * @param {object} params
 * @param {string} params.description
 * @param {string} params.type - INCOME | EXPENSE
 * @param {Array<object>} params.userRules
 * @param {Array<object>} params.categories
 * @returns {{ categoryId: number|null, source: "user_rule"|"builtin"|"fallback" }}
 */
export function suggestCategory({ description = "", type, userRules = [], categories = [] }) {
  const normDesc = normalizeKeywordText(description);
  const normType = String(type).toUpperCase();

  // 1. Cek rule kustom pengguna (Urutkan: keyword terpanjang duluan, lalu id / createdAt terbaru)
  const validUserRules = userRules
    .filter((r) => r && r.keyword && String(r.keyword).trim().length > 0)
    .map((r) => ({
      ...r,
      normalizedKeyword: normalizeKeywordText(r.keyword)
    }))
    .filter((r) => r.normalizedKeyword.length > 0)
    .sort((a, b) => {
      if (b.normalizedKeyword.length !== a.normalizedKeyword.length) {
        return b.normalizedKeyword.length - a.normalizedKeyword.length; // Terpanjang menang
      }
      return (b.id || 0) - (a.id || 0); // Seri: yang terbaru menang
    });

  for (const rule of validUserRules) {
    if (normDesc.includes(rule.normalizedKeyword)) {
      const matchedCat = categories.find((c) => c.id === rule.categoryId);
      if (matchedCat && matchedCat.type === normType) {
        return {
          categoryId: matchedCat.id,
          source: "user_rule"
        };
      }
    }
  }

  // 2. Cek rule bawaan sistem
  for (const rule of BUILTIN_KEYWORD_RULES) {
    if (rule.type !== normType) continue;

    for (const kw of rule.keywords) {
      const normKw = normalizeKeywordText(kw);
      if (normKw && normDesc.includes(normKw)) {
        const matchedCat = categories.find(
          (c) => c.type === normType && c.name.toLowerCase() === rule.categoryName.toLowerCase()
        );
        if (matchedCat) {
          return {
            categoryId: matchedCat.id,
            source: "builtin"
          };
        }
      }
    }
  }

  // 3. Fallback ke kategori "Lainnya" sesuai tipe
  const fallback = findFallbackCategory(categories, normType);
  return {
    categoryId: fallback ? fallback.id : null,
    source: "fallback"
  };
}

/**
 * Backward compatibility: mengembalikan category_id saja.
 */
export function suggestCategoryId(params) {
  return suggestCategory(params).categoryId;
}
