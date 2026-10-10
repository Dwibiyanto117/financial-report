import React, { useState } from "react";
import { Sliders, HelpCircle, FileSpreadsheet } from "lucide-react";

export default function GenericMappingForm({ mapping, onChange, onOpenTemplateModal }) {
  const [useDebitCredit, setUseDebitCredit] = useState(false);

  const handleFieldChange = (field, val) => {
    onChange({
      ...mapping,
      [field]: val
    });
  };

  const handleToggleMode = (isDk) => {
    setUseDebitCredit(isDk);
    if (isDk) {
      // Beralih ke debit/credit
      const updated = { ...mapping };
      delete updated.amount;
      delete updated.type;
      onChange(updated);
    } else {
      // Beralih ke single amount
      const updated = { ...mapping };
      delete updated.debit;
      delete updated.credit;
      onChange(updated);
    }
  };

  return (
    <div className="p-4 sm:p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-600" />
          <h4 className="text-sm font-bold text-slate-800">Pemetaan Kolom Berkas Generik</h4>
        </div>
        <button
          type="button"
          onClick={onOpenTemplateModal}
          className="inline-flex items-center gap-1.5 text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Atau gunakan Template Standar</span>
        </button>
      </div>

      <p className="text-xs text-slate-500">
        Ketik nama kolom persis sesuai baris judul (header) pada lembar kerja Anda.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Kolom Tanggal */}
        <div>
          <label htmlFor="mapping-date" className="block text-xs font-semibold text-slate-700 mb-1">
            Nama Kolom Tanggal <span className="text-rose-500">*</span>
          </label>
          <input
            id="mapping-date"
            type="text"
            required
            value={mapping.date || ""}
            onChange={(e) => handleFieldChange("date", e.target.value)}
            placeholder="Contoh: Tanggal atau Date"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Kolom Deskripsi */}
        <div>
          <label htmlFor="mapping-description" className="block text-xs font-semibold text-slate-700 mb-1">
            Nama Kolom Keterangan <span className="text-rose-500">*</span>
          </label>
          <input
            id="mapping-description"
            type="text"
            required
            value={mapping.description || ""}
            onChange={(e) => handleFieldChange("description", e.target.value)}
            placeholder="Contoh: Keterangan atau Description"
            className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Mode Format Nominal */}
      <div className="pt-2 border-t border-slate-200">
        <label className="block text-xs font-semibold text-slate-700 mb-2">
          Struktur Kolom Nominal Transaksi
        </label>
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          <button
            type="button"
            onClick={() => handleToggleMode(false)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
              !useDebitCredit
                ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            Satu Kolom Nominal & Jenis
          </button>
          <button
            type="button"
            onClick={() => handleToggleMode(true)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold border transition ${
              useDebitCredit
                ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            Kolom Debit & Kredit Terpisah
          </button>
        </div>

        {!useDebitCredit ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="mapping-amount" className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Kolom Nominal <span className="text-rose-500">*</span>
              </label>
              <input
                id="mapping-amount"
                type="text"
                required={!useDebitCredit}
                value={mapping.amount || ""}
                onChange={(e) => handleFieldChange("amount", e.target.value)}
                placeholder="Contoh: Jumlah atau Nominal"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="mapping-type" className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Kolom Jenis (Opsional)
              </label>
              <input
                id="mapping-type"
                type="text"
                value={mapping.type || ""}
                onChange={(e) => handleFieldChange("type", e.target.value)}
                placeholder="Contoh: Tipe atau Jenis"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="mapping-debit" className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Kolom Debit (Pengeluaran) <span className="text-rose-500">*</span>
              </label>
              <input
                id="mapping-debit"
                type="text"
                required={useDebitCredit}
                value={mapping.debit || ""}
                onChange={(e) => handleFieldChange("debit", e.target.value)}
                placeholder="Contoh: Debet atau Keluar"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label htmlFor="mapping-credit" className="block text-xs font-semibold text-slate-700 mb-1">
                Nama Kolom Kredit (Pemasukan) <span className="text-rose-500">*</span>
              </label>
              <input
                id="mapping-credit"
                type="text"
                required={useDebitCredit}
                value={mapping.credit || ""}
                onChange={(e) => handleFieldChange("credit", e.target.value)}
                placeholder="Contoh: Kredit atau Masuk"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
