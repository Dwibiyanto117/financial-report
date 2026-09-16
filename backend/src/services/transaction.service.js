import prisma from "../config/prisma.js";

export const createTransaction = async (userId, { categoryId, type, amount, transactionDate, description }) => {
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    const error = new Error("Nominal transaksi harus berupa angka positif");
    error.statusCode = 400;
    throw error;
  }

  if (type !== "INCOME" && type !== "EXPENSE") {
    const error = new Error("Tipe transaksi harus INCOME atau EXPENSE");
    error.statusCode = 400;
    throw error;
  }

  // Validasi kategori milik user atau bawaan sistem
  const category = await prisma.category.findFirst({
    where: {
      id: Number(categoryId),
      OR: [
        { isDefault: true, userId: null },
        { userId: userId }
      ]
    }
  });

  if (!category) {
    const error = new Error("Kategori yang dipilih tidak valid atau tidak ditemukan");
    error.statusCode = 400;
    throw error;
  }

  const parsedDate = transactionDate ? new Date(transactionDate) : new Date();

  return await prisma.transaction.create({
    data: {
      userId,
      categoryId: category.id,
      type,
      amount: numAmount,
      currency: "IDR",
      transactionDate: parsedDate,
      description: description ? description.trim() : null
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
};

export const getTransactions = async (userId, query = {}) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.max(1, Math.min(100, parseInt(query.limit) || 20));
  const skip = (page - 1) * limit;

  const whereClause = { userId };

  if (query.type && (query.type === "INCOME" || query.type === "EXPENSE")) {
    whereClause.type = query.type;
  }

  if (query.categoryId) {
    whereClause.categoryId = Number(query.categoryId);
  }

  if (query.startDate || query.endDate) {
    whereClause.transactionDate = {};
    if (query.startDate) {
      whereClause.transactionDate.gte = new Date(query.startDate);
    }
    if (query.endDate) {
      whereClause.transactionDate.lte = new Date(query.endDate);
    }
  }

  if (query.search) {
    whereClause.description = {
      contains: query.search.trim()
    };
  }

  const [total, items] = await Promise.all([
    prisma.transaction.count({ where: whereClause }),
    prisma.transaction.findMany({
      where: whereClause,
      skip,
      take: limit,
      orderBy: [
        { transactionDate: "desc" },
        { id: "desc" }
      ],
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
    })
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1
    }
  };
};

export const getTransactionById = async (userId, id) => {
  const transaction = await prisma.transaction.findFirst({
    where: {
      id: Number(id),
      userId
    },
    include: {
      category: true
    }
  });

  if (!transaction) {
    const error = new Error("Transaksi tidak ditemukan");
    error.statusCode = 404;
    throw error;
  }

  return transaction;
};

export const updateTransaction = async (userId, id, data) => {
  const existing = await getTransactionById(userId, id);

  const updatePayload = {};

  if (data.amount !== undefined) {
    const numAmount = parseFloat(data.amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      const error = new Error("Nominal transaksi harus berupa angka positif");
      error.statusCode = 400;
      throw error;
    }
    updatePayload.amount = numAmount;
  }

  if (data.type !== undefined) {
    if (data.type !== "INCOME" && data.type !== "EXPENSE") {
      const error = new Error("Tipe transaksi harus INCOME atau EXPENSE");
      error.statusCode = 400;
      throw error;
    }
    updatePayload.type = data.type;
  }

  if (data.categoryId !== undefined) {
    const category = await prisma.category.findFirst({
      where: {
        id: Number(data.categoryId),
        OR: [
          { isDefault: true, userId: null },
          { userId }
        ]
      }
    });

    if (!category) {
      const error = new Error("Kategori yang dipilih tidak valid");
      error.statusCode = 400;
      throw error;
    }
    updatePayload.categoryId = category.id;
  }

  if (data.transactionDate !== undefined) {
    updatePayload.transactionDate = new Date(data.transactionDate);
  }

  if (data.description !== undefined) {
    updatePayload.description = data.description ? data.description.trim() : null;
  }

  return await prisma.transaction.update({
    where: { id: existing.id },
    data: updatePayload,
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
};

export const deleteTransaction = async (userId, id) => {
  const existing = await getTransactionById(userId, id);

  await prisma.transaction.delete({
    where: { id: existing.id }
  });

  return { success: true, message: "Transaksi berhasil dihapus" };
};