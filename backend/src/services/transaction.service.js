import prisma from "../config/prisma.js";
import { parseDateRange, parseDateParam, parseIntParam, parseEnumParam, getParam } from "../utils/query.js";

const TRANSACTION_TYPES = ["INCOME", "EXPENSE"];

const CATEGORY_SELECT = {
  id: true,
  name: true,
  type: true,
  icon: true,
  color: true
};

/**
 * Memastikan kategori yang dipilih benar-benar milik user atau kategori
 * bawaan sistem.
 */
async function resolveCategory(userId, categoryId) {
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

  return category;
}

/**
 * Kategori bertipe INCOME hanya untuk pemasukan, EXPENSE hanya untuk
 * pengeluaran. Tanpa aturan ini saldo berjalan dan grafik komposisi kategori
 * menjadi tidak konsisten dengan tipe transaksinya.
 */
function assertCategoryMatchesType(category, type) {
  if (category.type !== type) {
    const error = new Error(
      `Kategori "${category.name}" bertipe ${category.type}, tidak dapat dipakai untuk transaksi ${type}`
    );
    error.statusCode = 400;
    throw error;
  }
}

function parseAmount(amount) {
  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    const error = new Error("Nominal transaksi harus berupa angka positif");
    error.statusCode = 400;
    throw error;
  }
  return numAmount;
}

function requireTransactionType(value) {
  const type = parseEnumParam(value, "tipe transaksi", TRANSACTION_TYPES);
  if (!type) {
    const error = new Error("Tipe transaksi wajib diisi (INCOME atau EXPENSE)");
    error.statusCode = 400;
    throw error;
  }
  return type;
}

export const createTransaction = async (userId, { categoryId, type, amount, transactionDate, description }) => {
  const numAmount = parseAmount(amount);
  const transactionType = requireTransactionType(type);

  const category = await resolveCategory(userId, categoryId);
  assertCategoryMatchesType(category, transactionType);

  const parsedDate = transactionDate
    ? parseDateParam(String(transactionDate), "tanggal transaksi")
    : new Date();

  return await prisma.transaction.create({
    data: {
      userId,
      categoryId: category.id,
      type: transactionType,
      amount: numAmount,
      currency: "IDR",
      transactionDate: parsedDate,
      description: description ? String(description).trim() : null
    },
    include: {
      category: { select: CATEGORY_SELECT }
    }
  });
};

export const getTransactions = async (userId, query = {}) => {
  const page = parseIntParam(getParam(query, "page"), "halaman", { min: 1 }) ?? 1;
  const limit = parseIntParam(getParam(query, "limit"), "batas data", { min: 1, max: 100 }) ?? 20;
  const skip = (page - 1) * limit;

  const whereClause = { userId };

  const typeFilter = parseEnumParam(getParam(query, "type"), "tipe transaksi", TRANSACTION_TYPES);
  if (typeFilter) {
    whereClause.type = typeFilter;
  }

  const categoryId = parseIntParam(getParam(query, "categoryId", "category_id"), "kategori", {
    strict: true,
    min: 1
  });
  if (categoryId !== null) {
    whereClause.categoryId = categoryId;
  }

  const { startDate, endDate } = parseDateRange(query);
  if (startDate || endDate) {
    whereClause.transactionDate = {};
    if (startDate) whereClause.transactionDate.gte = startDate;
    if (endDate) whereClause.transactionDate.lte = endDate;
  }

  const search = getParam(query, "search");
  if (search) {
    whereClause.description = { contains: search };
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
        category: { select: CATEGORY_SELECT }
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
    updatePayload.amount = parseAmount(data.amount);
  }

  if (data.type !== undefined) {
    updatePayload.type = requireTransactionType(data.type);
  }

  if (data.categoryId !== undefined) {
    const category = await resolveCategory(userId, data.categoryId);
    updatePayload.categoryId = category.id;
  }

  // Konsistensi kategori dan tipe diperiksa terhadap nilai akhir transaksi,
  // sehingga mengubah salah satu saja tetap menghasilkan data yang sah.
  const nextType = updatePayload.type ?? existing.type;
  const nextCategory = updatePayload.categoryId !== undefined
    ? await prisma.category.findUnique({ where: { id: updatePayload.categoryId } })
    : existing.category;

  if (nextCategory) {
    assertCategoryMatchesType(nextCategory, nextType);
  }

  if (data.transactionDate !== undefined) {
    updatePayload.transactionDate = parseDateParam(String(data.transactionDate), "tanggal transaksi");
  }

  if (data.description !== undefined) {
    updatePayload.description = data.description ? String(data.description).trim() : null;
  }

  return await prisma.transaction.update({
    where: { id: existing.id },
    data: updatePayload,
    include: {
      category: { select: CATEGORY_SELECT }
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
