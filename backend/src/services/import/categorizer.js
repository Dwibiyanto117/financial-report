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
const BUILTIN_KEYWORD_RULES = [
  // INCOME
  { keywords: ["GAJI", "PAYROLL", "SALARY"], categoryName: "Gaji", type: "INCOME" },
  { keywords: ["DIVIDEN", "DIVIDEND", "BUNGA DEPOSITO", "INVESTASI"], categoryName: "Investasi & Dividen", type: "INCOME" },
  { keywords: ["BONUS", "THR", "INSENTIF", "TUNJANGAN"], categoryName: "Bonus & Tunjangan", type: "INCOME" },
  { keywords: ["PENDAPATAN USAHA", "OMSET", "PENJUALAN"], categoryName: "Pendapatan Usaha", type: "INCOME" },

  // EXPENSE
  { keywords: ["GRAB", "GOJEK", "GOCAR", "GORIDE", "TOL", "PERTAMINA", "SHELL", "KAI", "TIKET", "PARKIR", "TRANSJAKARTA", "MRT", "BLUEBIRD"], categoryName: "Transportasi", type: "EXPENSE" },
  { keywords: ["INDOMARET", "ALFAMART", "TOKOPEDIA", "SHOPEE", "SUPERINDO", "HYPERMART", "ALFAMIDI", "TRANSITION", "BLIBLI", "LAZADA"], categoryName: "Belanja Kebutuhan", type: "EXPENSE" },
  { keywords: ["PLN", "PDAM", "TELKOM", "INDIHOME", "LISTRIK", "PULSA", "BPJS", "TAGIHAN", "FIRSTMEDIA", "BIZNET", "WIFI"], categoryName: "Tagihan & Utilitas", type: "EXPENSE" },
  { keywords: ["MIE AYAM", "RESTO", "CAFE", "KOPI", "WARUNG", "MCD", "KFC", "STARBUCKS", "MAKANAN", "FOOD", "GOPAY FOOD", "GRABFOOD", "SHOPEEFOOD", "BAKSO"], categoryName: "Makanan & Minuman", type: "EXPENSE" },
  { keywords: ["APOTEK", "KIMIA FARMA", "HALODOC", "RUMAH SAKIT", "KLINIK", "DOKTER", "OBAT", "ALODOKTER"], categoryName: "Kesehatan & Medis", type: "EXPENSE" },
  { keywords: ["NETFLIX", "SPOTIFY", "BIOSKOP", "XXI", "STEAM", "PLAYSTATION", "CINEMA", "YOUTUBE PREMIUM"], categoryName: "Hiburan & Rekreasi", type: "EXPENSE" },
  { keywords: ["ZAKAT", "INFAQ", "SEDEKAH", "KITABISA", "DONASI", "BAKSOS"], categoryName: "Donasi & Sosial", type: "EXPENSE" },
  { keywords: ["KURSUS", "BIMBEL", "SEKOLAH", "KULIAH", "UDEMY", "BUKU", "GRAMEDIA"], categoryName: "Pendidikan", type: "EXPENSE" }
];

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
 * Mengusulkan category_id untuk satu baris transaksi berdasarkan deskripsi dan tipe.
 *
 * @param {object} params
 * @param {string} params.description
 * @param {string} params.type - INCOME | EXPENSE
 * @param {Array<object>} params.userRules
 * @param {Array<object>} params.categories
 * @returns {number|null} ID kategori yang diusulkan
 */
export function suggestCategoryId({ description = "", type, userRules = [], categories = [] }) {
  const normDesc = String(description).toUpperCase();
  const normType = String(type).toUpperCase();

  // 1. Cek rule kustom pengguna
  for (const rule of userRules) {
    if (!rule.keyword) continue;
    const ruleKeyword = String(rule.keyword).toUpperCase().trim();
    if (ruleKeyword && normDesc.includes(ruleKeyword)) {
      // Pastikan tipe kategori cocok
      const matchedCat = categories.find((c) => c.id === rule.categoryId);
      if (matchedCat && matchedCat.type === normType) {
        return matchedCat.id;
      }
    }
  }

  // 2. Cek rule bawaan sistem
  for (const rule of BUILTIN_KEYWORD_RULES) {
    if (rule.type !== normType) continue;

    for (const kw of rule.keywords) {
      if (normDesc.includes(kw)) {
        // Cari ID kategori berdasarkan nama dan tipe
        const matchedCat = categories.find(
          (c) => c.type === normType && c.name.toLowerCase() === rule.categoryName.toLowerCase()
        );
        if (matchedCat) {
          return matchedCat.id;
        }
      }
    }
  }

  // 3. Fallback ke kategori "Lainnya" sesuai tipe
  const fallback = findFallbackCategory(categories, normType);
  return fallback ? fallback.id : null;
}
