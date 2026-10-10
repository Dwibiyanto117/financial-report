import React, { useState, useEffect } from "react";
import {
  FileUp,
  History,
  Loader2,
  AlertCircle,
  FileSpreadsheet,
  Info,
  ArrowRight,
  RotateCcw,
  CheckCircle2
} from "lucide-react";
import api from "../services/api";
import { getAccounts } from "../services/accountService";
import { previewImport, commitImport, getParsers } from "../services/importService";
import ImportDropzone from "../components/import/ImportDropzone";
import TemplateDownloadModal from "../components/import/TemplateDownloadModal";
import FilePasswordModal from "../components/import/FilePasswordModal";
import GenericMappingForm from "../components/import/GenericMappingForm";
import ImportSummaryBar from "../components/import/ImportSummaryBar";
import ImportReviewTable from "../components/import/ImportReviewTable";
import ImportReviewCards from "../components/import/ImportReviewCards";
import ImportResultScreen from "../components/import/ImportResultScreen";
import ImportHistoryList from "../components/import/ImportHistoryList";

const DEFAULT_PARSER_OPTIONS = [
  { value: "auto", label: "Otomatis (Rekomendasi)", desc: "Deteksi otomatis berdasarkan struktur dan header berkas" }
];

export default function Import() {
  const [activeTab, setActiveTab] = useState("new"); // "new" | "history"

  // Master Data
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [parserOptions, setParserOptions] = useState(DEFAULT_PARSER_OPTIONS);
  const [acceptedFormats, setAcceptedFormats] = useState(["csv", "xlsx"]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Form State
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedParser, setSelectedParser] = useState("auto");
  const [genericMapping, setGenericMapping] = useState({ date: "", description: "", amount: "" });

  // Preview & Review State
  const [previewData, setPreviewData] = useState(null);
  const [reviewRows, setReviewRows] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submittingCommit, setSubmittingCommit] = useState(false);
  const [commitResult, setCommitResult] = useState(null);
  const [pageError, setPageError] = useState("");

  // Modals State
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordModalError, setPasswordModalError] = useState("");

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoadingInitial(true);
    try {
      const [accRes, catRes, parserRes] = await Promise.all([
        getAccounts({ include_archived: "false" }),
        api.get("/categories"),
        getParsers()
      ]);

      if (accRes.success && Array.isArray(accRes.data)) {
        setAccounts(accRes.data);
        if (accRes.data.length > 0) {
          setSelectedAccountId(String(accRes.data[0].id));
        }
      }

      if (catRes.data?.success && Array.isArray(catRes.data.data)) {
        setCategories(catRes.data.data);
      }

      if (parserRes?.success && Array.isArray(parserRes.data)) {
        const serverParsers = parserRes.data;
        const opts = [
          {
            value: "auto",
            label: "Otomatis (Rekomendasi)",
            desc: "Deteksi otomatis berdasarkan struktur dan header berkas"
          },
          ...serverParsers.map((p) => ({
            value: p.name,
            label: p.label,
            desc: p.description,
            formats: p.formats || [],
            requiresMapping: !!p.requiresMapping
          }))
        ];
        setParserOptions(opts);

        const formatsSet = new Set();
        serverParsers.forEach((p) => {
          (p.formats || []).forEach((fmt) => formatsSet.add(fmt.toLowerCase()));
        });
        const formats = Array.from(formatsSet);
        if (formats.length > 0) {
          setAcceptedFormats(formats);
        }
      }
    } catch {
      setPageError("Gagal memuat konfigurasi parser import dari server. Silakan muat ulang halaman.");
    } finally {
      setLoadingInitial(false);
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
        const mappedRows = (res.data.rows || []).map((r) => ({
          ...r,
          include: !r.is_duplicate,
          category_id: r.suggested_category_id || null,
          learn_rule: false,
          keyword: r.suggested_keyword || r.description || ""
        }));
        setReviewRows(mappedRows);
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

  const handleRowChange = (rowIndex, partialChange) => {
    setReviewRows((prev) =>
      prev.map((r) => (r.index === rowIndex ? { ...r, ...partialChange } : r))
    );
  };

  const handleSelectAllNew = () => {
    setReviewRows((prev) => prev.map((r) => ({ ...r, include: !r.is_duplicate })));
  };

  const handleSelectAll = () => {
    setReviewRows((prev) => prev.map((r) => ({ ...r, include: true })));
  };

  const handleDeselectAll = () => {
    setReviewRows((prev) => prev.map((r) => ({ ...r, include: false })));
  };

  const handleCommit = async () => {
    if (!previewData?.batch_id) return;

    const includedRows = reviewRows.filter((r) => r.include);
    if (includedRows.length === 0) {
      setPageError("Harap centang setidaknya satu transaksi untuk diimpor.");
      return;
    }

    setPageError("");
    setSubmittingCommit(true);

    const payloadRows = reviewRows.map((r) => ({
      index: r.index,
      category_id: r.category_id,
      include: !!r.include,
      learn_rule: !!r.learn_rule,
      keyword: r.keyword || r.description
    }));

    try {
      const res = await commitImport(previewData.batch_id, payloadRows);
      if (res.success && res.data) {
        setCommitResult(res.data);
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || "Gagal menyimpan batch import transaksi.";
      setPageError(msg);
    } finally {
      setSubmittingCommit(false);
    }
  };

  const handleResetImport = () => {
    setPreviewData(null);
    setReviewRows([]);
    setCommitResult(null);
    setSelectedFile(null);
    setPageError("");
  };

  const handleApplySuggestedAccount = () => {
    if (previewData?.suggested_account?.id) {
      setSelectedAccountId(String(previewData.suggested_account.id));
    }
  };

  const accountNames = accounts.map((a) => a.name);
  const selectedCount = reviewRows.filter((r) => r.include).length;

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
        <nav className="flex space-x-6" aria-label="Tabs" role="tablist">
          <button
            role="tab"
            id="tab-new"
            aria-controls="tabpanel-new"
            aria-selected={activeTab === "new"}
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
            role="tab"
            id="tab-history"
            aria-controls="tabpanel-history"
            aria-selected={activeTab === "history"}
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
        <div id="tabpanel-new" role="tabpanel" aria-labelledby="tab-new" className="space-y-6">
          {pageError && (
            <div className="flex items-center gap-2.5 p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-2xl">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{pageError}</span>
            </div>
          )}

          {commitResult ? (
            /* STEP 3: Layar Hasil Commit */
            <ImportResultScreen
              result={commitResult}
              onReset={handleResetImport}
              onGoToHistory={() => {
                handleResetImport();
                setActiveTab("history");
              }}
            />
          ) : !previewData ? (
            /* STEP 1: Form Pemilihan Rekening & Upload Berkas */
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
                {loadingInitial ? (
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
                acceptedFormats={acceptedFormats}
              />

              {/* Pilihan Parser Adapter */}
              <div className="space-y-2">
                <label id="parser-options-label" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Pilihan Parser Berkas
                </label>
                <div role="radiogroup" aria-labelledby="parser-options-label" className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {parserOptions.map((opt) => {
                    const isSelected = selectedParser === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
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
            /* STEP 2: Tinjau & Konfirmasi Pratinjau Mutasi */
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

              {/* Summary Bar & Collapsible Warnings */}
              <ImportSummaryBar
                summary={previewData.summary}
                warnings={previewData.warnings}
                parserName={previewData.parser}
                fileName={previewData.file_name}
              />

              {/* Review Container */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-base font-bold text-slate-800">
                      Langkah 2: Tinjau & Sesuaikan Kategori Transaksi
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Centang transaksi yang ingin diimpor, ubah kategori sesuai kebutuhan, atau centang ingat aturan.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetImport}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition self-start sm:self-center"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Pilih Berkas Lain</span>
                  </button>
                </div>

                {/* Desktop Table View (>= 768px) */}
                <div className="hidden md:block">
                  <ImportReviewTable
                    rows={reviewRows}
                    categories={categories}
                    accountNames={accountNames}
                    onRowChange={handleRowChange}
                    onSelectAllNew={handleSelectAllNew}
                    onSelectAll={handleSelectAll}
                    onDeselectAll={handleDeselectAll}
                  />
                </div>

                {/* Mobile Cards View (< 768px) */}
                <div className="md:hidden">
                  <ImportReviewCards
                    rows={reviewRows}
                    categories={categories}
                    accountNames={accountNames}
                    onRowChange={handleRowChange}
                    onSelectAllNew={handleSelectAllNew}
                    onSelectAll={handleSelectAll}
                    onDeselectAll={handleDeselectAll}
                  />
                </div>

                {/* Fixed / Bottom Commit Action Bar */}
                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">
                    <span className="font-bold text-slate-800">{selectedCount}</span> transaksi dipilih untuk disimpan ke database.
                  </div>

                  <div className="flex items-center gap-2.5 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={handleResetImport}
                      disabled={submittingCommit}
                      className="w-1/2 sm:w-auto px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleCommit}
                      disabled={submittingCommit || selectedCount === 0}
                      className="w-1/2 sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition disabled:opacity-50"
                    >
                      {submittingCommit ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Menyimpan...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Simpan & Selesaikan ({selectedCount})</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* TAB RIWAYAT */
        <div id="tabpanel-history" role="tabpanel" aria-labelledby="tab-history">
          <ImportHistoryList accounts={accounts} />
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
