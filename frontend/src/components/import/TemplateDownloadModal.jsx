import React, { useState, useEffect } from "react";
import { X, Download, Loader2, AlertCircle, FileSpreadsheet } from "lucide-react";
import { getTemplateBanks, downloadTemplate } from "../../services/importService";

export default function TemplateDownloadModal({ isOpen, onClose }) {
  const [banks, setBanks] = useState([]);
  const [selectedBank, setSelectedBank] = useState("LAINNYA");
  const [selectedFormat, setSelectedFormat] = useState("xlsx");
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);

    // Ambil daftar bank dari backend
    setLoadingBanks(true);
    setError("");
    getTemplateBanks()
      .then((res) => {
        if (res.success && Array.isArray(res.data)) {
          setBanks(res.data);
          const defaultBank = res.data.find((b) => b.code === "LAINNYA") || res.data[0];
          if (defaultBank) setSelectedBank(defaultBank.code);
        }
      })
      .catch((err) => {
        setError(err.response?.data?.message || "Gagal memuat daftar template bank");
      })
      .finally(() => {
        setLoadingBanks(false);
      });

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDownload = async (e) => {
    e.preventDefault();
    setDownloading(true);
    setError("");
    try {
      await downloadTemplate(selectedBank, selectedFormat);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Gagal mengunduh berkas template");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget && !downloading) onClose();
      }}
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 transition-opacity"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="template-download-modal-title"
        className="bg-white rounded-t-3xl sm:rounded-2xl max-w-md w-full shadow-2xl border border-slate-100 flex flex-col max-h-[92dvh] sm:max-h-[85vh] overflow-hidden animate-in fade-in slide-in-from-bottom-6 sm:slide-in-from-bottom-2 duration-200"
      >
        {/* Mobile Drag Handle */}
        <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 shrink-0 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 id="template-download-modal-title" className="font-bold text-slate-800 text-base sm:text-lg">
                Unduh Template Standar
              </h3>
              <p className="text-xs text-slate-500">Gunakan format seragam untuk pengisian mutasi</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog unduh template"
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleDownload} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Pilihan Bank */}
            <div>
              <label htmlFor="template-bank" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Pilih Bank / Dompet Digital
              </label>
              {loadingBanks ? (
                <div className="flex items-center justify-center p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin mr-2 text-emerald-600" />
                  <span>Memuat daftar bank...</span>
                </div>
              ) : (
                <select
                  id="template-bank"
                  value={selectedBank}
                  onChange={(e) => setSelectedBank(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  {banks.map((b) => (
                    <option key={b.code} value={b.code}>
                      {b.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Pilihan Format */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Format Berkas
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedFormat("xlsx")}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-sm font-semibold transition ${
                    selectedFormat === "xlsx"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700 shadow-xs"
                      : "border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span className="font-bold">Excel (.xlsx)</span>
                  <span className="text-[11px] font-normal text-slate-500 mt-0.5">Disertai lembar petunjuk</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFormat("csv")}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-sm font-semibold transition ${
                    selectedFormat === "csv"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700 shadow-xs"
                      : "border-slate-200 bg-slate-50/50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <span className="font-bold">CSV (.csv)</span>
                  <span className="text-[11px] font-normal text-slate-500 mt-0.5">Teks pemisah koma</span>
                </button>
              </div>
            </div>

            {/* Info Box */}
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs text-amber-800 space-y-1">
              <p className="font-semibold">Petunjuk Pengisian:</p>
              <p>Isi kolom Tanggal, Waktu (opsional), Keterangan, Jenis (MASUK / KELUAR; sinonim seperti KREDIT/DEBIT atau CR/DB juga diterima), dan Nominal. Jangan mengubah nama sheet atau baris header template.</p>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="flex items-center justify-end gap-2.5 px-5 sm:px-6 py-3.5 border-t border-slate-100 bg-slate-50 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={downloading}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={downloading || loadingBanks}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Mengunduh...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Unduh Sekarang</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
