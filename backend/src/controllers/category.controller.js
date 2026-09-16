import * as categoryService from "../services/category.service.js";

export const getCategories = async (req, res, next) => {
  try {
    const { type } = req.query;
    const categories = await categoryService.getCategories(req.user.id, type);
    return res.status(200).json({
      success: true,
      data: categories
    });
  } catch (error) {
    next(error);
  }
};

export const createCategory = async (req, res, next) => {
  try {
    const { name, type, icon, color } = req.body;
    const category = await categoryService.createCategory(req.user.id, { name, type, icon, color });
    return res.status(201).json({
      success: true,
      message: "Kategori baru berhasil ditambahkan",
      data: category
    });
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, icon, color } = req.body;
    const updated = await categoryService.updateCategory(req.user.id, id, { name, icon, color });
    return res.status(200).json({
      success: true,
      message: "Kategori berhasil diperbarui",
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await categoryService.deleteCategory(req.user.id, id);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};