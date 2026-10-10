import React, { useEffect } from "react";
import { X, AlertTriangle, Loader2, RotateCcw } from "lucide-react";

export default function RollbackConfirmModal({ isOpen, batch, onClose, onConfirm, loading = false }) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, loading]);

  if (!isOpen || !batch) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="rollback-confirm-modal-title"
        className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 flex flex-col max-h-[92dvh] sm:max-h-[85vh] overflow-hidden animate-in fade-in slide-in-from-bottom-6 sm:slide-in-from-bottom-2 duration-200"
      >
        {/* Mobile Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 id="rollback-confirm-modal-title" className="font-bold text-slate-800 text-base sm:text-lg">
                Konfirmasi Rollback
              </h3>
              <p className="text-xs text-slate-500">Batalkan transaksi dan kembalikan saldo rekening</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Tutup dialog konfirmasi rollback"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4">
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 space-y-2">
            <div className="flex items-start gap-2 font-bold text-rose-900">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>Peringatan Tindakan Permanen:</span>
            </div>
            <p>
              Seluruh <strong>{batch.imported_rows || batch.importedRows || 0} transaksi</strong> dari berkas{" "}
              <span className="font-semibold underline">{batch.file_name || batch.fileName}</span> akan dihapus secara permanen dari database. Saldo rekening Anda akan otomatis dikembalikan ke kondisi sebelum impor.
            </p>
            <p className="text-[11px] text-rose-700/80">
              *Catatan: Aturan kategori kata kunci yang tersimpan saat impor tidak akan dihapus.
            </p>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Rekening:</span>
              <span className="font-bold text-slate-800">
                {batch.account?.name || "Rekening"} ({batch.account?.institution || "-"})
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">ID Batch:</span>
              <span className="font-mono text-slate-700">#{batch.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Waktu Impor:</span>
              <span className="text-slate-700">
                {batch.created_at || batch.createdAt
                  ? new Date(batch.created_at || batch.createdAt).toLocaleString("id-ID")
                  : "-"}
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2.5 px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onConfirm(batch.id)}
            disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Memproses Rollback...</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" />
                <span>Ya, Rollback Batch Ini</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
