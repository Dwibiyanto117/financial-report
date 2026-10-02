import crypto from "crypto";
import prisma from "../config/prisma.js";
import { parseDateParam } from "../utils/query.js";

export const executeTransfer = async (userId, data) => {
  const {
    fromAccountId,
    toAccountId,
    amount,
    date,
    transactionDate,
    description,
    adminFee = 0
  } = data;

  const fromId = parseInt(fromAccountId, 10);
  const toId = parseInt(toAccountId, 10);
  const transferAmount = Number(amount);
  const fee = Number(adminFee) || 0;

  if (!fromId || isNaN(fromId)) {
    const error = new Error("Rekening asal wajib dipilih");
    error.statusCode = 400;
    throw error;
  }

  if (!toId || isNaN(toId)) {
    const error = new Error("Rekening tujuan wajib dipilih");
    error.statusCode = 400;
    throw error;
  }

  if (fromId === toId) {
    const error = new Error("Rekening asal dan rekening tujuan tidak boleh sama");
    error.statusCode = 400;
    throw error;
  }

  if (isNaN(transferAmount) || transferAmount <= 0) {
    const error = new Error("Nominal transfer harus lebih besar dari 0");
    error.statusCode = 400;
    throw error;
  }

  // Parse transaction date
  const rawDate = date || transactionDate;
  let parsedDate;
  if (rawDate) {
    parsedDate = parseDateParam(rawDate, "Tanggal transfer");
  } else {
    parsedDate = new Date();
  }

  // Verify accounts belong to user
  const [fromAccount, toAccount] = await Promise.all([
    prisma.account.findFirst({ where: { id: fromId, userId } }),
    prisma.account.findFirst({ where: { id: toId, userId } })
  ]);

  if (!fromAccount) {
    const error = new Error("Rekening asal tidak ditemukan");
    error.statusCode = 404;
    throw error;
  }

  if (!toAccount) {
    const error = new Error("Rekening tujuan tidak ditemukan");
    error.statusCode = 404;
    throw error;
  }

  if (fromAccount.isArchived) {
    const error = new Error("Rekening asal dalam status diarsipkan");
    error.statusCode = 400;
    throw error;
  }

  if (toAccount.isArchived) {
    const error = new Error("Rekening tujuan dalam status diarsipkan");
    error.statusCode = 400;
    throw error;
  }

  const transferGroupId = crypto.randomUUID();
  const descText = description ? description.trim() : null;

  return await prisma.$transaction(async (tx) => {
    // 1. TRANSFER_OUT from source account
    const transferOut = await tx.transaction.create({
      data: {
        userId,
        accountId: fromId,
        categoryId: null,
        type: "TRANSFER_OUT",
        amount: transferAmount,
        currency: "IDR",
        transactionDate: parsedDate,
        description: descText || `Transfer ke ${toAccount.name}`,
        transferGroupId
      },
      include: {
        account: true
      }
    });

    // 2. TRANSFER_IN to target account
    const transferIn = await tx.transaction.create({
      data: {
        userId,
        accountId: toId,
        categoryId: null,
        type: "TRANSFER_IN",
        amount: transferAmount,
        currency: "IDR",
        transactionDate: parsedDate,
        description: descText || `Transfer dari ${fromAccount.name}`,
        transferGroupId
      },
      include: {
        account: true
      }
    });

    // 3. Optional admin fee
    let feeTx = null;
    if (fee > 0) {
      // Find category for admin fee if exists, or null
      const adminCat = await tx.category.findFirst({
        where: {
          type: "EXPENSE",
          OR: [
            { name: { contains: "Biaya" } },
            { name: { contains: "Lainnya" } }
          ]
        }
      });

      feeTx = await tx.transaction.create({
        data: {
          userId,
          accountId: fromId,
          categoryId: adminCat ? adminCat.id : null,
          type: "EXPENSE",
          amount: fee,
          currency: "IDR",
          transactionDate: parsedDate,
          description: `Biaya transfer (${fromAccount.name} -> ${toAccount.name})`
        }
      });
    }

    return {
      transferGroupId,
      transferOut,
      transferIn,
      adminFee: feeTx
    };
  });
};

export const deleteTransfer = async (userId, transferGroupId) => {
  if (!transferGroupId) {
    const error = new Error("Group ID transfer wajib diisi");
    error.statusCode = 400;
    throw error;
  }

  const transactions = await prisma.transaction.findMany({
    where: { transferGroupId, userId }
  });

  if (transactions.length === 0) {
    const error = new Error("Data transfer tidak ditemukan");
    error.statusCode = 404;
    throw error;
  }

  await prisma.transaction.deleteMany({
    where: { transferGroupId, userId }
  });

  return {
    transferGroupId,
    deletedCount: transactions.length
  };
};

export const getTransferByGroupId = async (userId, transferGroupId) => {
  const transactions = await prisma.transaction.findMany({
    where: { transferGroupId, userId },
    include: { account: true }
  });

  if (transactions.length === 0) {
    const error = new Error("Data transfer tidak ditemukan");
    error.statusCode = 404;
    throw error;
  }

  const transferOut = transactions.find((t) => t.type === "TRANSFER_OUT");
  const transferIn = transactions.find((t) => t.type === "TRANSFER_IN");

  return {
    transferGroupId,
    transferOut,
    transferIn
  };
};
