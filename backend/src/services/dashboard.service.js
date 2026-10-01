import prisma from "../config/prisma.js";
import { parseDateRange, parseIntParam, getParam } from "../utils/query.js";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];

/**
 * Rentang tanggal yang dipakai seluruh endpoint dashboard.
 *
 * Bila klien mengirim rentang eksplisit, rentang itu dipakai apa adanya.
 * Bila tidak, sistem jatuh ke bulan berjalan. Bila klien mengirim `month`
 * dan/atau `year` (sesuai kontrak API), kombinasi itu yang dipakai sehingga
 * permintaan seperti `?month=9&year=2026` tidak lagi diabaikan diam-diam.
 */
function resolvePeriod(query) {
  const { startDate, endDate } = parseDateRange(query);

  if (startDate || endDate) {
    return { startDate, endDate };
  }

  const now = new Date();
  const requestedMonth = parseIntParam(getParam(query, "month"), "bulan", { strict: true, min: 1, max: 12 });
  const requestedYear = parseIntParam(getParam(query, "year"), "tahun", { strict: true, min: 1970, max: 9999 });

  if (requestedMonth !== null || requestedYear !== null) {
    const year = requestedYear ?? now.getFullYear();
    const monthIndex = (requestedMonth ?? now.getMonth() + 1) - 1;
    return {
      startDate: new Date(year, monthIndex, 1),
      endDate: new Date(year, monthIndex + 1, 0, 23, 59, 59)
    };
  }

  return {
    startDate: new Date(now.getFullYear(), now.getMonth(), 1),
    endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)
  };
}

function buildDateFilter({ startDate, endDate }) {
  const filter = {};
  if (startDate) filter.gte = startDate;
  if (endDate) filter.lte = endDate;
  return filter;
}

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
  const period = resolvePeriod(query);
  const periodDateFilter = buildDateFilter(period);

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
      startDate: period.startDate ? period.startDate.toISOString().split("T")[0] : null,
      endDate: period.endDate ? period.endDate.toISOString().split("T")[0] : null,
      income: periodIncome,
      expense: periodExpense,
      net: netBalance,
      transactionCount
    },
    currency: "IDR"
  };
};

export const getCategoryBreakdown = async (userId, query = {}) => {
  const type = getParam(query, "type")?.toUpperCase() === "INCOME" ? "INCOME" : "EXPENSE";

  const periodDateFilter = buildDateFilter(resolvePeriod(query));

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
  const year = parseIntParam(getParam(query, "year"), "tahun", { strict: true, min: 1970, max: 9999 }) ?? currentYear;

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

  const trend = MONTH_NAMES.map((name, index) => ({
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
