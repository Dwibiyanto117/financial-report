import React, { useState, useEffect } from "react";
import {
  FileUp,
  History,
  UploadCloud,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  CheckCircle2,
  Info,
  ArrowRight,
  ShieldCheck,
  RotateCcw
} from "lucide-react";
import { getAccounts } from "../services/accountService";
import { previewImport } from "../services/importService";
import ImportDropzone from "../components/import/ImportDropzone";
import TemplateDownloadModal from "../components/import/TemplateDownloadModal";
import FilePasswordModal from "../components/import/FilePasswordModal";
import GenericMappingForm from "../components/import/GenericMappingForm";

const PARSER_OPTIONS = [
  { value: "auto", label: "Otomatis (Rekomendasi)", desc: "Deteksi otomatis berdasarkan struktur dan header berkas" },
  { value: "mandiri", label: "Bank Mandiri (e-Statement)", desc: "Format berkas mutasi dan e-Statement Bank Mandiri" },
  { value: "template", label: "Template Standar FinReport", desc: "Format CSV atau Excel seragam hasil unduhan FinReport" },
  { value: "generic", label: "Generik (Kustom)", desc: "Tentukan sendiri nama kolom tanggal, keterangan, dan nominal" }
];

export default function Import() {
  const [activeTab, setActiveTab] = useState("new"); // "new" | "history"

  // Master Data Rekening
  const [accounts, setAccounts] = useState([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // Form State
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedParser, setSelectedParser] = useState("auto");
  const [genericMapping, setGenericMapping] = useState({ date: "", description: "", amount: "" });

  // Preview Result & State
  const [previewData, setPreviewData] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [pageError, setPageError] = useState("");

  // Modals State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordModalError, setPasswordModalError] = useState("");

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const res = await getAccounts({ include_archived: "false" });
      if (res.success && Array.isArray(res.data)) {
        setAccounts(res.data);
        if (res.data.length > 0) {
          setSelectedAccountId(String(res.data[0].id));
        }
      }
    } catch (err) {
      setPageError("Gagal memuat daftar rekening pengguna.");
    } finally {
      setLoadingAccounts(false);
    }
  };

  const handleProcessPreview = async (filePassword = null) => {
    if (!selectedAccountId) {
      setPageError("Harap pilih rekening tujuan terlebih dahulu.");
      return;
    }
    if (!selectedFile) {
      setPageError("Harap pilih berkas mutasi yang ingin diimpor.");
      return;
    }

    setPageError("");
    setPasswordModalError("");
    setLoadingPreview(true);

    const formData = new FormData();
    formData.append("account_id", String(selectedAccountId));
    formData.append("file", selectedFile);

    if (selectedParser !== "auto") {
      formData.append("parser", selectedParser);
    }

    if (selectedParser === "generic") {
      formData.append("mapping", JSON.stringify(genericMapping));
    }

    if (filePassword) {
      formData.append("file_password", filePassword);
    }

    try {
      const res = await previewImport(formData);
      if (res.success && res.data) {
        setPreviewData(res.data);
        setIsPasswordModalOpen(false);
      }
    } catch (err) {
      const errors = err.response?.data?.errors || [];
      const isPasswordError = errors.some((e) => e.field === "file_password");

      if (isPasswordError) {
        const errorMsg = err.response?.data?.message || "Berkas terenkripsi membutuhkan password untuk dibuka.";
        setPasswordModalError(errorMsg);
        setIsPasswordModalOpen(true);
      } else {
        const msg = err.response?.data?.message || err.message || "Gagal memproses pratinjau berkas mutasi.";
        setPageError(msg);
      }
    } finally {
      setLoadingPreview(false);
    }
  };

  const handlePasswordSubmit = (password) => {
    handleProcessPreview(password);
  };

  const handleResetImport = () => {
    setPreviewData(null);
    setSelectedFile(null);
    setPageError("");
  };

  const handleApplySuggestedAccount = () => {
    if (previewData?.suggested_account?.id) {
      setSelectedAccountId(String(previewData.suggested_account.id));
    }
  };

  const selectedAccountObj = accounts.find((a) => String(a.id) === String(selectedAccountId));

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

        <button
          type="button"
          onClick={() => setIsTemplateModalOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold rounded-xl border border-slate-200 shadow-xs transition shrink-0"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
          <span>Unduh Template Standar</span>
        </button>
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
          {pageError && (
            <div className="flex items-center gap-2.5 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-2xl">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{pageError}</span>
            </div>
          )}

          {!previewData ? (
            /* STEP 1: Form Pemilihan Rekening & Upload */
            <div className="bg-white p-5 sm:p-7 rounded-2xl border border-slate-200 shadow-xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-base font-bold text-slate-800">Langkah 1: Konfigurasi & Berkas</h2>
                <p className="text-xs text-slate-500 mt-0.5">Pilih rekening tujuan dan unggah berkas mutasi rekening Anda</p>
              </div>

              {/* Pilih Rekening */}
              <div>
                <label htmlFor="import-account-select" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Pilih Rekening Tujuan <span className="text-rose-500">*</span>
                </label>
                {loadingAccounts ? (
                  <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
                    <span>Memuat rekening...</span>
                  </div>
                ) : (
                  <select
                    id="import-account-select"
                    value={selectedAccountId}
                    onChange={(e) => setSelectedAccountId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-medium focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    {accounts.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.institution}) {acc.accountNoMasked ? `— ${acc.accountNoMasked}` : ""}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Dropzone Berkas */}
              <ImportDropzone
                file={selectedFile}
                onFileSelect={(f) => setSelectedFile(f)}
                onFileRemove={() => setSelectedFile(null)}
              />

              {/* Pilihan Parser Adapter */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Pilihan Parser Berkas
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {PARSER_OPTIONS.map((opt) => {
                    const isSelected = selectedParser === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setSelectedParser(opt.value)}
                        className={`text-left p-3.5 rounded-xl border transition ${
                          isSelected
                            ? "border-emerald-600 bg-emerald-50 text-emerald-950 shadow-xs"
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-bold ${isSelected ? "text-emerald-800" : "text-slate-800"}`}>
                            {opt.label}
                          </span>
                          <span className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${isSelected ? "border-emerald-600 bg-emerald-600" : "border-slate-300"}`}>
                            {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pemetaan Generic jika parser generic dipilih */}
              {selectedParser === "generic" && (
                <GenericMappingForm
                  mapping={genericMapping}
                  onChange={setGenericMapping}
                  onOpenTemplateModal={() => setIsTemplateModalOpen(true)}
                />
              )}

              {/* Submit Button */}
              <div className="flex items-center justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleProcessPreview()}
                  disabled={loadingPreview || !selectedFile || !selectedAccountId}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
                >
                  {loadingPreview ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Memproses Berkas...</span>
                    </>
                  ) : (
                    <>
                      <span>Lanjut ke Pratinjau</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            /* STEP 2: Preview Hasil (placeholder untuk Batch M8.3-4) */
            <div className="space-y-6">
              {/* Banner Usulan Rekening (Suggested Account) */}
              {previewData.suggested_account &&
                String(previewData.suggested_account.id) !== String(selectedAccountId) && (
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-2xl gap-3">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-blue-900">
                          Usulan Rekening Berdasarkan Berkas
                        </p>
                        <p className="text-xs text-blue-700 mt-0.5">
                          Nomor rekening di berkas mutasi cocok dengan rekening{" "}
                          <span className="font-semibold underline">{previewData.suggested_account.name}</span>.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleApplySuggestedAccount}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-xs transition shrink-0"
                    >
                      Gunakan Rekening Ini
                    </button>
                  </div>
                )}

              {/* Placeholder Tabel Preview Transaksi */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      Langkah 2: Tinjau Pratinjau Mutasi ({previewData.summary?.total || 0} baris)
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Parser: <span className="font-semibold uppercase">{previewData.parser}</span> | Berkas: {previewData.file_name}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetImport}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Pilih Berkas Lain</span>
                  </button>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl text-center text-sm text-slate-600">
                  Pratinjau berkas berhasil dimuat! Tabel tinjau dan aksi commit transaksi akan ditampilkan pada Batch M8.3-4.
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* TAB RIWAYAT: Placeholder untuk Batch M8.3-5 */
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-center py-12">
              <History className="w-12 h-12 text-slate-400 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-slate-800">Riwayat Batch Impor</h3>
              <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
                Daftar riwayat batch impor dan fitur rollback akan ditampilkan pada Batch M8.3-5.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Modal Dialogs */}
      <TemplateDownloadModal
        isOpen={isTemplateModalOpen}
        onClose={() => setIsTemplateModalOpen(false)}
      />

      <FilePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSubmit={handlePasswordSubmit}
        errorMessage={passwordModalError}
        loading={loadingPreview}
      />
    </div>
  );
}
