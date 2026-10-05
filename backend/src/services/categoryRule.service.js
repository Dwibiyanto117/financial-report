/**
 * Category Rule Service
 *
 * Mengelola aturan kata kunci kustom per-user (tabel category_rules)
 * untuk auto-kategorisasi mutasi transaksi.
 */

import prisma from "../config/prisma.js";
import { parsePositiveInt } from "../utils/query.js";

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

  const validCategoryId = parsePositiveInt(categoryId, "categoryId");
  const cleanKeyword = String(keyword).trim();

  // Pastikan kategori valid dan milik pengguna atau sistem default
  const category = await prisma.category.findFirst({
    where: {
      id: validCategoryId,
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
  const validRuleId = parsePositiveInt(ruleId, "ruleId");
  const rule = await prisma.categoryRule.findFirst({
    where: {
      id: validRuleId,
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

/**
 * Memperbarui aturan kategori pengguna (keyword dan/atau categoryId).
 *
 * @param {number} userId
 * @param {number|string} ruleId
 * @param {object} params
 * @param {string} [params.keyword]
 * @param {number|string} [params.categoryId]
 * @returns {Promise<object>}
 */
export async function updateCategoryRule(userId, ruleId, { keyword, categoryId }) {
  const validRuleId = parsePositiveInt(ruleId, "ID aturan kategori");

  const existingRule = await prisma.categoryRule.findFirst({
    where: { id: validRuleId, userId },
    include: { category: true }
  });

  if (!existingRule) {
    const error = new Error("Aturan kategori tidak ditemukan");
    error.statusCode = 404;
    throw error;
  }

  const dataToUpdate = {};

  if (keyword !== undefined && keyword !== null) {
    const cleanKw = String(keyword).trim();
    if (!cleanKw) {
      const error = new Error("Kata kunci (keyword) tidak boleh kosong");
      error.statusCode = 400;
      throw error;
    }

    // Cek duplikasi keyword jika keyword berubah
    if (cleanKw.toLowerCase() !== existingRule.keyword.toLowerCase()) {
      const duplicate = await prisma.categoryRule.findFirst({
        where: {
          userId,
          keyword: cleanKw,
          NOT: { id: validRuleId }
        }
      });
      if (duplicate) {
        const error = new Error("Keyword sudah dipakai aturan lain");
        error.statusCode = 400;
        throw error;
      }
    }

    dataToUpdate.keyword = cleanKw;
  }

  if (categoryId !== undefined && categoryId !== null) {
    const validCatId = parsePositiveInt(categoryId, "category_id");

    const category = await prisma.category.findFirst({
      where: {
        id: validCatId,
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

    dataToUpdate.categoryId = category.id;
  }

  if (Object.keys(dataToUpdate).length === 0) {
    return existingRule;
  }

  try {
    return await prisma.categoryRule.update({
      where: { id: existingRule.id },
      data: dataToUpdate,
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
  } catch (err) {
    if (err.code === "P2002") {
      const error = new Error("Keyword sudah dipakai aturan lain");
      error.statusCode = 400;
      throw error;
    }
    throw err;
  }
}
