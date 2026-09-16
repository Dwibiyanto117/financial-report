import prisma from "../config/prisma.js";

export const getCategories = async (userId, type) => {
  const whereClause = {
    OR: [
      { isDefault: true, userId: null },
      { userId: userId }
    ]
  };

  if (type && (type === "INCOME" || type === "EXPENSE")) {
    whereClause.type = type;
  }

  return await prisma.category.findMany({
    where: whereClause,
    orderBy: [
      { isDefault: "desc" },
      { name: "asc" }
    ]
  });
};

export const createCategory = async (userId, { name, type, icon, color }) => {
  if (!name || !type) {
    const error = new Error("Nama dan tipe kategori (INCOME/EXPENSE) wajib diisi");
    error.statusCode = 400;
    throw error;
  }

  if (type !== "INCOME" && type !== "EXPENSE") {
    const error = new Error("Tipe kategori harus INCOME atau EXPENSE");
    error.statusCode = 400;
    throw error;
  }

  return await prisma.category.create({
    data: {
      userId,
      name: name.trim(),
      type,
      icon: icon || "tag",
      color: color || "#10B981",
      isDefault: false
    }
  });
};

export const updateCategory = async (userId, id, { name, icon, color }) => {
  const category = await prisma.category.findUnique({
    where: { id: Number(id) }
  });

  if (!category) {
    const error = new Error("Kategori tidak ditemukan");
    error.statusCode = 404;
    throw error;
  }

  if (category.isDefault || category.userId !== userId) {
    const error = new Error("Anda tidak memiliki izin untuk mengubah kategori bawaan sistem atau milik orang lain");
    error.statusCode = 403;
    throw error;
  }

  return await prisma.category.update({
    where: { id: Number(id) },
    data: {
      name: name !== undefined ? name.trim() : category.name,
      icon: icon !== undefined ? icon : category.icon,
      color: color !== undefined ? color : category.color
    }
  });
};

export const deleteCategory = async (userId, id) => {
  const category = await prisma.category.findUnique({
    where: { id: Number(id) },
    include: {
      _count: {
        select: { transactions: true }
      }
    }
  });

  if (!category) {
    const error = new Error("Kategori tidak ditemukan");
    error.statusCode = 404;
    throw error;
  }

  if (category.isDefault || category.userId !== userId) {
    const error = new Error("Kategori bawaan sistem tidak dapat dihapus");
    error.statusCode = 403;
    throw error;
  }

  if (category._count.transactions > 0) {
    const error = new Error(`Kategori ini tidak dapat dihapus karena sudah terikat dengan ${category._count.transactions} transaksi`);
    error.statusCode = 400;
    throw error;
  }

  await prisma.category.delete({
    where: { id: Number(id) }
  });

  return { success: true, message: "Kategori berhasil dihapus" };
};