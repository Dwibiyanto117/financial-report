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
  PieChart as PieIcon,
  Landmark,
  ArrowRightLeft
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
import { getAccounts } from "../services/accountService";
import { formatCurrency } from "../utils/currency";

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [breakdown, setBreakdown] = useState([]);
  const [trend, setTrend] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch accounts on mount
  useEffect(() => {
    async function loadAccounts() {
      try {
        const res = await getAccounts();
        if (res.success) setAccounts(res.data);
      } catch (err) {
        console.error("Gagal memuat daftar rekening:", err);
      }
    }
    loadAccounts();
  }, []);

  // Fetch dashboard data when selectedAccountId changes
  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        const accountParam = selectedAccountId ? `&accountId=${selectedAccountId}` : "";
        const accountParamSolo = selectedAccountId ? `?accountId=${selectedAccountId}` : "";

        const [sumRes, breakRes, trendRes, txRes] = await Promise.all([
          api.get(`/dashboard/summary${accountParamSolo}`),
          api.get(`/dashboard/category-breakdown?type=EXPENSE${accountParam}`),
          api.get(`/dashboard/monthly-trend?year=${new Date().getFullYear()}${accountParam}`),
          api.get(`/transactions?limit=5${accountParam}`)
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
  }, [selectedAccountId]);

  if (loading && !summary) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  const selectedAccountObj = accounts.find((a) => String(a.id) === String(selectedAccountId));

  return (
    <div className="space-y-6 pb-8">
      {/* Header Banner & Account Filter */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Dashboard Ringkasan</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Pantau arus kas, saldo berjalan, dan tren keuangan Anda bulan ini.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Account Filter Dropdown */}
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-2 rounded-xl shadow-xs">
            <Landmark className="w-4 h-4 text-slate-400" />
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="text-xs sm:text-sm font-semibold text-slate-700 bg-transparent focus:outline-hidden cursor-pointer"
            >
              <option value="">Semua Rekening</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({formatCurrency(a.currentBalance)})
                </option>
              ))}
            </select>
          </div>

          <Link
            to="/transactions"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Transaksi</span>
          </Link>
        </div>
      </div>

      {/* Account Quick Pills */}
      {accounts.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedAccountId("")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
              selectedAccountId === ""
                ? "bg-slate-800 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <span>Semua Rekening</span>
            <span className="text-[10px] opacity-80 font-normal">
              ({accounts.length})
            </span>
          </button>
          {accounts.map((acc) => (
            <button
              key={acc.id}
              onClick={() => setSelectedAccountId(String(acc.id))}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition ${
                String(selectedAccountId) === String(acc.id)
                  ? "text-white shadow-xs"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
              style={{
                backgroundColor:
                  String(selectedAccountId) === String(acc.id) ? acc.color || "#003D79" : undefined
              }}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: String(selectedAccountId) === String(acc.id) ? "#fff" : acc.color || "#003D79"
                }}
              />
              <span>{acc.name}</span>
              <span className="text-[11px] font-bold opacity-90">
                {formatCurrency(acc.currentBalance)}
              </span>
            </button>
          ))}
          <Link
            to="/accounts"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-600 hover:text-emerald-700 shrink-0"
          >
            <span>Kelola Rekening</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Running Balance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              {selectedAccountObj ? `Saldo ${selectedAccountObj.name}` : "Saldo Berjalan (Semua)"}
            </span>
            <div
              className="p-2 rounded-xl text-white"
              style={{ backgroundColor: selectedAccountObj ? selectedAccountObj.color || "#059669" : "#059669" }}
            >
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight">
            {formatCurrency(summary?.runningBalance || 0)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {selectedAccountObj ? `Institusi: ${selectedAccountObj.institution}` : "Akumulasi saldo seluruh akun aktif"}
          </p>
        </div>

        {/* Card 2: Income Month */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Pemasukan Bulan Ini</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 tracking-tight">
            +{formatCurrency(summary?.period?.income || 0)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Periode aktif bulan berjalan</p>
        </div>

        {/* Card 3: Expense Month */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Pengeluaran Bulan Ini</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600 tracking-tight">
            -{formatCurrency(summary?.period?.expense || 0)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Total beban & konsumsi</p>
        </div>

        {/* Card 4: Net Balance */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Selisih Bersih (Net)</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-black tracking-tight ${
              (summary?.period?.net || 0) >= 0 ? "text-blue-600" : "text-rose-600"
            }`}
          >
            {(summary?.period?.net || 0) >= 0 ? "+" : ""}
            {formatCurrency(summary?.period?.net || 0)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Cashflow surplus/defisit</p>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut Chart: Komposisi Pengeluaran */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Komposisi Pengeluaran</h2>
                <p className="text-xs text-slate-500">Berdasarkan kategori bulan ini</p>
              </div>
              <div className="p-2 bg-slate-50 text-slate-400 rounded-xl">
                <PieIcon className="w-4 h-4" />
              </div>
            </div>

            {breakdown.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-slate-400 text-xs text-center">
                Belum ada pengeluaran yang dicatat di periode ini
              </div>
            ) : (
              <div className="h-56 w-full">
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
                        <Cell key={`cell-${index}`} fill={entry.color || "#EF4444"} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(val) => formatCurrency(val)}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #e2e8f0",
                        fontSize: "12px",
                        boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Breakdown Legend List */}
          {breakdown.length > 0 && (
            <div className="mt-4 space-y-2 max-h-36 overflow-y-auto pr-1">
              {breakdown.slice(0, 4).map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-slate-700 font-medium truncate max-w-[120px]">{item.name}</span>
                  </div>
                  <div className="font-semibold text-slate-900">
                    {item.percentage}% ({formatCurrency(item.totalAmount)})
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bar Chart: Tren Pemasukan vs Pengeluaran */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Tren Arus Kas (12 Bulan)</h2>
              <p className="text-xs text-slate-500">Perbandingan pemasukan vs pengeluaran tahun ini</p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 font-semibold text-emerald-600">
                <span className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></span> Pemasukan
              </span>
              <span className="flex items-center gap-1 font-semibold text-rose-600">
                <span className="w-2.5 h-2.5 bg-rose-500 rounded-sm"></span> Pengeluaran
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={trend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(val) => {
                    if (val >= 1000000) return `${(val / 1000000).toFixed(0)}jt`;
                    if (val >= 1000) return `${(val / 1000).toFixed(0)}rb`;
                    return val;
                  }}
                />
                <Tooltip
                  formatter={(val) => formatCurrency(val)}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)"
                  }}
                />
                <Bar dataKey="income" name="Pemasukan" fill="#10B981" radius={[4, 4, 0, 0]} maxBarSize={20} />
                <Bar dataKey="expense" name="Pengeluaran" fill="#EF4444" radius={[4, 4, 0, 0]} maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
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
            {recentTransactions.map((tx) => {
              const isIncome = tx.type === "INCOME";
              const isExpense = tx.type === "EXPENSE";
              const isTransferIn = tx.type === "TRANSFER_IN";
              const isTransferOut = tx.type === "TRANSFER_OUT";

              return (
                <div key={tx.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                        isIncome
                          ? "bg-emerald-50 text-emerald-600"
                          : isExpense
                          ? "bg-rose-50 text-rose-600"
                          : "bg-blue-50 text-blue-600"
                      }`}
                    >
                      {isIncome && <ArrowUpRight className="w-4 h-4" />}
                      {isExpense && <ArrowDownRight className="w-4 h-4" />}
                      {(isTransferIn || isTransferOut) && <ArrowRightLeft className="w-4 h-4" />}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">
                        {tx.description || tx.category?.name || (isTransferIn ? "Transfer Masuk" : "Transfer Keluar")}
                      </div>
                      <div className="text-xs text-slate-400 flex flex-wrap items-center gap-1.5 sm:gap-2">
                        <span>{new Date(tx.transactionDate).toLocaleDateString("id-ID")}</span>
                        <span>•</span>
                        {tx.account && (
                          <span className="font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                            {tx.account.name}
                          </span>
                        )}
                        <span>•</span>
                        <span className="font-medium text-slate-500">
                          {tx.category?.name || (isTransferIn ? "Transfer Masuk" : "Transfer Keluar")}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div
                    className={`text-sm font-bold ${
                      isIncome
                        ? "text-emerald-600"
                        : isExpense
                        ? "text-rose-600"
                        : isTransferIn
                        ? "text-blue-600"
                        : "text-amber-600"
                    }`}
                  >
                    {isIncome ? "+" : isExpense ? "-" : isTransferIn ? "+" : "-"}
                    {formatCurrency(tx.amount)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}