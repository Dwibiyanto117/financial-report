import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Plus,
  ArrowRight,
  Calendar,
  Loader2,
  PieChart as PieIcon
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend
} from "recharts";
import api from "../services/api";
import { formatCurrency } from "../utils/currency";

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [breakdown, setBreakdown] = useState([]);
  const [trend, setTrend] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        const [sumRes, breakRes, trendRes, txRes] = await Promise.all([
          api.get("/dashboard/summary"),
          api.get("/dashboard/category-breakdown?type=EXPENSE"),
          api.get(`/dashboard/monthly-trend?year=${new Date().getFullYear()}`),
          api.get("/transactions?limit=5")
        ]);

        if (sumRes.data.success) setSummary(sumRes.data.data);
        if (breakRes.data.success) setBreakdown(breakRes.data.data.items || []);
        if (trendRes.data.success) setTrend(trendRes.data.data.trend || []);
        if (txRes.data.success) setRecentTransactions(txRes.data.data.items || []);
      } catch (err) {
        console.error("Gagal memuat data dashboard:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Dashboard Ringkasan</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Pantau arus kas, saldo berjalan, dan tren keuangan Anda bulan ini.
          </p>
        </div>

        <Link
          to="/transactions?action=create"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Transaksi</span>
        </Link>
      </div>

      {/* Summary Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo Berjalan */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Saldo Berjalan</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 mt-2">
            {formatCurrency(summary?.runningBalance || 0)}
          </div>
          <span className="text-xs font-semibold text-emerald-600 mt-1 inline-block">
            Akumulasi seluruh transaksi
          </span>
        </div>

        {/* Pemasukan Bulan Ini */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pemasukan Bulan Ini</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 mt-2">
            {formatCurrency(summary?.period?.income || 0)}
          </div>
          <span className="text-xs text-slate-400 mt-1 inline-block">
            Periode {summary?.period?.startDate} s.d. {summary?.period?.endDate}
          </span>
        </div>

        {/* Pengeluaran Bulan Ini */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pengeluaran Bulan Ini</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 mt-2">
            {formatCurrency(summary?.period?.expense || 0)}
          </div>
          <span className="text-xs text-slate-400 mt-1 inline-block">
            Periode {summary?.period?.startDate} s.d. {summary?.period?.endDate}
          </span>
        </div>

        {/* Selisih Bersih (Net) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Selisih Bersih (Net)</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-black mt-2 ${
              (summary?.period?.net || 0) >= 0 ? "text-indigo-600" : "text-rose-600"
            }`}
          >
            {formatCurrency(summary?.period?.net || 0)}
          </div>
          <span className="text-xs font-semibold text-slate-400 mt-1 inline-block">
            {(summary?.period?.net || 0) >= 0 ? "Surplus Finansial" : "Defisit Finansial"}
          </span>
        </div>
      </div>

      {/* Visual Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tren Bulanan (Bar Chart) */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Tren Arus Kas Bulanan ({new Date().getFullYear()})</h2>
              <p className="text-xs text-slate-500">Perbandingan pemasukan vs pengeluaran per bulan</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="month" stroke="#94A3B8" fontSize={12} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={11} tickLine={false} tickFormatter={(val) => `${val / 1000000}M`} />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), ""]}
                  contentStyle={{ backgroundColor: "#FFFFFF", borderRadius: "8px", border: "1px solid #E2E8F0" }}
                />
                <Legend wrapperStyle={{ fontSize: "12px", paddingTop: "10px" }} />
                <Bar dataKey="income" name="Pemasukan" fill="#10B981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" name="Pengeluaran" fill="#F43F5E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Komposisi Pengeluaran (Donut Chart) */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-col">
          <div className="mb-3">
            <h2 className="text-base font-bold text-slate-900">Komposisi Pengeluaran</h2>
            <p className="text-xs text-slate-500">Berdasarkan kategori bulan ini</p>
          </div>

          {breakdown.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <PieIcon className="w-10 h-10 mb-2 stroke-1" />
              <p className="text-xs">Belum ada catatan pengeluaran di periode ini</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center">
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={breakdown}
                      dataKey="totalAmount"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={3}
                    >
                      {breakdown.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color || "#6B7280"} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatCurrency(value), "Total"]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Legend List */}
              <div className="mt-3 space-y-1.5 max-h-40 overflow-y-auto pr-1">
                {breakdown.slice(0, 5).map((cat) => (
                  <div key={cat.id} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color || "#6B7280" }}
                      />
                      <span className="text-slate-700 truncate">{cat.name}</span>
                    </div>
                    <span className="font-semibold text-slate-900 ml-2">{cat.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Transactions List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Transaksi Terbaru</h2>
            <p className="text-xs text-slate-500">Daftar mutasi keuangan paling akhir</p>
          </div>
          <Link
            to="/transactions"
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
          >
            <span>Lihat Semua</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="text-center py-8 text-slate-400 text-xs">
            Belum ada transaksi yang dicatat. Mulai catat transaksi pertama Anda!
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentTransactions.map((tx) => (
              <div key={tx.id} className="py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold"
                    style={{
                      backgroundColor: `${tx.category?.color || "#10B981"}20`,
                      color: tx.category?.color || "#10B981"
                    }}
                  >
                    {tx.type === "INCOME" ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800">
                      {tx.description || tx.category?.name}
                    </div>
                    <div className="text-xs text-slate-400 flex items-center gap-2">
                      <span>{new Date(tx.transactionDate).toLocaleDateString("id-ID")}</span>
                      <span>•</span>
                      <span className="font-medium text-slate-500">{tx.category?.name}</span>
                    </div>
                  </div>
                </div>

                <div
                  className={`text-sm font-bold ${
                    tx.type === "INCOME" ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {tx.type === "INCOME" ? "+" : "-"}
                  {formatCurrency(tx.amount)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}