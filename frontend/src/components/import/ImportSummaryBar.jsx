import React, { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, FileText, CheckCircle2, Copy, AlertOctagon } from "lucide-react";

export default function ImportSummaryBar({ summary = {}, warnings = [], parserName = "", fileName = "" }) {
  const [isWarningsOpen, setIsWarningsOpen] = useState(false);

  const total = summary.total || 0;
  const newCount = summary.new !== undefined ? summary.new : (total - (summary.duplicate || 0));
  const duplicateCount = summary.duplicate || 0;
  const invalidCount = summary.invalid || 0;

  return (
    <div className="space-y-3">
      {/* Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Baris</span>
            <FileText className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-black text-slate-800">{total.toLocaleString("id-ID")}</p>
          <p className="text-[11px] text-slate-400 mt-0.5 truncate">{fileName}</p>
        </div>

        <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Transaksi Baru</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-emerald-800">{newCount.toLocaleString("id-ID")}</p>
          <p className="text-[11px] text-emerald-600/80 mt-0.5">Siap diimpor</p>
        </div>

        <div className="p-4 bg-amber-50/60 border border-amber-100 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-amber-700 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Duplikat</span>
            <Copy className="w-4 h-4 text-amber-600" />
          </div>
          <p className="text-2xl font-black text-amber-800">{duplicateCount.toLocaleString("id-ID")}</p>
          <p className="text-[11px] text-amber-600/80 mt-0.5">Dilewati secara bawaan</p>
        </div>

        <div className="p-4 bg-rose-50/60 border border-rose-100 rounded-2xl shadow-xs">
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-xs font-semibold uppercase tracking-wider">Tidak Valid</span>
            <AlertOctagon className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-black text-rose-800">{invalidCount.toLocaleString("id-ID")}</p>
          <p className="text-[11px] text-rose-600/80 mt-0.5">Dilewati oleh parser</p>
        </div>
      </div>

      {/* Collapsible Warnings Panel */}
      {warnings && warnings.length > 0 && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl overflow-hidden shadow-xs">
          <button
            type="button"
            onClick={() => setIsWarningsOpen(!isWarningsOpen)}
            className="w-full flex items-center justify-between px-4 py-3 text-left transition hover:bg-amber-100/50"
          >
            <div className="flex items-center gap-2.5 text-amber-900 font-bold text-xs sm:text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Peringatan Parsing & Rekonsiliasi ({warnings.length} catatan)</span>
            </div>
            <div className="flex items-center gap-1 text-xs text-amber-700 font-semibold">
              <span>{isWarningsOpen ? "Sembunyikan" : "Tampilkan"}</span>
              {isWarningsOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </button>

          {isWarningsOpen && (
            <div className="px-4 pb-3.5 pt-1 border-t border-amber-200/60 space-y-1 text-xs text-amber-800 max-h-48 overflow-y-auto">
              {warnings.map((w, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-amber-500 font-bold">•</span>
                  <span>{w}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
