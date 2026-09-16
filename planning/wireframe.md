# Wireframe / UI Plan — Personal Finance Web App (FinReport)

> **Status:** APPROVED — UI/UX Layout & Navigation Plan
> **Design Framework:** Tailwind CSS
> **Icon Library:** Lucide React (No decorative emojis)

---

## 1. Visual Identity & Design System

| Item | Detail | Catatan |
|------|--------|---------|
| Font Family | Inter / System Sans-serif | Terbaca jelas pada resolusi desktop maupun smartphone |
| Primary Color | Emerald (`#059669` / `emerald-600`) | Merepresentasikan pertumbuhan, stabilitas, dan arus kas positif |
| Danger / Expense | Rose / Red (`#E11D48` / `rose-600`) | Menandai pengeluaran dan peringatan defisit |
| Neutral / Surface | Slate (`#0F172A`, `#F8FAFC`, `#E2E8F0`) | Nuansa modern, kontras tinggi, dan nyaman di mata |

---

## 2. Navigation Structure

### Responsive Navigation Strategy
- **Desktop (>= 768px)**: Sidebar di sisi kiri statis/collapsible + Top header dengan info profil user & tombol logout.
- **Mobile (< 768px)**: Bottom Navigation Bar terfiksasi di bagian bawah layar (Dashboard, Transaksi, Tambah Cepat [+], Laporan, Profil) untuk ergonomi jempol.

```text
Aplikasi FinReport
├── Auth Pages
│   ├── Login (/login)
│   ├── Register (/register)
│   ├── Forgot Password (/forgot-password)
│   └── Reset Password (/reset-password)
├── Main Dashboard (/)
│   ├── Summary Metric Cards (Saldo, Pemasukan, Pengeluaran, Net)
│   ├── Monthly Trend Chart (Grafik Batang)
│   ├── Category Composition Chart (Grafik Donut)
│   └── Quick Transaction Feed
├── Transactions (/transactions)
│   ├── Filter Bar (Periode, Kategori, Tipe)
│   ├── Transaction List Table (Desktop) / Card Feed (Mobile)
│   └── Add/Edit Transaction Modal
├── Categories (/categories)
│   ├── List Kategori Default & Kustom
│   └── Form Tambah Kategori Kustom
└── Reports & Export (/reports)
    ├── Filter Range Selector
    ├── Preview Rekapitulasi Keuangan
    └── Tombol Download Excel (.xlsx) & PDF (.pdf)
```

---

## 3. Wireframe Sketches

### 3.1 Desktop Layout
```text
┌──────────────┬────────────────────────────────────────────────────────┐
│  FinReport   │  [Periode: Sept 2026 ▾]                  [Profil ▾]    │ ← Header
├──────────────┼────────────────────────────────────────────────────────┤
│ ❖ Dashboard  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│ ⇄ Transaksi  │  │  Saldo   │ │Pemasukan │ │Pengeluaran│ Selisih  │   │
│ ⊞ Kategori   │  │ Rp 25.7M │ │ Rp 15.0M │ │ Rp 4.5M  │ │+Rp 10.5M │   │
│ 🗎 Laporan    │  └──────────┘ └──────────┘ └──────────┘ └──────────┘   │
│              │  ┌───────────────────────┐ ┌───────────────────────┐   │
│              │  │  Tren Arus Kas (Bar)  │ │ Komposisi Biaya (Donut│   │
│              │  └───────────────────────┘ └───────────────────────┘   │
│              │  ┌─────────────────────────────────────────────────┐   │
│ [Logout]     │  │ Transaksi Terbaru                      [+ Tambah]│   │
│              │  └─────────────────────────────────────────────────┘   │
└──────────────┴────────────────────────────────────────────────────────┘
```

### 3.2 Mobile Layout (Viewport 375px)
```text
┌──────────────────────────────────────┐
│ FinReport              [Profil Icon] │ ← Mobile Top Bar
├──────────────────────────────────────┤
│ Saldo Berjalan                       │
│ Rp 25.750.000                        │
│ ┌──────────────────┬───────────────┐ │
│ │ Pemasukan: +15M  │ Pengeluaran:  │ │
│ │                  │ -4.5M         │ │
│ └──────────────────┴───────────────┘ │
│ [Filter: Bulan Ini ▾]                │
│                                      │
│ Komposisi Pengeluaran (Donut)        │
│ [=========== Grafik Donut =========] │
│                                      │
│ Transaksi Hari Ini:                  │
│ • Makan Siang          -Rp 45.000    │
│ • Bensin Motor         -Rp 30.000    │
│                                      │
├──────────────────────────────────────┤
│ [Home]  [Transaksi]  (+)  [Laporan]  │ ← Fixed Bottom Nav
└──────────────────────────────────────┘
```
