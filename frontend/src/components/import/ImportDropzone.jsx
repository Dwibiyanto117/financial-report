import React, { useState, useRef } from "react";
import { UploadCloud, FileSpreadsheet, X, AlertCircle } from "lucide-react";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

export default function ImportDropzone({ file, onFileSelect, onFileRemove }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [clientError, setClientError] = useState("");
  const inputRef = useRef(null);

  const validateAndSelect = (selectedFile) => {
    setClientError("");
    if (!selectedFile) return;

    const ext = selectedFile.name.toLowerCase().split(".").pop();
    if (!["csv", "xlsx"].includes(ext)) {
      setClientError("Format berkas tidak didukung. Harap pilih berkas .csv atau .xlsx.");
      return;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      setClientError("Ukuran berkas melebihi batas maksimum 5 MB.");
      return;
    }

    onFileSelect(selectedFile);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSelect(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelect(e.target.files[0]);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
        Pilih Berkas Mutasi
      </label>

      {clientError && (
        <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{clientError}</span>
        </div>
      )}

      {!file ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-2xl cursor-pointer transition ${
            isDragOver
              ? "border-emerald-500 bg-emerald-50/60"
              : "border-slate-200 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-300"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv"
            onChange={handleInputChange}
            className="hidden"
          />
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl mb-3">
            <UploadCloud className="w-8 h-8" />
          </div>
          <p className="text-sm font-semibold text-slate-800 text-center">
            Seret berkas mutasi ke sini atau <span className="text-emerald-600 underline">pilih dari perangkat</span>
          </p>
          <p className="text-xs text-slate-500 mt-1 text-center">
            Mendukung format .CSV dan .XLSX (maksimal 5 MB)
          </p>
        </div>
      ) : (
        <div className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl shrink-0">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-slate-800 truncate">{file.name}</p>
              <p className="text-xs text-slate-500">{formatFileSize(file.size)}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (inputRef.current) inputRef.current.value = "";
              onFileRemove();
            }}
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition"
            title="Hapus berkas"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
