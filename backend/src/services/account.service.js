import prisma from "../config/prisma.js";

/**
 * Helper to compute balance for accounts from transaction aggregations
 */
function computeAccountBalances(accounts, aggregations) {
  // Map aggregates by accountId
  const aggMap = new Map();
  for (const agg of aggregations) {
    if (!aggMap.has(agg.accountId)) {
      aggMap.set(agg.accountId, {
        income: 0,
        expense: 0,
        transferIn: 0,
        transferOut: 0
      });
    }
    const bucket = aggMap.get(agg.accountId);
    const sumVal = Number(agg._sum.amount || 0);
    if (agg.type === "INCOME") bucket.income += sumVal;
    else if (agg.type === "EXPENSE") bucket.expense += sumVal;
    else if (agg.type === "TRANSFER_IN") bucket.transferIn += sumVal;
    else if (agg.type === "TRANSFER_OUT") bucket.transferOut += sumVal;
  }

  return accounts.map((account) => {
    const bucket = aggMap.get(account.id) || {
      income: 0,
      expense: 0,
      transferIn: 0,
      transferOut: 0
    };
    const opening = Number(account.openingBalance);
    const currentBalance = opening + bucket.income - bucket.expense + bucket.transferIn - bucket.transferOut;

    return {
      ...account,
      openingBalance: opening,
      currentBalance,
      totals: {
        income: bucket.income,
        expense: bucket.expense,
        transferIn: bucket.transferIn,
        transferOut: bucket.transferOut
      }
    };
  });
}

export const getAccounts = async (userId, { includeArchived = false } = {}) => {
  const where = { userId };
  if (!includeArchived) {
    where.isArchived = false;
  }

  const accounts = await prisma.account.findMany({
    where,
    orderBy: [
      { isArchived: "asc" },
      { createdAt: "asc" }
    ]
  });

  const accountIds = accounts.map((a) => a.id);
  const aggregations = await prisma.transaction.groupBy({
    by: ["accountId", "type"],
    where: {
      userId,
      accountId: { in: accountIds }
    },
    _sum: { amount: true }
  });

  return computeAccountBalances(accounts, aggregations);
};

export const getAccountById = async (userId, accountId) => {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId }
  });

  if (!account) {
    const error = new Error("Rekening tidak ditemukan");
    error.statusCode = 404;
    throw error;
  }

  const aggregations = await prisma.transaction.groupBy({
    by: ["accountId", "type"],
    where: { accountId, userId },
    _sum: { amount: true }
  });

  const [computed] = computeAccountBalances([account], aggregations);
  return computed;
};

export const createAccount = async (userId, data) => {
  const {
    name,
    institution = "LAINNYA",
    type = "BANK",
    accountNoMasked = null,
    openingBalance = 0,
    color = "#10B981"
  } = data;

  const validTypes = ["BANK", "EWALLET", "CASH"];
  if (!validTypes.includes(type)) {
    const error = new Error(`Tipe rekening tidak valid. Pilihan: ${validTypes.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }

  const numOpening = Number(openingBalance) || 0;

  const newAccount = await prisma.account.create({
    data: {
      userId,
      name: name.trim(),
      institution: institution.trim().toUpperCase(),
      type,
      accountNoMasked: accountNoMasked ? accountNoMasked.trim() : null,
      openingBalance: numOpening,
      color: color || "#10B981"
    }
  });

  return {
    ...newAccount,
    openingBalance: numOpening,
    currentBalance: numOpening,
    totals: { income: 0, expense: 0, transferIn: 0, transferOut: 0 }
  };
};

export const updateAccount = async (userId, accountId, data) => {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId }
  });

  if (!account) {
    const error = new Error("Rekening tidak ditemukan");
    error.statusCode = 404;
    throw error;
  }

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name.trim();
  if (data.institution !== undefined) updateData.institution = data.institution.trim().toUpperCase();
  if (data.type !== undefined) {
    const validTypes = ["BANK", "EWALLET", "CASH"];
    if (!validTypes.includes(data.type)) {
      const error = new Error(`Tipe rekening tidak valid. Pilihan: ${validTypes.join(", ")}`);
      error.statusCode = 400;
      throw error;
    }
    updateData.type = data.type;
  }
  if (data.accountNoMasked !== undefined) {
    updateData.accountNoMasked = data.accountNoMasked ? data.accountNoMasked.trim() : null;
  }
  if (data.openingBalance !== undefined) {
    updateData.openingBalance = Number(data.openingBalance) || 0;
  }
  if (data.color !== undefined) updateData.color = data.color.trim();
  if (data.isArchived !== undefined) updateData.isArchived = Boolean(data.isArchived);

  const updated = await prisma.account.update({
    where: { id: accountId },
    data: updateData
  });

  return getAccountById(userId, updated.id);
};

export const deleteAccount = async (userId, accountId) => {
  const account = await prisma.account.findFirst({
    where: { id: accountId, userId }
  });

  if (!account) {
    const error = new Error("Rekening tidak ditemukan");
    error.statusCode = 404;
    throw error;
  }

  const transactionCount = await prisma.transaction.count({
    where: { accountId, userId }
  });

  if (transactionCount > 0) {
    const error = new Error(
      `Rekening tidak dapat dihapus karena memiliki ${transactionCount} transaksi terkait. Silakan arsipkan rekening ini jika sudah tidak digunakan.`
    );
    error.statusCode = 400;
    throw error;
  }

  // Ensure user keeps at least one account
  const totalAccounts = await prisma.account.count({
    where: { userId }
  });
  if (totalAccounts <= 1) {
    const error = new Error("Anda tidak dapat menghapus satu-satunya rekening yang tersisa.");
    error.statusCode = 400;
    throw error;
  }

  await prisma.account.delete({
    where: { id: accountId }
  });

  return { id: accountId, name: account.name };
};
