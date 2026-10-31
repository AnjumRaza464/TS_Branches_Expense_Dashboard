"use client";

import { BellRing, Building2, Database, Grid3x3, LayoutDashboard, ReceiptText, Users, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { formatNumber, formatPKR, monthLabel } from "@/lib/format";
import type { DashboardView, Dimensions } from "@/lib/types";

const NAV: { view: DashboardView; label: string; icon: LucideIcon; hint: string }[] = [
  { view: "overview", label: "Executive Overview", icon: LayoutDashboard, hint: "KPIs, trend & drill-down" },
  { view: "alerts", label: "Alerts & Exceptions", icon: BellRing, hint: "Gaps, spikes, misbookings" },
  { view: "monthly", label: "Monthly Analysis", icon: Grid3x3, hint: "Month-wise matrix & trend" },
  { view: "branches", label: "Branch Performance", icon: Building2, hint: "All locations ranked" },
  { view: "workforce", label: "Workforce & Payroll", icon: Users, hint: "HRIS departments" },
  { view: "ledger", label: "Ledger Explorer", icon: ReceiptText, hint: "Individual entries" },
];

interface SidebarProps {
  view: DashboardView;
  onNavigate: (view: DashboardView) => void;
  dimensions: Dimensions;
  open: boolean;
  onClose: () => void;
  alertCount: number;
}

export function Sidebar({ view, onNavigate, dimensions, open, onClose, alertCount }: SidebarProps) {
  const { months, totals, sourceFile, generatedAt, branches } = dimensions;

  return (
    <>
      {/* Tablet / mobile backdrop */}
      <div
        className={`fixed inset-0 z-30 bg-slate-900/40 transition-opacity print:hidden lg:hidden ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
        onClick={onClose}
        aria-hidden
      />
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-slate-900 text-slate-300 transition-transform print:hidden lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="flex items-center justify-between px-5 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500 text-sm font-bold text-white">
              BB
            </div>
            <div>
              <p className="text-sm font-semibold text-white">Black and Brown Bakers</p>
              <p className="text-xs text-slate-400">Expense Intelligence</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-md p-1 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden" aria-label="Close menu">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3">
          <p className="px-3 pb-2 pt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-500">Dashboards</p>
          {NAV.map(({ view: v, label, icon: Icon, hint }) => {
            const active = v === view;
            return (
              <button
                key={v}
                onClick={() => onNavigate(v)}
                className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${active ? "bg-indigo-600 text-white" : "hover:bg-slate-800 hover:text-white"}`}
              >
                <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? "text-white" : "text-slate-400 group-hover:text-white"}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{label}</span>
                  <span className={`block truncate text-xs ${active ? "text-indigo-200" : "text-slate-500"}`}>{hint}</span>
                </span>
                {v === "alerts" && alertCount > 0 && (
                  <span className="rounded-full bg-amber-400 px-2 py-0.5 text-xs font-semibold tabular-nums text-slate-900" aria-label={`${alertCount} alerts`}>
                    {alertCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="m-3 rounded-lg border border-slate-800 bg-slate-950/40 p-4 text-xs">
          <div className="mb-3 flex items-center gap-2 font-medium text-slate-200">
            <Database className="h-4 w-4 text-indigo-400" /> Data source
          </div>
          <dl className="space-y-1.5 text-slate-400">
            <Row label="Period" value={`${monthLabel(months[0], true)} – ${monthLabel(months.at(-1)!, true)}`} />
            <Row label="Ledger entries" value={formatNumber(totals.entries)} />
            <Row label="Locations" value={String(branches.length)} />
            <Row label="Total spend" value={formatPKR(totals.spend)} />
          </dl>
          <p className="mt-3 truncate text-[11px] text-slate-500" title={sourceFile}>
            {sourceFile}
          </p>
          <p className="text-[11px] text-slate-500">Synced {generatedAt.slice(0, 10)}</p>
        </div>
      </aside>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt>{label}</dt>
      <dd className="font-medium tabular-nums text-slate-200">{value}</dd>
    </div>
  );
}
