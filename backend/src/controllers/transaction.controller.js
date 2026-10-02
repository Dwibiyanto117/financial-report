import * as transactionService from "../services/transaction.service.js";

export const createTransaction = async (req, res, next) => {
  try {
    const { accountId, account_id, categoryId, type, amount, transactionDate, description } = req.body;
    const result = await transactionService.createTransaction(req.user.id, {
      accountId: accountId ?? account_id,
      categoryId,
      type,
      amount,
      transactionDate,
      description
    });

    return res.status(201).json({
      success: true,
      message: "Transaksi berhasil dicatat",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getTransactions = async (req, res, next) => {
  try {
    const result = await transactionService.getTransactions(req.user.id, req.query);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const getTransactionById = async (req, res, next) => {
  try {
    const result = await transactionService.getTransactionById(req.user.id, req.params.id);
    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const updateTransaction = async (req, res, next) => {
  try {
    const result = await transactionService.updateTransaction(req.user.id, req.params.id, req.body);
    return res.status(200).json({
      success: true,
      message: "Transaksi berhasil diperbarui",
      data: result
    });
  } catch (error) {
    next(error);
  }
};

export const deleteTransaction = async (req, res, next) => {
  try {
    const result = await transactionService.deleteTransaction(req.user.id, req.params.id);
    return res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};