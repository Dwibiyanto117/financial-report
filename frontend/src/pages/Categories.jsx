import React, { useState, useEffect } from "react";
import { Plus, Tag, Edit2, Trash2, X, Loader2, AlertCircle, Check } from "lucide-react";
import api from "../services/api";

const PRESET_COLORS = [
  "#10B981", "#059669", "#047857", "#0D9488", "#06B6D4",
  "#3B82F6", "#6366F1", "#8B5CF6", "#EC4899", "#F43F5E",
  "#EF4444", "#F97316", "#F59E0B", "#84CC16", "#64748B"
];

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("ALL"); // ALL, INCOME, EXPENSE

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCat, setEditingCat] = useState(null);
  const [modalForm, setModalForm] = useState({
    name: "",
    type: "EXPENSE",
    color: "#EF4444",
    icon: "tag"
  });
  const [modalError, setModalError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await api.get("/categories");
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.error("Gagal memuat kategori:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openAddModal = () => {
    setEditingCat(null);
    setModalForm({
      name: "",
      type: activeTab === "INCOME" ? "INCOME" : "EXPENSE",
      color: activeTab === "INCOME" ? "#10B981" : "#EF4444",
      icon: "tag"
    });
    setModalError("");
    setIsModalOpen(true);
  };

  const openEditModal = (cat) => {
    setEditingCat(cat);
    setModalForm({
      name: cat.name,
      type: cat.type,
      color: cat.color,
      icon: cat.icon
    });
    setModalError("");
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (e) => {
    e.preventDefault();
    setModalError("");
    setSubmitting(true);

    try {
      if (editingCat) {
        await api.put(`/categories/${editingCat.id}`, {
          name: modalForm.name,
          color: modalForm.color,
          icon: modalForm.icon
        });
      } else {
        await api.post("/categories", modalForm);
      }
      setIsModalOpen(false);
      fetchCategories();
    } catch (err) {
      setModalError(
        err.response?.data?.message || "Gagal menyimpan kategori"
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Hapus kategori kustom ini?")) {
      try {
        await api.delete(`/categories/${id}`);
        fetchCategories();
      } catch (err) {
        alert(err.response?.data?.message || "Gagal menghapus kategori");
      }
    }
  };

  const filteredCategories = categories.filter((c) => {
    if (activeTab === "ALL") return true;
    return c.type === activeTab;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Kategori Transaksi</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Kelola pos kategori bawaan sistem dan tambahkan kategori kustom Anda.
          </p>
        </div>

        <button
          onClick={openAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Kategori Kustom</span>
        </button>
      </div>

      {/* Tabs Filter */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab("ALL")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
            activeTab === "ALL"
              ? "bg-slate-900 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Semua ({categories.length})
        </button>
        <button
          onClick={() => setActiveTab("EXPENSE")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
            activeTab === "EXPENSE"
              ? "bg-rose-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Pengeluaran ({categories.filter((c) => c.type === "EXPENSE").length})
        </button>
        <button
          onClick={() => setActiveTab("INCOME")}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
            activeTab === "INCOME"
              ? "bg-emerald-600 text-white"
              : "text-slate-600 hover:bg-slate-100"
          }`}
        >
          Pemasukan ({categories.filter((c) => c.type === "INCOME").length})
        </button>
      </div>

      {/* Categories Grid */}
      {loading ? (
        <div className="py-20 flex justify-center items-center">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((cat) => (
            <div
              key={cat.id}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between hover:border-slate-300 transition"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-xs"
                  style={{ backgroundColor: cat.color || "#6B7280" }}
                >
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-800">{cat.name}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        cat.type === "INCOME"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {cat.type === "INCOME" ? "Pemasukan" : "Pengeluaran"}
                    </span>
                    {cat.isDefault ? (
                      <span className="text-[10px] text-slate-400 font-medium">Bawaan</span>
                    ) : (
                      <span className="text-[10px] text-indigo-600 font-semibold">Kustom</span>
                    )}
                  </div>
                </div>
              </div>

              {!cat.isDefault && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEditModal(cat)}
                    className="p-1.5 text-slate-400 hover:text-emerald-600 rounded-lg hover:bg-slate-50 transition"
                    title="Ubah"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(cat.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-50 transition"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal Add / Edit Category */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900 text-base">
                {editingCat ? "Ubah Kategori Kustom" : "Tambah Kategori Kustom"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleModalSubmit} className="p-6 space-y-4">
              {modalError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-xs flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* Tipe Kategori */}
              {!editingCat && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Tipe Kategori
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setModalForm({ ...modalForm, type: "EXPENSE", color: "#EF4444" })}
                      className={`py-2 text-xs font-bold rounded-lg border transition ${
                        modalForm.type === "EXPENSE"
                          ? "bg-rose-50 border-rose-300 text-rose-700 shadow-xs"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Pengeluaran
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalForm({ ...modalForm, type: "INCOME", color: "#10B981" })}
                      className={`py-2 text-xs font-bold rounded-lg border transition ${
                        modalForm.type === "INCOME"
                          ? "bg-emerald-50 border-emerald-300 text-emerald-700 shadow-xs"
                          : "border-slate-200 text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      Pemasukan
                    </button>
                  </div>
                </div>
              )}

              {/* Nama Kategori */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Nama Kategori
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Belanja Online, Hobi"
                  value={modalForm.name}
                  onChange={(e) => setModalForm({ ...modalForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Pilihan Warna */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Warna Kategori
                </label>
                <div className="flex flex-wrap gap-2">
                  {PRESET_COLORS.map((clr) => (
                    <button
                      key={clr}
                      type="button"
                      onClick={() => setModalForm({ ...modalForm, color: clr })}
                      className="w-7 h-7 rounded-full flex items-center justify-center transition hover:scale-110"
                      style={{ backgroundColor: clr }}
                    >
                      {modalForm.color === clr && <Check className="w-4 h-4 text-white stroke-[3]" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center gap-2"
                >
                  {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingCat ? "Simpan Perubahan" : "Tambah Kategori"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}