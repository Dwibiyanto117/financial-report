import React from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, ArrowRight, RotateCcw, History, Sparkles, AlertTriangle, Copy, ShieldCheck } from "lucide-react";

export default function ImportResultScreen({ result = {}, onReset, onGoToHistory }) {
  const importedCount = result.imported_rows || 0;
  const duplicateCount = result.duplicate_rows || 0;
  const skippedCount = result.skipped_rows || 0;
  const rulesSaved = result.rules_saved || 0;
  const ruleWarnings = result.rule_warnings || [];

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs max-w-2xl mx-auto text-center space-y-6">
      {/* Success Icon & Heading */}
      <div className="space-y-2">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl mx-auto flex items-center justify-center shadow-xs">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
          Impor Mutasi Berhasil Diselesaikan!
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Transaksi mutasi telah disimpan secara permanen dan saldo rekening Anda telah diperbarui.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
        <div className="p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-2xl">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block">
            Tersimpan
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-900 mt-1 block">
            {importedCount.toLocaleString("id-ID")}
          </span>
          <span className="text-[10px] text-emerald-700/80">Transaksi</span>
        </div>

        <div className="p-3.5 bg-amber-50/70 border border-amber-100 rounded-2xl">
          <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider block">
            Duplikat
          </span>
          <span className="text-xl sm:text-2xl font-black text-amber-900 mt-1 block">
            {duplicateCount.toLocaleString("id-ID")}
          </span>
          <span className="text-[10px] text-amber-700/80">Dilewati</span>
        </div>

        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Dilewati
          </span>
          <span className="text-xl sm:text-2xl font-black text-slate-800 mt-1 block">
            {skippedCount.toLocaleString("id-ID")}
          </span>
          <span className="text-[10px] text-slate-400">Tidak dipilih</span>
        </div>

        <div className="p-3.5 bg-sky-50/70 border border-sky-100 rounded-2xl">
          <span className="text-[11px] font-semibold text-sky-700 uppercase tracking-wider block">
            Aturan Baru
          </span>
          <span className="text-xl sm:text-2xl font-black text-sky-900 mt-1 block">
            {rulesSaved.toLocaleString("id-ID")}
          </span>
          <span className="text-[10px] text-sky-700/80">Dipelihara</span>
        </div>
      </div>

      {/* Warnings jika ada */}
      {ruleWarnings.length > 0 && (
        <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-left text-xs text-amber-800 space-y-1">
          <div className="flex items-center gap-1.5 font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Catatan Aturan Kategori:</span>
          </div>
          {ruleWarnings.map((w, idx) => (
            <p key={idx} className="pl-5">• {w}</p>
          ))}
        </div>
      )}

      {/* Action Buttons */}
      <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Link
          to="/transactions"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition"
        >
          <span>Lihat di Riwayat Transaksi</span>
          <ArrowRight className="w-4 h-4" />
        </Link>

        <button
          type="button"
          onClick={onReset}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition shadow-xs"
        >
          <RotateCcw className="w-4 h-4 text-slate-500" />
          <span>Impor Berkas Lain</span>
        </button>

        <button
          type="button"
          onClick={onGoToHistory}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl transition shadow-xs"
        >
          <History className="w-4 h-4 text-slate-500" />
          <span>Riwayat Impor</span>
        </button>
      </div>
    </div>
  );
}
