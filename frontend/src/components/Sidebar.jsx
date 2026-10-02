import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Landmark, ArrowUpDown, Tag, FileSpreadsheet } from "lucide-react";

export default function Sidebar() {
  const navItems = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/accounts", label: "Rekening", icon: Landmark },
    { to: "/transactions", label: "Transaksi", icon: ArrowUpDown },
    { to: "/categories", label: "Kategori", icon: Tag },
    { to: "/reports", label: "Laporan & Ekspor", icon: FileSpreadsheet },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 space-y-1">
      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
        Menu Utama
      </div>
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition ${
                isActive
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`
            }
          >
            <Icon className="w-4 h-4" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </aside>
  );
}