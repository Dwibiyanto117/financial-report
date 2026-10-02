import React from "react";
import { NavLink } from "react-router-dom";
import { LayoutDashboard, Landmark, ArrowUpDown, Tag, FileSpreadsheet } from "lucide-react";

export default function BottomNav() {
  const navItems = [
    { to: "/", label: "Dashboard", icon: LayoutDashboard },
    { to: "/accounts", label: "Rekening", icon: Landmark },
    { to: "/transactions", label: "Transaksi", icon: ArrowUpDown },
    { to: "/categories", label: "Kategori", icon: Tag },
    { to: "/reports", label: "Laporan", icon: FileSpreadsheet },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-4 py-2 flex justify-around items-center z-40 shadow-lg">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex flex-col items-center py-1 px-3 rounded-lg transition ${
                isActive ? "text-emerald-600 font-bold" : "text-slate-400 hover:text-slate-600"
              }`
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-[10px] mt-1">{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
}