import React, { useState, useEffect } from "react";
import { X, Lock, KeyRound, Loader2, AlertCircle } from "lucide-react";

export default function FilePasswordModal({ isOpen, onClose, onSubmit, errorMessage = "", loading = false }) {
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (!isOpen) {
      setPassword("");
      return;
    }

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !loading) {
        setPassword("");
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, loading]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!password.trim()) return;
    const currentPass = password;
    // Bersihkan state segera agar tidak menggantung di memori lebih lama dari yang dibutuhkan
    setPassword("");
    onSubmit(currentPass);
  };

  const handleCancel = () => {
    setPassword("");
    onClose();
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) handleCancel();
      }}
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="file-password-modal-title"
        className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 flex flex-col max-h-[92dvh] sm:max-h-[85vh] overflow-hidden animate-in fade-in slide-in-from-bottom-6 sm:slide-in-from-bottom-2 duration-200"
      >
        {/* Mobile Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-50 text-amber-700 rounded-xl">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 id="file-password-modal-title" className="font-bold text-slate-800 text-base sm:text-lg">
                Berkas Terenkripsi
              </h3>
              <p className="text-xs text-slate-500">Masukkan password untuk membuka berkas e-Statement</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            aria-label="Tutup dialog password"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 sm:p-6 space-y-4">
            {errorMessage && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label htmlFor="file-password-input" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Password Berkas
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="file-password-input"
                  type="password"
                  autoComplete="off"
                  autoFocus
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ketik password berkas..."
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>
              <p className="text-xs text-slate-500 mt-1.5">
                Password diproses langsung di memori untuk dekripsi dan tidak pernah disimpan di browser maupun server.
              </p>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2.5 px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50 shrink-0">
            <button
              type="button"
              onClick={handleCancel}
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !password.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Membuka Berkas...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Buka & Proses</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
