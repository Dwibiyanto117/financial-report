import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Plus,
  ArrowRightLeft,
  Landmark,
  Wallet,
  Banknote,
  Edit2,
  Trash2,
  Archive,
  ArchiveRestore,
  Loader2,
  AlertCircle,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  FileUp
} from "lucide-react";
import { getAccounts, updateAccount, deleteAccount } from "../services/accountService";
import { formatCurrency } from "../utils/currency";
import AccountModal from "../components/AccountModal";
import TransferModal from "../components/TransferModal";

export default function Accounts() {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState("ALL"); // ALL, BANK, EWALLET, CASH, ARCHIVED

  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  const [actionMessage, setActionMessage] = useState({ type: "", text: "" });

  const fetchAccountsList = async () => {
    setLoading(true);
    try {
      const res = await getAccounts({ include_archived: "true" });
      if (res.success) {
        setAccounts(res.data);
      }
    } catch (err) {
      console.error("Gagal memuat rekening:", err);
      setActionMessage({ type: "error", text: "Gagal memuat daftar rekening." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccountsList();
  }, []);

  const showNotification = (type, text) => {
    setActionMessage({ type, text });
    setTimeout(() => {
      setActionMessage({ type: "", text: "" });
    }, 4000);
  };

  const handleToggleArchive = async (account) => {
    try {
      const nextState = !account.isArchived;
      await updateAccount(account.id, { isArchived: nextState });
      showNotification("success", `Rekening "${account.name}" berhasil ${nextState ? "diarsipkan" : "diaktifkan kembali"}.`);
      fetchAccountsList();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Gagal mengubah status arsip rekening";
      showNotification("error", msg);
    }
  };

  const handleDelete = async (account) => {
    if (!window.confirm(`Yakin ingin menghapus rekening "${account.name}"? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    try {
      await deleteAccount(account.id);
      showNotification("success", `Rekening "${account.name}" berhasil dihapus.`);
      fetchAccountsList();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Gagal menghapus rekening";
      showNotification("error", msg);
    }
  };

  // Filter accounts
  const filteredAccounts = accounts.filter((a) => {
    if (activeFilter === "ARCHIVED") return a.isArchived;
    if (a.isArchived) return false;
    if (activeFilter === "ALL") return true;
    return a.type === activeFilter;
  });

  // Calculate totals for active accounts
  const activeAccounts = accounts.filter((a) => !a.isArchived);
  const totalBalance = activeAccounts.reduce((acc, a) => acc + (a.currentBalance || 0), 0);
  const totalIncome = activeAccounts.reduce((acc, a) => acc + (a.totals?.income || 0), 0);
  const totalExpense = activeAccounts.reduce((acc, a) => acc + (a.totals?.expense || 0), 0);

  const getAccountIcon = (type) => {
    switch (type) {
      case "BANK":
        return Landmark;
      case "EWALLET":
        return Wallet;
      case "CASH":
      default:
        return Banknote;
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Manajemen Rekening</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Kelola sumber dana, rekening bank, dompet digital, dan kas tunai Anda
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/import"
            className="flex items-center gap-2 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl border border-slate-200 transition shadow-xs"
          >
            <FileUp className="w-4 h-4 text-emerald-600" />
            <span>Import Mutasi</span>
          </Link>
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-semibold rounded-xl border border-blue-200 transition"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Transfer Dana</span>
          </button>
          <button
            onClick={() => {
              setEditingAccount(null);
              setIsAccountModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Rekening</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {actionMessage.text && (
        <div
          className={`flex items-center gap-2.5 p-4 rounded-xl text-sm border animate-in fade-in ${
            actionMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          {actionMessage.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Total Saldo Tergabung</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800">
            {formatCurrency(totalBalance)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Dari {activeAccounts.length} rekening aktif
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Rekening Aktif</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Landmark className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-800">
            {activeAccounts.length} Akun
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {accounts.filter((a) => a.isArchived).length} akun diarsipkan
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Akumulasi Masuk</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">
            {formatCurrency(totalIncome)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Total pemasukan tercatat</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Akumulasi Keluar</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <ArrowDownRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-600">
            {formatCurrency(totalExpense)}
          </div>
          <p className="text-xs text-slate-400 mt-1">Total pengeluaran tercatat</p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-3">
        {[
          { key: "ALL", label: "Semua Rekening" },
          { key: "BANK", label: "Bank" },
          { key: "EWALLET", label: "E-Wallet" },
          { key: "CASH", label: "Kas Tunai" },
          { key: "ARCHIVED", label: `Diarsipkan (${accounts.filter((a) => a.isArchived).length})` }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveFilter(tab.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition ${
              activeFilter === tab.key
                ? "bg-slate-800 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Accounts Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <Landmark className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-slate-700 text-base">Tidak ada rekening</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            {activeFilter === "ARCHIVED"
              ? "Tidak ada rekening yang sedang diarsipkan."
              : "Belum ada rekening untuk kategori ini. Tambahkan rekening baru untuk mulai memisahkan saldo."}
          </p>
          {activeFilter !== "ARCHIVED" && (
            <button
              onClick={() => {
                setEditingAccount(null);
                setIsAccountModalOpen(true);
              }}
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Rekening Sekarang</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredAccounts.map((account) => {
            const Icon = getAccountIcon(account.type);
            const isArchived = account.isArchived;

            return (
              <div
                key={account.id}
                className={`bg-white rounded-2xl border overflow-hidden shadow-xs hover:shadow-md transition flex flex-col justify-between ${
                  isArchived ? "border-slate-200 opacity-70 bg-slate-50/50" : "border-slate-200/80"
                }`}
              >
                {/* Top strip with account custom color */}
                <div className="h-2 w-full" style={{ backgroundColor: account.color || "#003D79" }} />

                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-xs"
                          style={{ backgroundColor: account.color || "#003D79" }}
                        >
                          <Icon className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-800 text-base leading-tight">
                            {account.name}
                          </h4>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                              {account.institution}
                            </span>
                            {account.accountNoMasked && (
                              <span className="text-[11px] text-slate-400 font-mono">
                                • {account.accountNoMasked}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isArchived ? (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-md">
                          Arsip
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md">
                          {account.type}
                        </span>
                      )}
                    </div>

                    {/* Current Balance */}
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                        Saldo Saat Ini
                      </div>
                      <div
                        className={`text-2xl font-black tracking-tight mt-0.5 ${
                          account.currentBalance < 0 ? "text-rose-600" : "text-slate-900"
                        }`}
                      >
                        {formatCurrency(account.currentBalance)}
                      </div>
                    </div>

                    {/* Balance details breakdown */}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-xl">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Saldo Awal</span>
                        <span className="font-semibold text-slate-700">
                          {formatCurrency(account.openingBalance)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Pemasukan</span>
                        <span className="font-semibold text-emerald-600">
                          +{formatCurrency(account.totals?.income || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Pengeluaran</span>
                        <span className="font-semibold text-rose-600">
                          -{formatCurrency(account.totals?.expense || 0)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Net Transfer</span>
                        <span
                          className={`font-semibold ${
                            (account.totals?.transferIn || 0) - (account.totals?.transferOut || 0) >= 0
                              ? "text-blue-600"
                              : "text-amber-600"
                          }`}
                        >
                          {formatCurrency(
                            (account.totals?.transferIn || 0) - (account.totals?.transferOut || 0)
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex items-center justify-end gap-1.5 mt-5 pt-3 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setEditingAccount(account);
                        setIsAccountModalOpen(true);
                      }}
                      className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                      title="Edit Rekening"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleArchive(account)}
                      className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
                      title={isArchived ? "Pulihkan Rekening" : "Arsipkan Rekening"}
                    >
                      {isArchived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(account)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="Hapus Rekening"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Account Add/Edit Modal */}
      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSuccess={() => {
          showNotification("success", "Data rekening berhasil disimpan.");
          fetchAccountsList();
        }}
        editingAccount={editingAccount}
      />

      {/* Transfer Modal */}
      <TransferModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onSuccess={() => {
          showNotification("success", "Transfer antar rekening berhasil dieksekusi.");
          fetchAccountsList();
        }}
        accounts={accounts}
      />
    </div>
  );
}
