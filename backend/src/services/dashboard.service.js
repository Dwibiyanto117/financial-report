import prisma from "../config/prisma.js";

export const getSummary = async (userId, query = {}) => {
  // 1. Kalkulasi Running Balance (sepanjang masa)
  const [allIncome, allExpense] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { userId, type: "INCOME" }
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: { userId, type: "EXPENSE" }
    })
  ]);

  const totalAllTimeIncome = Number(allIncome._sum.amount || 0);
  const totalAllTimeExpense = Number(allExpense._sum.amount || 0);
  const runningBalance = totalAllTimeIncome - totalAllTimeExpense;

  // 2. Kalkulasi Metrik Periode Tertentu
  let startDate = query.startDate ? new Date(query.startDate) : null;
  let endDate = query.endDate ? new Date(query.endDate) : null;

  // Default jika tidak ada filter: Bulan berjalan
  if (!startDate && !endDate) {
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  }

  const periodDateFilter = {};
  if (startDate) periodDateFilter.gte = startDate;
  if (endDate) periodDateFilter.lte = endDate;

  const [periodIncomeAgg, periodExpenseAgg, transactionCount] = await Promise.all([
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        type: "INCOME",
        transactionDate: periodDateFilter
      }
    }),
    prisma.transaction.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        type: "EXPENSE",
        transactionDate: periodDateFilter
      }
    }),
    prisma.transaction.count({
      where: {
        userId,
        transactionDate: periodDateFilter
      }
    })
  ]);

  const periodIncome = Number(periodIncomeAgg._sum.amount || 0);
  const periodExpense = Number(periodExpenseAgg._sum.amount || 0);
  const netBalance = periodIncome - periodExpense;

  return {
    runningBalance,
    period: {
      startDate: startDate ? startDate.toISOString().split("T")[0] : null,
      endDate: endDate ? endDate.toISOString().split("T")[0] : null,
      income: periodIncome,
      expense: periodExpense,
      net: netBalance,
      transactionCount
    },
    currency: "IDR"
  };
};

export const getCategoryBreakdown = async (userId, query = {}) => {
  const type = query.type === "INCOME" ? "INCOME" : "EXPENSE";

  let startDate = query.startDate ? new Date(query.startDate) : null;
  let endDate = query.endDate ? new Date(query.endDate) : null;

  if (!startDate && !endDate) {
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  }

  const periodDateFilter = {};
  if (startDate) periodDateFilter.gte = startDate;
  if (endDate) periodDateFilter.lte = endDate;

  // Query transaksi dalam periode dengan kategorinya
  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      type,
      transactionDate: periodDateFilter
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
          color: true,
          icon: true
        }
      }
    }
  });

  const categoryMap = new Map();
  let totalAmount = 0;

  for (const t of transactions) {
    const amount = Number(t.amount);
    totalAmount += amount;

    const catId = t.category.id;
    if (!categoryMap.has(catId)) {
      categoryMap.set(catId, {
        id: catId,
        name: t.category.name,
        color: t.category.color,
        icon: t.category.icon,
        totalAmount: 0,
        count: 0
      });
    }

    const entry = categoryMap.get(catId);
    entry.totalAmount += amount;
    entry.count += 1;
  }

  const items = Array.from(categoryMap.values()).map(item => ({
    ...item,
    percentage: totalAmount > 0 ? Number(((item.totalAmount / totalAmount) * 100).toFixed(1)) : 0
  }));

  // Urutkan dari nominal terbesar
  items.sort((a, b) => b.totalAmount - a.totalAmount);

  return {
    type,
    totalAmount,
    items
  };
};

export const getMonthlyTrend = async (userId, query = {}) => {
  const currentYear = new Date().getFullYear();
  const year = parseInt(query.year) || currentYear;

  const startOfYear = new Date(year, 0, 1);
  const endOfYear = new Date(year, 11, 31, 23, 59, 59);

  const transactions = await prisma.transaction.findMany({
    where: {
      userId,
      transactionDate: {
        gte: startOfYear,
        lte: endOfYear
      }
    },
    select: {
      type: true,
      amount: true,
      transactionDate: true
    }
  });

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

  const trend = monthNames.map((name, index) => ({
    month: name,
    monthIndex: index + 1,
    income: 0,
    expense: 0,
    net: 0
  }));

  for (const t of transactions) {
    const month = new Date(t.transactionDate).getMonth();
    const amount = Number(t.amount);

    if (t.type === "INCOME") {
      trend[month].income += amount;
    } else {
      trend[month].expense += amount;
    }
  }

  for (const item of trend) {
    item.net = item.income - item.expense;
  }

  return {
    year,
    trend
  };
};