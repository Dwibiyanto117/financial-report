import React, { useState } from "react";
import { FileUp, History, UploadCloud, AlertCircle } from "lucide-react";

export default function Import() {
  const [activeTab, setActiveTab] = useState("new"); // "new" | "history"

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Import Mutasi Rekening</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Unggah mutasi bank atau e-wallet (CSV, XLSX, atau e-Statement terenkripsi) untuk diproses secara aman.
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-6" aria-label="Tabs">
          <button
            onClick={() => setActiveTab("new")}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-semibold text-sm transition ${
              activeTab === "new"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <FileUp className="w-4 h-4" />
            <span>Impor Baru</span>
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 py-3 px-1 border-b-2 font-semibold text-sm transition ${
              activeTab === "history"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
            }`}
          >
            <History className="w-4 h-4" />
            <span>Riwayat Impor</span>
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === "new" ? (
        <div className="space-y-6">
          {/* Kontainer form upload dan wizard impor baru (diisi di Batch M8.3-3 & M8.3-4) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-center py-12">
              <UploadCloud className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">Mulai Impor Mutasi</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                Pilih rekening tujuan dan unggah berkas mutasi rekening Anda.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Kontainer riwayat impor batch (diisi di Batch M8.3-5) */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-center py-12">
              <History className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">Riwayat Batch Impor</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                Daftar berkas mutasi yang telah diimpor atau dibatalkan sebelumnya.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
