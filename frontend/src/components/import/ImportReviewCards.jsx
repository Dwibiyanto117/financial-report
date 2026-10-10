import React from "react";
import { formatCurrency } from "../../utils/currency";
import { isPotentialTransfer, getSuggestionBadge } from "../../utils/importHelpers";
import { ArrowDownRight, ArrowUpRight, Copy, ArrowRightLeft, Sparkles } from "lucide-react";

export default function ImportReviewCards({
  rows = [],
  categories = [],
  accountNames = [],
  onRowChange,
  onSelectAllNew,
  onSelectAll,
  onDeselectAll
}) {
  const selectedCount = rows.filter((r) => r.include).length;

  return (
    <div className="space-y-3 md:hidden">
      {/* Mobile Bulk Actions */}
      <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-2.5">
        <div className="flex items-center justify-between text-slate-700 font-semibold">
          <span>Dipilih untuk diimpor:</span>
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-lg font-bold">
            {selectedCount} dari {rows.length}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          <button
            type="button"
            onClick={onSelectAllNew}
            className="py-1.5 px-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-center font-semibold rounded-lg text-[11px]"
          >
            Pilih Baru
          </button>
          <button
            type="button"
            onClick={onSelectAll}
            className="py-1.5 px-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-center font-semibold rounded-lg text-[11px]"
          >
            Pilih Semua
          </button>
          <button
            type="button"
            onClick={onDeselectAll}
            className="py-1.5 px-2 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-center font-semibold rounded-lg text-[11px]"
          >
            Kosongkan
          </button>
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-2.5">
        {rows.map((row) => {
          const availableCats = categories.filter((c) => c.type === row.type);
          const maybeTransfer = isPotentialTransfer(row.description, accountNames);
          const badge = getSuggestionBadge(row.suggestion_source);

          return (
            <div
              key={row.index}
              className={`p-4 bg-white border rounded-2xl shadow-xs transition space-y-3 ${
                !row.include
                  ? "opacity-60 bg-slate-50/50 border-slate-200"
                  : row.is_duplicate
                  ? "border-amber-200 bg-amber-50/10"
                  : "border-slate-200"
              }`}
            >
              {/* Card Header: Checkbox + Tanggal + Nominal */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <input
                    type="checkbox"
                    checked={!!row.include}
                    onChange={(e) => onRowChange(row.index, { include: e.target.checked })}
                    className="w-4 h-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800">{row.date}</span>
                    {row.time && <span className="text-[11px] text-slate-400 font-mono ml-1.5">{row.time}</span>}
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {row.type === "INCOME" ? (
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
                    )}
                    <span
                      className={`font-black text-sm ${
                        row.type === "INCOME" ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      {row.type === "INCOME" ? "+" : "-"}
                      {formatCurrency(row.amount)}
                    </span>
                  </div>
                  {row.balance !== null && row.balance !== undefined && (
                    <p className="text-[10px] text-slate-400">Saldo: {formatCurrency(row.balance)}</p>
                  )}
                </div>
              </div>

              {/* Deskripsi & Badges */}
              <div className="space-y-1.5 pt-1 border-t border-slate-100">
                <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                  {row.description}
                </p>

                <div className="flex flex-wrap items-center gap-1.5">
                  {row.is_duplicate && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      <Copy className="w-2.5 h-2.5" />
                      <span>Duplikat</span>
                    </span>
                  )}
                  {maybeTransfer && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      <ArrowRightLeft className="w-2.5 h-2.5" />
                      <span>Mungkin Transfer</span>
                    </span>
                  )}
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium border ${badge.className}`}>
                    {badge.label}
                  </span>
                </div>
              </div>

              {/* Dropdown Kategori */}
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Pilih Kategori
                </label>
                <select
                  value={row.category_id || ""}
                  onChange={(e) =>
                    onRowChange(row.index, { category_id: e.target.value ? Number(e.target.value) : null })
                  }
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">(Pilih Kategori)</option>
                  {availableCats.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ingat Aturan Kategori */}
              <div className="pt-2 border-t border-slate-100 space-y-1.5">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 text-xs select-none">
                  <input
                    type="checkbox"
                    checked={!!row.learn_rule}
                    onChange={(e) => onRowChange(row.index, { learn_rule: e.target.checked })}
                    className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="font-semibold text-[11px]">Ingat aturan kata kunci</span>
                </label>

                {row.learn_rule && (
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-emerald-500 shrink-0" />
                    <input
                      type="text"
                      value={row.keyword || ""}
                      onChange={(e) => onRowChange(row.index, { keyword: e.target.value })}
                      placeholder="Kata kunci..."
                      className="w-full px-2.5 py-1.5 bg-emerald-50/50 border border-emerald-200 rounded-xl text-xs font-mono text-emerald-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
