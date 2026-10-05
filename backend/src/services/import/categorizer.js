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
