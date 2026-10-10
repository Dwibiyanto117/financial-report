import React, { useState, useEffect } from "react";
import { getImports, rollbackImport } from "../../services/importService";
import { getBatchRowCountDisplay } from "../../utils/importHelpers";
import RollbackConfirmModal from "./RollbackConfirmModal";
import {
  History,
  RotateCcw,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Calendar,
  Filter,
  Check
} from "lucide-react";

export default function ImportHistoryList({ accounts = [] }) {
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filters
  const [filterAccount, setFilterAccount] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL"); // ALL, COMMITTED, CANCELLED, PREVIEW

  // Rollback Modal State
  const [selectedBatchForRollback, setSelectedBatchForRollback] = useState(null);
  const [submittingRollback, setSubmittingRollback] = useState(false);

  useEffect(() => {
    fetchBatchesList();
  }, [filterAccount]);

  const fetchBatchesList = async () => {
    setLoading(true);
    setError("");
    try {
      const params = {};
      if (filterAccount) params.account_id = filterAccount;
      const res = await getImports(params);
      if (res.success && Array.isArray(res.data)) {
        setBatches(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Gagal memuat daftar riwayat impor mutasi");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRollback = async (batchId) => {
    setSubmittingRollback(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await rollbackImport(batchId);
      if (res.success) {
        setSuccessMsg(res.message || "Batch impor berhasil di-rollback dan transaksi telah dihapus.");
        setSelectedBatchForRollback(null);
        fetchBatchesList();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Gagal melakukan rollback batch impor");
      setSelectedBatchForRollback(null);
    } finally {
      setSubmittingRollback(false);
    }
  };

  const handleCancelPreviewBatch = async (batchId) => {
    if (!window.confirm("Batalkan batch pratinjau ini?")) return;
    setLoading(true);
    setError("");
    try {
      const res = await rollbackImport(batchId);
      if (res.success) {
        setSuccessMsg("Batch pratinjau berhasil dibatalkan.");
        fetchBatchesList();
      }
    } catch (err) {
      setError(err.response?.data?.message || "Gagal membatalkan batch pratinjau");
    } finally {
      setLoading(false);
    }
  };

  const filteredBatches = batches.filter((b) => {
    if (filterStatus === "ALL") return true;
    return b.status === filterStatus;
  });

  const getStatusBadge = (status) => {
    switch (status) {
      case "COMMITTED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            <span>Selesai</span>
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
            <XCircle className="w-3 h-3" />
            <span>Dibatalkan</span>
          </span>
        );
      case "PREVIEW":
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <History className="w-3 h-3" />
            <span>Pratinjau</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Alert Messages */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm rounded-xl">
          <Check className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-semibold mr-1">Status:</span>
          {["ALL", "COMMITTED", "CANCELLED", "PREVIEW"].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl font-semibold transition ${
                filterStatus === st
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {st === "ALL" ? "Semua" : st === "COMMITTED" ? "Selesai" : st === "CANCELLED" ? "Dibatalkan" : "Pratinjau"}
            </button>
          ))}
        </div>

        <div className="w-full sm:w-64">
          <select
            value={filterAccount}
            onChange={(e) => setFilterAccount(e.target.value)}
            className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
          >
            <option value="">Semua Rekening</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.institution})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto mb-2" />
          <p className="text-xs text-slate-500">Memuat riwayat impor mutasi...</p>
        </div>
      ) : filteredBatches.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-xs">
          <History className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Belum ada riwayat impor mutasi</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {filterStatus !== "ALL" || filterAccount
              ? "Tidak ada berkas yang cocok dengan filter yang dipilih."
              : "Seluruh berkas yang Anda impor akan dicatat riwayatnya di sini."}
          </p>
        </div>
      ) : (
        <>
          {/* Desktop Table View */}
          <div className="hidden md:block overflow-x-auto bg-white border border-slate-200 rounded-2xl shadow-xs">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-28">ID & Status</th>
                  <th className="py-3.5 px-4">Nama Berkas</th>
                  <th className="py-3.5 px-4">Rekening</th>
                  <th className="py-3.5 px-4">Parser</th>
                  <th className="py-3.5 px-4 text-center">Tersimpan / Total</th>
                  <th className="py-3.5 px-4">Waktu Impor</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredBatches.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4">
                      <p className="font-mono text-slate-500 font-bold mb-1">#{b.id}</p>
                      {getStatusBadge(b.status)}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-slate-800 break-words max-w-xs">{b.file_name || b.fileName}</p>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{b.account?.name || "-"}</p>
                      <p className="text-[11px] text-slate-400">{b.account?.institution || "-"}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-mono text-[11px] uppercase">
                        {b.parser}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      {(() => {
                        const rowDisplay = getBatchRowCountDisplay(b);
                        return (
                          <>
                            <span className={rowDisplay.noteType === "committed" ? "text-emerald-700" : "text-slate-500"}>
                              {rowDisplay.primary}
                            </span>
                            <span className="text-slate-400 font-normal"> / {rowDisplay.total}</span>
                            {rowDisplay.note && (
                              <p
                                className={`text-[10px] font-normal mt-0.5 ${
                                  rowDisplay.noteType === "cancelled"
                                    ? "text-rose-600"
                                    : rowDisplay.noteType === "preview"
                                    ? "text-amber-600"
                                    : "text-amber-600"
                                }`}
                              >
                                {rowDisplay.note}
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {b.created_at || b.createdAt
                        ? new Date(b.created_at || b.createdAt).toLocaleString("id-ID")
                        : "-"}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {b.status === "COMMITTED" && (
                        <button
                          type="button"
                          onClick={() => setSelectedBatchForRollback(b)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-semibold text-xs transition shadow-2xs"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Rollback</span>
                        </button>
                      )}
                      {b.status === "PREVIEW" && (
                        <button
                          type="button"
                          onClick={() => handleCancelPreviewBatch(b.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition"
                        >
                          <span>Batalkan</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-3">
            {filteredBatches.map((b) => (
              <div key={b.id} className="p-4 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-xs font-bold text-slate-500">#{b.id}</span>
                    <h4 className="text-xs font-bold text-slate-800 break-words mt-0.5">
                      {b.file_name || b.fileName}
                    </h4>
                  </div>
                  <div>{getStatusBadge(b.status)}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-slate-100 text-slate-600">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Rekening:</span>
                    <span className="font-semibold text-slate-800">{b.account?.name || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Parser:</span>
                    <span className="font-mono uppercase text-slate-700 text-[11px]">{b.parser}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Tersimpan / Total:</span>
                    {(() => {
                      const rowDisplay = getBatchRowCountDisplay(b);
                      return (
                        <>
                          <span className={`font-bold ${rowDisplay.noteType === "committed" ? "text-emerald-700" : "text-slate-500"}`}>
                            {rowDisplay.primary}
                          </span>
                          <span className="text-slate-400"> / {rowDisplay.total}</span>
                          {rowDisplay.note && (
                            <p
                              className={`text-[10px] font-normal mt-0.5 ${
                                rowDisplay.noteType === "cancelled"
                                  ? "text-rose-600"
                                  : rowDisplay.noteType === "preview"
                                  ? "text-amber-600"
                                  : "text-amber-600"
                              }`}
                            >
                              {rowDisplay.note}
                            </p>
                          )}
                        </>
                      );
                    })()}
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Waktu:</span>
                    <span className="text-[11px] text-slate-500">
                      {b.created_at || b.createdAt
                        ? new Date(b.created_at || b.createdAt).toLocaleDateString("id-ID")
                        : "-"}
                    </span>
                  </div>
                </div>

                {b.status === "COMMITTED" && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedBatchForRollback(b)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-semibold text-xs transition"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Rollback Batch Ini</span>
                    </button>
                  </div>
                )}
                {b.status === "PREVIEW" && (
                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => handleCancelPreviewBatch(b.id)}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold text-xs transition"
                    >
                      <span>Batalkan Pratinjau</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Rollback Confirm Modal */}
      <RollbackConfirmModal
        isOpen={!!selectedBatchForRollback}
        batch={selectedBatchForRollback}
        onClose={() => setSelectedBatchForRollback(null)}
        onConfirm={handleConfirmRollback}
        loading={submittingRollback}
      />
    </div>
  );
}
