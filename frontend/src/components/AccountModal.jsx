import React, { useState, useEffect } from "react";
import { X, Loader2, AlertCircle, Landmark, Wallet, Banknote } from "lucide-react";
import { createAccount, updateAccount } from "../services/accountService";

const INSTITUTIONS = [
  { value: "MANDIRI", label: "Bank Mandiri" },
  { value: "BCA", label: "Bank BCA" },
  { value: "BRI", label: "Bank BRI" },
  { value: "BNI", label: "Bank BNI" },
  { value: "BSI", label: "Bank Syariah Indonesia (BSI)" },
  { value: "GOPAY", label: "GoPay" },
  { value: "OVO", label: "OVO" },
  { value: "DANA", label: "DANA" },
  { value: "SHOPEEPAY", label: "ShopeePay" },
  { value: "CASH", label: "Tunai / Cash" },
  { value: "LAINNYA", label: "Lainnya" }
];

const ACCOUNT_TYPES = [
  { value: "BANK", label: "Rekening Bank", icon: Landmark },
  { value: "EWALLET", label: "Dompet Digital (E-Wallet)", icon: Wallet },
  { value: "CASH", label: "Kas Tunai", icon: Banknote }
];

const PRESET_COLORS = [
  "#10B981", "#059669", "#003D79", "#005E9E", "#0D9488",
  "#06B6D4", "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899",
  "#F59E0B", "#F97316", "#EF4444", "#64748B"
];

export default function AccountModal({ isOpen, onClose, onSuccess, editingAccount = null }) {
  const [form, setForm] = useState({
    name: "",
    institution: "MANDIRI",
    type: "BANK",
    accountNoMasked: "",
    openingBalance: "",
    color: "#003D79"
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingAccount) {
      setForm({
        name: editingAccount.name || "",
        institution: editingAccount.institution || "LAINNYA",
        type: editingAccount.type || "BANK",
        accountNoMasked: editingAccount.accountNoMasked || "",
        openingBalance: editingAccount.openingBalance !== undefined ? String(editingAccount.openingBalance) : "0",
        color: editingAccount.color || "#003D79"
      });
    } else {
      setForm({
        name: "",
        institution: "MANDIRI",
        type: "BANK",
        accountNoMasked: "",
        openingBalance: "0",
        color: "#003D79"
      });
    }
    setError("");
  }, [editingAccount, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError("Nama rekening wajib diisi");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const payload = {
        name: form.name.trim(),
        institution: form.institution,
        type: form.type,
        accountNoMasked: form.accountNoMasked.trim() || null,
        openingBalance: Number(form.openingBalance) || 0,
        color: form.color
      };

      if (editingAccount) {
        await updateAccount(editingAccount.id, payload);
      } else {
        await createAccount(payload);
      }

      onSuccess();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Gagal menyimpan data rekening";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-slate-800 text-lg">
            {editingAccount ? "Edit Rekening" : "Tambah Rekening Baru"}
          </h3>
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Tipe Sumber Dana
            </label>
            <div className="grid grid-cols-3 gap-2">
              {ACCOUNT_TYPES.map((t) => {
                const Icon = t.icon;
                const isSelected = form.type === t.value;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => {
                      setForm({
                        ...form,
                        type: t.value,
                        institution: t.value === "CASH" ? "CASH" : form.institution === "CASH" ? "MANDIRI" : form.institution
                      });
                    }}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs font-semibold transition ${
                      isSelected
                        ? "border-emerald-600 bg-emerald-50 text-emerald-700 shadow-xs"
                        : "border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    <Icon className="w-4 h-4 mb-1" />
                    <span>{t.label.split(" ")[0]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Nama Rekening / Akun
            </label>
            <input
              type="text"
              placeholder="Contoh: Mandiri Payroll, BCA Tabungan, GoPay Utama"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Institusi / Bank
              </label>
              <select
                value={form.institution}
                onChange={(e) => setForm({ ...form, institution: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              >
                {INSTITUTIONS.map((inst) => (
                  <option key={inst.value} value={inst.value}>
                    {inst.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Nomor Akun (Opsional)
              </label>
              <input
                type="text"
                placeholder="Misal: ****1234"
                value={form.accountNoMasked}
                onChange={(e) => setForm({ ...form, accountNoMasked: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Saldo Awal (Opening Balance)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 text-sm font-semibold">Rp</span>
              <input
                type="number"
                min="0"
                step="any"
                placeholder="0"
                value={form.openingBalance}
                onChange={(e) => setForm({ ...form, openingBalance: e.target.value })}
                className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Saldo awal saat akun ini mulai dicatat di sistem.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Warna Kartu Rekening
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-6 h-6 rounded-full transition transform hover:scale-110 ${
                    form.color === c ? "ring-2 ring-offset-2 ring-slate-800 scale-110" : ""
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
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
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{editingAccount ? "Simpan Perubahan" : "Tambah Rekening"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
