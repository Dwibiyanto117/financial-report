/**
 * Category Rule Controller
 */

import * as categoryRuleService from "../services/categoryRule.service.js";

/**
 * GET /api/category-rules
 * Mengambil daftar aturan kategori pengguna.
 */
export const getCategoryRules = async (req, res, next) => {
  try {
    const rules = await categoryRuleService.getCategoryRules(req.user.id);
    return res.status(200).json({
      success: true,
      message: "Daftar aturan kategori berhasil diambil",
      data: rules
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/category-rules
 * Membuat aturan kategori baru.
 */
export const createCategoryRule = async (req, res, next) => {
  try {
    const { keyword } = req.body;
    const categoryId = req.body.category_id || req.body.categoryId;

    if (!keyword || !String(keyword).trim()) {
      return res.status(400).json({
        success: false,
        message: "Kata kunci (keyword) wajib diisi"
      });
    }

    if (!categoryId) {
      return res.status(400).json({
        success: false,
        message: "category_id wajib dipilih"
      });
    }

    const rule = await categoryRuleService.createCategoryRule(req.user.id, {
      keyword,
      categoryId
    });

    return res.status(201).json({
      success: true,
      message: "Aturan kategori berhasil dibuat",
      data: rule
    });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/category-rules/:id
 * Menghapus aturan kategori pengguna.
 */
export const deleteCategoryRule = async (req, res, next) => {
  try {
    const ruleId = parseInt(req.params.id, 10);
    if (isNaN(ruleId)) {
      return res.status(400).json({
        success: false,
        message: "ID aturan kategori tidak valid"
      });
    }

    const result = await categoryRuleService.deleteCategoryRule(req.user.id, ruleId);

    return res.status(200).json({
      success: true,
      message: result.message || "Aturan kategori berhasil dihapus",
      data: null
    });
  } catch (error) {
    next(error);
  }
};
