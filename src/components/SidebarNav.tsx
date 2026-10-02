"use client";

import Link from "next/link";
import { useState } from "react";

export type SidebarItem = {
  label: string;
  href: string;
  emoji: string;
};

export default function SidebarNav({ items }: { items: SidebarItem[] }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
        aria-expanded={mobileOpen}
        onClick={() => setMobileOpen((open) => !open)}
        className="fixed left-4 top-3 z-50 flex size-10 items-center justify-center rounded-xl border border-neutral-200 bg-white text-xl text-neutral-700 shadow-sm lg:hidden"
      >
        {mobileOpen ? "×" : "☰"}
      </button>

      {mobileOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-neutral-900/30 lg:hidden"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-neutral-200 bg-white shadow-sm transition-all duration-200 lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsed ? "lg:w-20" : "lg:w-64"}`}
      >
        <div className="flex h-[73px] items-center justify-between border-b border-neutral-100 px-4">
          <Link href="/dashboard" className="flex min-w-0 items-center gap-3" onClick={() => setMobileOpen(false)}>
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 text-lg font-bold text-white">T</span>
            {!collapsed && <span className="truncate text-lg font-extrabold text-neutral-900">TiendaPlus</span>}
          </Link>
          <button
            type="button"
            aria-label={collapsed ? "Expandir menú" : "Contraer menú"}
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((value) => !value)}
            className="hidden size-8 shrink-0 items-center justify-center rounded-lg text-lg text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 lg:flex"
          >
            {collapsed ? "»" : "«"}
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3" aria-label="Navegación principal">
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-neutral-600 transition hover:bg-brand-50 hover:text-brand-700 ${
                collapsed ? "lg:justify-center" : ""
              }`}
            >
              <span className="w-6 shrink-0 text-center text-xl leading-none">{item.emoji}</span>
              <span className={collapsed ? "lg:hidden" : ""}>{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
