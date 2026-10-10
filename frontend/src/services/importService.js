import api from "./api";

/**
 * Layanan API Frontend untuk Modul Import Mutasi Rekening
 */

/**
 * POST /api/imports/preview
 * Mengunggah berkas mutasi dan mendapatkan hasil pratinjau transaksi.
 *
 * @param {FormData} formData
 * @returns {Promise<object>}
 */
export const previewImport = async (formData) => {
  const res = await api.post("/imports/preview", formData, {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  });
  return res.data;
};

/**
 * POST /api/imports/:id/commit
 * Menyimpan batch transaksi preview menjadi transaksi aktual secara permanen.
 *
 * @param {number|string} batchId
 * @param {Array<object>} rows
 * @returns {Promise<object>}
 */
export const commitImport = async (batchId, rows = []) => {
  const res = await api.post(`/imports/${batchId}/commit`, { rows });
  return res.data;
};

/**
 * GET /api/imports
 * Mengambil daftar riwayat batch import milik pengguna.
 *
 * @param {object} [params]
 * @returns {Promise<object>}
 */
export const getImports = async (params = {}) => {
  const res = await api.get("/imports", { params });
  return res.data;
};

/**
 * GET /api/imports/:id
 * Mengambil detail batch import beserta informasi rekening.
 *
 * @param {number|string} id
 * @returns {Promise<object>}
 */
export const getImportById = async (id) => {
  const res = await api.get(`/imports/${id}`);
  return res.data;
};

/**
 * DELETE /api/imports/:id
 * Membatalkan batch preview (status CANCELLED) atau rollback batch COMMITTED.
 *
 * @param {number|string} id
 * @returns {Promise<object>}
 */
export const rollbackImport = async (id) => {
  const res = await api.delete(`/imports/${id}`);
  return res.data;
};

/**
 * GET /api/imports/template/banks
 * Mengambil allowlist bank dan dompet digital yang didukung untuk template FinReport.
 *
 * @returns {Promise<object>}
 */
export const getTemplateBanks = async () => {
  const res = await api.get("/imports/template/banks");
  return res.data;
};

/**
 * GET /api/imports/parsers
 * Mengambil daftar adapter parser yang terdaftar dari backend.
 *
 * @returns {Promise<object>}
 */
export const getParsers = async () => {
  const res = await api.get("/imports/parsers");
  return res.data;
};

/**
 * GET /api/imports/template?bank=<KODE>&format=xlsx|csv
 * Mengunduh berkas template mutasi FinReport menggunakan token autentikasi.
 *
 * @param {string} bank
 * @param {string} format
 * @returns {Promise<void>}
 */
export const downloadTemplate = async (bank = "LAINNYA", format = "xlsx") => {
  const res = await api.get(`/imports/template?bank=${encodeURIComponent(bank)}&format=${encodeURIComponent(format)}`, {
    responseType: "blob"
  });

  const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement("a");
  link.href = blobUrl;
  const fileName = `finreport-template-${bank.toLowerCase()}.${format.toLowerCase()}`;
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(blobUrl);
};

/**
 * CRUD Category Rules
 */
export const getCategoryRules = async () => {
  const res = await api.get("/category-rules");
  return res.data;
};

export const createCategoryRule = async (data) => {
  const res = await api.post("/category-rules", data);
  return res.data;
};

export const updateCategoryRule = async (id, data) => {
  const res = await api.put(`/category-rules/${id}`, data);
  return res.data;
};

export const deleteCategoryRule = async (id) => {
  const res = await api.delete(`/category-rules/${id}`);
  return res.data;
};
