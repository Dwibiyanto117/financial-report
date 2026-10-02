import React, { useState, useEffect } from "react";
import {
  Plus,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRightLeft,
  Edit2,
  Trash2,
  X,
  Loader2,
  Calendar,
  AlertCircle,
  Landmark
} from "lucide-react";
import api from "../services/api";
import { getAccounts } from "../services/accountService";
import { formatCurrency } from "../utils/currency";

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, totalPages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  // Filter States
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [accountFilter, setAccountFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [search, setSearch] = useState("");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [modalForm, setModalForm] = useState({
    type: "EXPENSE",
    accountId: "",
    categoryId: "",
    amount: "",
    transactionDate: new Date().toISOString().split("T")[0],
    description: ""
  });
  const [modalError, setModalError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchTransactions = async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page,
        limit: pagination.limit
      });
      if (typeFilter) params.append("type", typeFilter);
      if (categoryFilter) params.append("categoryId", categoryFilter);
      if (accountFilter) params.append("accountId", accountFilter);
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (search) params.append("search", search);

      const res = await api.get(`/transactions?${params.toString()}`);
      if (res.data.success) {
        setTransactions(res.data.data.items);
        setPagination(res.data.data.pagination);
      }
    } catch (err) {
      console.error("Gagal memuat transaksi:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInitialData = async () => {
    try {
      const [catRes, accRes] = await Promise.all([
        api.get("/categories"),
        getAccounts()
      ]);
      if (catRes.data.success) setCategories(catRes.data.data);
      if (accRes.success) setAccounts(accRes.data);
    } catch (err) {
      console.error("Gagal memuat kategori / rekening:", err);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchTransactions(1);
  }, [typeFilter, categoryFilter, accountFilter, startDate, endDate, search]);

  const openAddModal = () => {
    setEditingTx(null);
    const defaultCat = categories.find((c) => c.type === "EXPENSE");
    const activeAccs = accounts.filter((a) => !a.isArchived);
    setModalForm({
      type: "EXPENSE",
      accountId: activeAccs.length > 0 ? String(activeAccs[0].id) : "",
      categoryId: defaultCat ? defaultCat.id : "",
      amount: "",
      transactionDate: new Date().toISOString().split("T")[0],
      description: ""
    });
    setModalError("");
    setIsModalOpen(true);
  };

  const openEditModal = (tx) => {
    setEditingTx(tx);
    setModalForm({
      type: tx.type,
      accountId: tx.account ? String(tx.account.id) : (accounts[0] ? String(accounts[0].id) : ""),
      categoryId: tx.category ? tx.category.id : "",
      amount: tx.amount.toString(),
      transactionDate: new Date(tx.transactionDate).toISOString().split("T")[0],
      description: tx.description || ""
    });
    setModalError("");
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setModalError("");
    setSubmitting(true);

    try {
      const payload = {
        ...modalForm,
        accountId: Number(modalForm.accountId),
        categoryId: modalForm.categoryId ? Number(modalForm.categoryId) : undefined
      };

      if (editingTx) {
        await api.put(`/transactions/${editingTx.id}`, payload);
      } else {
        await api.post("/transactions", payload);
      }
      setIsModalOpen(false);
      fetchTransactions(pagination.page);
    } catch (err) {
      setModalError(
        err.response?.data?.message || "Terjadi kesalahan saat menyimpan transaksi"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, isTransfer) => {
    const msg = isTransfer
      ? "Transaksi ini merupakan bagian dari transfer berpasangan. Menghapusnya akan membatalkan kedua sisi transfer sekaligus. Lanjutkan?"
      : "Apakah Anda yakin ingin menghapus transaksi ini?";

    if (window.confirm(msg)) {
      try {
        await api.delete(`/transactions/${id}`);
        fetchTransactions(pagination.page);
      } catch (err) {
        alert(err.response?.data?.message || "Gagal menghapus transaksi");
      }
    }
  };

  const availableCategories = categories.filter((c) => c.type === modalForm.type);
  const activeAccounts = accounts.filter((a) => !a.isArchived);

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Riwayat Transaksi</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Daftar seluruh catatan pemasukan, pengeluaran, dan transfer antar rekening.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Transaksi</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Cari deskripsi..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Rekening Filter */}
          <div>
            <select
              value={accountFilter}
              onChange={(e) => setAccountFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
            >
              <option value="">Semua Rekening</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.institution})
                </option>
              ))}
            </select>
          </div>

          {/* Tipe Filter */}
          <div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Semua Tipe Transaksi</option>
              <option value="INCOME">Hanya Pemasukan</option>
              <option value="EXPENSE">Hanya Pengeluaran</option>
              <option value="TRANSFER_IN">Hanya Transfer Masuk</option>
              <option value="TRANSFER_OUT">Hanya Transfer Keluar</option>
            </select>
          </div>

          {/* Kategori Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              <option value="">Semua Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.type === "INCOME" ? "[+] " : "[-] "}
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-1/2 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-hidden"
            />
            <span className="text-slate-400 text-xs">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-1/2 px-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 focus:outline-hidden"
            />
          </div>
        </div>
      </div>

      {/* Transactions Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 flex justify-center items-center">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            Tidak ada transaksi yang cocok dengan filter Anda.
          </div>
        ) : (
          <div>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Rekening</th>
                    <th className="py-3 px-4">Tipe</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4">Keterangan</th>
                    <th className="py-3 px-4 text-right">Nominal (IDR)</th>
                    <th className="py-3 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {transactions.map((tx) => {
                    const isIncome = tx.type === "INCOME";
                    const isExpense = tx.type === "EXPENSE";
                    const isTransferIn = tx.type === "TRANSFER_IN";
                    const isTransferOut = tx.type === "TRANSFER_OUT";
                    const isTransfer = isTransferIn || isTransferOut;

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50 transition">
                        <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap text-xs font-medium">
                          {new Date(tx.transactionDate).toLocaleDateString("id-ID")}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-white shadow-2xs"
                            style={{ backgroundColor: tx.account?.color || "#003D79" }}
                          >
                            <Landmark className="w-3 h-3" />
                            <span>{tx.account?.name || "Kas"}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                              isIncome
                                ? "bg-emerald-50 text-emerald-700"
                                : isExpense
                                ? "bg-rose-50 text-rose-700"
                                : isTransferIn
                                ? "bg-blue-50 text-blue-700"
                                : "bg-amber-50 text-amber-700"
                            }`}
                          >
                            {isIncome
                              ? "Pemasukan"
                              : isExpense
                              ? "Pengeluaran"
                              : isTransferIn
                              ? "Transfer Masuk"
                              : "Transfer Keluar"}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-slate-900 font-medium whitespace-nowrap">
                          {tx.category ? (
                            <div className="flex items-center gap-2">
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: tx.category?.color || "#10B981" }}
                              />
                              <span>{tx.category.name}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-xs flex items-center gap-1">
                              <ArrowRightLeft className="w-3 h-3" /> Transfer Antar Akun
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-slate-600 max-w-xs truncate">
                          {tx.description || "-"}
                        </td>

                        <td
                          className={`py-3.5 px-4 text-right font-bold whitespace-nowrap ${
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
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1.5">
                            {!isTransfer && (
                              <button
                                onClick={() => openEditModal(tx)}
                                className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-emerald-50 transition"
                                title="Ubah transaksi"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDelete(tx.id, isTransfer)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition"
                              title={isTransfer ? "Batalkan transfer" : "Hapus transaksi"}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card Feed View */}
            <div className="md:hidden divide-y divide-slate-100 p-2">
              {transactions.map((tx) => {
                const isIncome = tx.type === "INCOME";
                const isExpense = tx.type === "EXPENSE";
                const isTransferIn = tx.type === "TRANSFER_IN";
                const isTransferOut = tx.type === "TRANSFER_OUT";
                const isTransfer = isTransferIn || isTransferOut;

                return (
                  <div key={tx.id} className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isIncome
                            ? "bg-emerald-50 text-emerald-600"
                            : isExpense
                            ? "bg-rose-50 text-rose-600"
                            : "bg-blue-50 text-blue-600"
                        }`}
                      >
                        {isIncome && <ArrowUpRight className="w-4 h-4" />}
                        {isExpense && <ArrowDownRight className="w-4 h-4" />}
                        {isTransfer && <ArrowRightLeft className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-800">
                          {tx.description || tx.category?.name || (isTransferIn ? "Transfer Masuk" : "Transfer Keluar")}
                        </div>
                        <div className="text-xs text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                          <span>{new Date(tx.transactionDate).toLocaleDateString("id-ID")}</span>
                          <span>•</span>
                          <span className="font-semibold text-slate-600 bg-slate-100 px-1 rounded">
                            {tx.account?.name || "Kas"}
                          </span>
                          <span>•</span>
                          <span>{tx.category?.name || "Transfer"}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <div
                        className={`text-sm font-bold text-right ${
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
                      <button
                        onClick={() => handleDelete(tx.id, isTransfer)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Menampilkan halaman {pagination.page} dari {pagination.totalPages} ({pagination.total} total transaksi)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={pagination.page <= 1}
                  onClick={() => fetchTransactions(pagination.page - 1)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition font-medium"
                >
                  Sebelumnya
                </button>
                <button
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() => fetchTransactions(pagination.page + 1)}
                  className="px-3 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition font-medium"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal Add / Edit Transaction */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 text-base">
                {editingTx ? "Ubah Catatan Transaksi" : "Tambah Transaksi Baru"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="p-6 space-y-4">
              {modalError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Rekening / Sumber Dana */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Rekening / Sumber Dana
                </label>
                <select
                  required
                  value={modalForm.accountId}
                  onChange={(e) => setModalForm({ ...modalForm, accountId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Pilih Rekening --</option>
                  {activeAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.institution}) — Saldo: {formatCurrency(a.currentBalance)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tipe Transaksi (Pemasukan / Pengeluaran Switch) */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Jenis Arus Kas
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const firstCat = categories.find((c) => c.type === "EXPENSE");
                      setModalForm({ ...modalForm, type: "EXPENSE", categoryId: firstCat ? firstCat.id : "" });
                    }}
                    className={`py-2 text-xs font-bold rounded-lg border transition ${
                      modalForm.type === "EXPENSE"
                        ? "bg-rose-50 border-rose-300 text-rose-700 shadow-xs"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Pengeluaran (-)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const firstCat = categories.find((c) => c.type === "INCOME");
                      setModalForm({ ...modalForm, type: "INCOME", categoryId: firstCat ? firstCat.id : "" });
                    }}
                    className={`py-2 text-xs font-bold rounded-lg border transition ${
                      modalForm.type === "INCOME"
                        ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs"
                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    Pemasukan (+)
                  </button>
                </div>
              </div>

              {/* Nominal */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Nominal (IDR)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Contoh: 50000"
                  value={modalForm.amount}
                  onChange={(e) => setModalForm({ ...modalForm, amount: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold text-base focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Kategori */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Kategori
                </label>
                <select
                  required
                  value={modalForm.categoryId}
                  onChange={(e) => setModalForm({ ...modalForm, categoryId: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Pilih Kategori --</option>
                  {availableCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tanggal */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Tanggal Transaksi
                </label>
                <input
                  type="date"
                  required
                  value={modalForm.transactionDate}
                  onChange={(e) => setModalForm({ ...modalForm, transactionDate: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Catatan / Keterangan */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Keterangan (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Makan siang di warung"
                  value={modalForm.description}
                  onChange={(e) => setModalForm({ ...modalForm, description: e.target.value })}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingTx ? "Simpan Perubahan" : "Tambah Transaksi"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}