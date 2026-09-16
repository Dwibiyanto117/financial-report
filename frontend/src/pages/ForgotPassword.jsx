import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Wallet, KeyRound, AlertCircle, CheckCircle2, Loader2, ArrowRight } from "lucide-react";
import api from "../services/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [recoveryInfo, setRecoveryInfo] = useState(null);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await api.post("/auth/forgot-password", { email });
      if (res.data.success) {
        setRecoveryInfo(res.data.data);
      }
    } catch (err) {
      setError(
        err.response?.data?.message || "Gagal membuat kode pemulihan akun"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 px-4">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-white mx-auto shadow-md">
          <KeyRound className="w-6 h-6" />
        </div>
        <h2 className="mt-4 text-2xl font-extrabold text-slate-900 tracking-tight">Pemulihan Akun</h2>
        <p className="mt-1 text-sm text-slate-500">Dapatkan kode verifikasi pemulihan untuk mengatur ulang password</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10">
          {error && (
            <div className="mb-4 bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {recoveryInfo ? (
            <div className="space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-emerald-800">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <span className="font-bold text-sm">Kode Pemulihan Berhasil Dibuat</span>
                </div>
                <p className="text-xs text-emerald-700 mb-3">
                  Salin kode pemulihan di bawah ini untuk mengatur ulang kata sandi Anda:
                </p>
                <div className="bg-white border border-emerald-300 rounded-lg p-3 text-center font-mono font-bold text-xl tracking-wider text-emerald-900 selection:bg-emerald-200">
                  {recoveryInfo.recoveryToken}
                </div>
              </div>

              <button
                onClick={() =>
                  navigate(
                    `/reset-password?email=${encodeURIComponent(
                      recoveryInfo.email
                    )}&token=${encodeURIComponent(recoveryInfo.recoveryToken)}`
                  )
                }
                className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition"
              >
                <span>Lanjut ke Reset Password</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email Terdaftar</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@email.com"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 transition disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : "Minta Kode Pemulihan"}
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-sm text-slate-500">
            Kembali ke{" "}
            <Link to="/login" className="font-semibold text-emerald-600 hover:text-emerald-700">
              Halaman Masuk
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}