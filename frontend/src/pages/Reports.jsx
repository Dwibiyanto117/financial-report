import React, { useState, useEffect } from "react";
import {
  FileSpreadsheet,
  FileText,
  Download,
  Calendar,
  Filter,
  Loader2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import api from "../services/api";
import { formatCurrency } from "../utils/currency";

export default function Reports() {
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split("T")[0]
  );
  const [summary, setSummary] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloadingExcel, setDownloadingExcel] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const [sumRes, txRes] = await Promise.all([
        api.get(`/dashboard/summary?startDate=${startDate}&endDate=${endDate}`),
        api.get(`/transactions?startDate=${startDate}&endDate=${endDate}&limit=100`)
      ]);

      if (sumRes.data.success) setSummary(sumRes.data.data);
      if (txRes.data.success) setTransactions(txRes.data.data.items);
    } catch (err) {
      console.error("Gagal memuat pratinjau laporan:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, [startDate, endDate]);

  const handleDownloadExcel = async () => {
    setDownloadingExcel(true);
    try {
      const res = await api.get(`/reports/export/excel?startDate=${startDate}&endDate=${endDate}`, {
        responseType: "blob"
      });

      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `FinReport_Keuangan_${startDate}_sd_${endDate}.xlsx`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Gagal mengunduh file Excel");
    } finally {
      setDownloadingExcel(false);
    }
  };

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const res = await api.get(`/reports/export/pdf?startDate=${startDate}&endDate=${endDate}`, {
        responseType: "blob"
      });

      const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `FinReport_Ringkasan_${startDate}_sd_${endDate}.pdf`
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert("Gagal mengunduh file PDF");
    } finally {
      setDownloadingPdf(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Laporan & Ekspor</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Tinjau rekapitulasi keuangan berkala dan ekspor langsung ke format Excel dan PDF.
        </p>
      </div>

      {/* Filter & Action Panel */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Rentang Periode */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-slate-400 text-xs">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleDownloadExcel}
              disabled={downloadingExcel || transactions.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              {downloadingExcel ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileSpreadsheet className="w-4 h-4" />
              )}
              <span>Unduh Excel (.xlsx)</span>
            </button>

            <button
              onClick={handleDownloadPdf}
              disabled={downloadingPdf || transactions.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition"
            >
              {downloadingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              <span>Unduh PDF (.pdf)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards Preview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Pemasukan Periode</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-extrabold text-emerald-600 mt-1">
            {formatCurrency(summary?.period?.income || 0)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Pengeluaran Periode</span>
            <ArrowDownRight className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-extrabold text-rose-600 mt-1">
            {formatCurrency(summary?.period?.expense || 0)}
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase">Selisih Bersih (Net)</span>
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div
            className={`text-xl font-extrabold mt-1 ${
              (summary?.period?.net || 0) >= 0 ? "text-indigo-600" : "text-rose-600"
            }`}
          >
            {formatCurrency(summary?.period?.net || 0)}
          </div>
        </div>
      </div>

      {/* Preview Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800">
            Pratinjau Data Laporan ({transactions.length} baris transaksi)
          </h2>
        </div>

        {loading ? (
          <div className="py-16 flex justify-center items-center">
            <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            Tidak ada transaksi pada rentang tanggal yang dipilih.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase">
                  <th className="py-3 px-4 text-center">No</th>
                  <th className="py-3 px-4">Tanggal</th>
                  <th className="py-3 px-4">Tipe</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Keterangan</th>
                  <th className="py-3 px-4 text-right">Nominal (IDR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.map((tx, idx) => (
                  <tr key={tx.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-4 text-center text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-4 whitespace-nowrap text-slate-600">
                      {new Date(tx.transactionDate).toLocaleDateString("id-ID")}
                    </td>
                    <td className="py-2.5 px-4 whitespace-nowrap">
                      <span
                        className={`font-semibold ${
                          tx.type === "INCOME" ? "text-emerald-700" : "text-rose-700"
                        }`}
                      >
                        {tx.type === "INCOME" ? "Pemasukan" : "Pengeluaran"}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-800 whitespace-nowrap">
                      {tx.category?.name}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600 max-w-sm truncate">
                      {tx.description || "-"}
                    </td>
                    <td
                      className={`py-2.5 px-4 text-right font-bold whitespace-nowrap ${
                        tx.type === "INCOME" ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {tx.type === "INCOME" ? "+" : "-"}
                      {formatCurrency(tx.amount)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}