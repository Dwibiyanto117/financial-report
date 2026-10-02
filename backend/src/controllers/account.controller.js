import * as accountService from "../services/account.service.js";

export const getAccounts = async (req, res, next) => {
  try {
    const includeArchived = req.query.include_archived === "true" || req.query.includeArchived === "true";
    const accounts = await accountService.getAccounts(req.user.id, { includeArchived });

    return res.status(200).json({
      success: true,
      message: "Daftar rekening berhasil diambil",
      data: accounts
    });
  } catch (error) {
    next(error);
  }
};

export const getAccountById = async (req, res, next) => {
  try {
    const accountId = parseInt(req.params.id, 10);
    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        message: "ID rekening tidak valid"
      });
    }

    const account = await accountService.getAccountById(req.user.id, accountId);
    return res.status(200).json({
      success: true,
      message: "Detail rekening berhasil diambil",
      data: account
    });
  } catch (error) {
    next(error);
  }
};

export const createAccount = async (req, res, next) => {
  try {
    const { name, institution, type, accountNoMasked, openingBalance, color } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Nama rekening wajib diisi"
      });
    }

    const account = await accountService.createAccount(req.user.id, {
      name,
      institution,
      type,
      accountNoMasked,
      openingBalance,
      color
    });

    return res.status(201).json({
      success: true,
      message: "Rekening baru berhasil ditambahkan",
      data: account
    });
  } catch (error) {
    next(error);
  }
};

export const updateAccount = async (req, res, next) => {
  try {
    const accountId = parseInt(req.params.id, 10);
    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        message: "ID rekening tidak valid"
      });
    }

    const account = await accountService.updateAccount(req.user.id, accountId, req.body);
    return res.status(200).json({
      success: true,
      message: "Data rekening berhasil diperbarui",
      data: account
    });
  } catch (error) {
    next(error);
  }
};

export const deleteAccount = async (req, res, next) => {
  try {
    const accountId = parseInt(req.params.id, 10);
    if (isNaN(accountId)) {
      return res.status(400).json({
        success: false,
        message: "ID rekening tidak valid"
      });
    }

    const result = await accountService.deleteAccount(req.user.id, accountId);
    return res.status(200).json({
      success: true,
      message: `Rekening "${result.name}" berhasil dihapus`,
      data: result
    });
  } catch (error) {
    next(error);
  }
};
