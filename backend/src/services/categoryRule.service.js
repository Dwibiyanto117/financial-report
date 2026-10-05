/**
 * Category Rule Service
 *
 * Mengelola aturan kata kunci kustom per-user (tabel category_rules)
 * untuk auto-kategorisasi mutasi transaksi.
 */

import prisma from "../config/prisma.js";

/**
 * Mengambil daftar aturan kategori milik pengguna.
 *
 * @param {number} userId
 * @returns {Promise<Array<object>>}
 */
export async function getCategoryRules(userId) {
  return await prisma.categoryRule.findMany({
    where: { userId },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          type: true,
          icon: true,
          color: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  });
}

/**
 * Membuat aturan kategori baru untuk pengguna.
 *
 * @param {number} userId
 * @param {object} params
 * @param {string} params.keyword
 * @param {number|string} params.categoryId
 * @returns {Promise<object>}
 */
export async function createCategoryRule(userId, { keyword, categoryId }) {
  if (!keyword || !String(keyword).trim()) {
    const error = new Error("Kata kunci (keyword) wajib diisi");
    error.statusCode = 400;
    throw error;
  }

  if (!categoryId) {
    const error = new Error("categoryId wajib dipilih");
    error.statusCode = 400;
    throw error;
  }

  const cleanKeyword = String(keyword).trim();

  // Pastikan kategori valid dan milik pengguna atau sistem default
  const category = await prisma.category.findFirst({
    where: {
      id: Number(categoryId),
      OR: [
        { isDefault: true, userId: null },
        { userId }
      ]
    }
  });

  if (!category) {
    const error = new Error("Kategori yang dipilih tidak valid atau tidak ditemukan");
    error.statusCode = 400;
    throw error;
  }

  // Cek duplikasi keyword untuk user yang sama
  const existing = await prisma.categoryRule.findFirst({
    where: {
      userId,
      keyword: cleanKeyword
    }
  });

  if (existing) {
    const error = new Error(`Aturan untuk kata kunci "${cleanKeyword}" sudah pernah dibuat`);
    error.statusCode = 400;
    throw error;
  }

  return await prisma.categoryRule.create({
    data: {
      userId,
      keyword: cleanKeyword,
      categoryId: category.id
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          type: true,
          icon: true,
          color: true
        }
      }
    }
  });
}

/**
 * Menghapus aturan kategori pengguna.
 *
 * @param {number} userId
 * @param {number|string} ruleId
 * @returns {Promise<object>}
 */
export async function deleteCategoryRule(userId, ruleId) {
  const rule = await prisma.categoryRule.findFirst({
    where: {
      id: Number(ruleId),
      userId
    }
  });

  if (!rule) {
    const error = new Error("Aturan kategori tidak ditemukan");
    error.statusCode = 404;
    throw error;
  }

  await prisma.categoryRule.delete({
    where: { id: rule.id }
  });

  return { message: "Aturan kategori berhasil dihapus" };
}
