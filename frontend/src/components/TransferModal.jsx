import React, { useState, useEffect } from "react";
import { X, Loader2, AlertCircle, ArrowRightLeft, AlertTriangle } from "lucide-react";
import { executeTransfer } from "../services/transferService";
import { formatCurrency } from "../utils/currency";

export default function TransferModal({ isOpen, onClose, onSuccess, accounts = [] }) {
  const activeAccounts = accounts.filter((a) => !a.isArchived);

  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [description, setDescription] = useState("");
  const [adminFee, setAdminFee] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (activeAccounts.length >= 2) {
        setFromAccountId(String(activeAccounts[0].id));
        setToAccountId(String(activeAccounts[1].id));
      } else if (activeAccounts.length === 1) {
        setFromAccountId(String(activeAccounts[0].id));
        setToAccountId("");
      }
      setAmount("");
      setDate(new Date().toISOString().split("T")[0]);
      setDescription("");
      setAdminFee("");
      setError("");
    }
  }, [isOpen, accounts]);

  if (!isOpen) return null;

  const sourceAccount = activeAccounts.find((a) => String(a.id) === String(fromAccountId));
  const targetAccount = activeAccounts.find((a) => String(a.id) === String(toAccountId));

  const numAmount = Number(amount) || 0;
  const isInsufficient = sourceAccount && numAmount > (sourceAccount.currentBalance || 0);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!fromAccountId) {
      setError("Pilih rekening asal");
      return;
    }
    if (!toAccountId) {
      setError("Pilih rekening tujuan");
      return;
    }
    if (fromAccountId === toAccountId) {
      setError("Rekening asal dan tujuan tidak boleh sama");
      return;
    }
    if (!numAmount || numAmount <= 0) {
      setError("Nominal transfer harus lebih besar dari 0");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await executeTransfer({
        fromAccountId: Number(fromAccountId),
        toAccountId: Number(toAccountId),
        amount: numAmount,
        date,
        description: description.trim() || undefined,
        adminFee: Number(adminFee) || 0
      });

      onSuccess();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Gagal memproses transfer dana";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-lg">Transfer Antar Rekening</h3>
              <p className="text-xs text-slate-400">Pindahkan saldo antar sumber dana</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {activeAccounts.length < 2 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-xl">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>Anda membutuhkan minimal 2 rekening aktif untuk melakukan transfer antar rekening.</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Dari Rekening (Asal)
              </label>
              <select
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                required
              >
                <option value="">Pilih Asal</option>
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} ({formatCurrency(a.currentBalance)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Ke Rekening (Tujuan)
              </label>
              <select
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                required
              >
                <option value="">Pilih Tujuan</option>
                {activeAccounts.map((a) => (
                  <option key={a.id} value={a.id} disabled={String(a.id) === String(fromAccountId)}>
                    {a.name} {String(a.id) === String(fromAccountId) ? "(Sama)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Nominal Transfer
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm font-semibold">Rp</span>
              <input
                type="number"
                min="1"
                step="any"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                required
              />
            </div>
            {isInsufficient && (
              <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1 font-medium">
                <AlertTriangle className="w-3.5 h-3.5" />
                Nominal melebihi saldo rekening asal saat ini ({formatCurrency(sourceAccount.currentBalance)}).
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Tanggal Transfer
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Biaya Admin (Opsional)
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-slate-400 text-xs font-semibold">Rp</span>
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={adminFee}
                  onChange={(e) => setAdminFee(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Keterangan / Catatan (Opsional)
            </label>
            <input
              type="text"
              placeholder="Misal: Top-up saldo, bayar arisan, pindah kas"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || activeAccounts.length < 2}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>Eksekusi Transfer</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
