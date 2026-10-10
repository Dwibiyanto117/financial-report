import React from "react";
import { formatCurrency } from "../../utils/currency";
import { isPotentialTransfer, getSuggestionBadge } from "../../utils/importHelpers";
import { ArrowDownRight, ArrowUpRight, Copy, ArrowRightLeft, Sparkles, CheckSquare, Square } from "lucide-react";

export default function ImportReviewTable({
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
    <div className="space-y-3">
      {/* Bulk Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
        <div className="flex items-center gap-2 text-slate-700 font-semibold">
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-lg font-bold">
            {selectedCount}
          </span>
          <span>dari {rows.length} transaksi dipilih untuk diimpor</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSelectAllNew}
            className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg transition"
          >
            Pilih Semua Baru
          </button>
          <button
            type="button"
            onClick={onSelectAll}
            className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg transition"
          >
            Pilih Semua
          </button>
          <button
            type="button"
            onClick={onDeselectAll}
            className="px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg transition"
          >
            Kosongkan
          </button>
        </div>
      </div>

      {/* Desktop Table View */}
      <div className="overflow-x-auto bg-white border border-slate-200 rounded-2xl shadow-xs">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-bold uppercase tracking-wider">
              <th className="py-3.5 px-3 w-10 text-center">Impor</th>
              <th className="py-3.5 px-3 w-28">Tanggal & Jam</th>
              <th className="py-3.5 px-3 min-w-[220px]">Keterangan</th>
              <th className="py-3.5 px-3 w-32 text-right">Nominal</th>
              <th className="py-3.5 px-3 w-48">Kategori</th>
              <th className="py-3.5 px-3 min-w-[200px]">Aturan Kategori</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {rows.map((row) => {
              const availableCats = categories.filter((c) => c.type === row.type);
              const maybeTransfer = isPotentialTransfer(row.description, accountNames);
              const badge = getSuggestionBadge(row.suggestion_source);

              return (
                <tr
                  key={row.index}
                  className={`transition hover:bg-slate-50/80 ${
                    !row.include ? "opacity-60 bg-slate-50/30" : row.is_duplicate ? "bg-amber-50/20" : ""
                  }`}
                >
                  {/* Checkbox Include */}
                  <td className="py-3 px-3 text-center align-top pt-3.5">
                    <input
                      type="checkbox"
                      checked={!!row.include}
                      onChange={(e) => onRowChange(row.index, { include: e.target.checked })}
                      className="w-4 h-4 rounded-md border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </td>

                  {/* Tanggal & Jam */}
                  <td className="py-3 px-3 align-top">
                    <p className="font-bold text-slate-800">{row.date}</p>
                    {row.time ? (
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5">{row.time}</p>
                    ) : (
                      <p className="text-[10px] text-slate-300 italic mt-0.5">-</p>
                    )}
                  </td>

                  {/* Keterangan & Badges */}
                  <td className="py-3 px-3 align-top space-y-1">
                    <p className="font-semibold text-slate-800 break-words leading-relaxed">
                      {row.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
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
                  </td>

                  {/* Nominal & Tipe */}
                  <td className="py-3 px-3 align-top text-right">
                    <div className="flex items-center justify-end gap-1">
                      {row.type === "INCOME" ? (
                        <ArrowUpRight className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      ) : (
                        <ArrowDownRight className="w-3.5 h-3.5 text-rose-600 shrink-0" />
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
                      <p className="text-[10px] text-slate-400 mt-0.5">
                        Saldo: {formatCurrency(row.balance)}
                      </p>
                    )}
                  </td>

                  {/* Kategori Dropdown */}
                  <td className="py-3 px-3 align-top">
                    <select
                      value={row.category_id || ""}
                      onChange={(e) =>
                        onRowChange(row.index, { category_id: e.target.value ? Number(e.target.value) : null })
                      }
                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="">(Pilih Kategori)</option>
                      {availableCats.map((cat) => (
                        <option key={cat.id} value={cat.id}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Kontrol Ingat Aturan (learn_rule) */}
                  <td className="py-3 px-3 align-top space-y-1.5">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-600 hover:text-slate-900 select-none">
                      <input
                        type="checkbox"
                        checked={!!row.learn_rule}
                        onChange={(e) => onRowChange(row.index, { learn_rule: e.target.checked })}
                        className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="font-semibold text-[11px]">Ingat aturan kata kunci</span>
                    </label>

                    {row.learn_rule && (
                      <div className="flex items-center gap-1 animate-in fade-in duration-150">
                        <Sparkles className="w-3 h-3 text-emerald-500 shrink-0" />
                        <input
                          type="text"
                          value={row.keyword || ""}
                          onChange={(e) => onRowChange(row.index, { keyword: e.target.value })}
                          placeholder="Kata kunci..."
                          className="w-full px-2 py-1 bg-emerald-50/50 border border-emerald-200 rounded-lg text-xs font-mono text-emerald-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
