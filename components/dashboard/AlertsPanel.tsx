"use client";

import { useState } from "react";
import { ArrowRight, BellRing, CircleCheck, Info, OctagonAlert, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Alert, AlertKind, AlertSeverity } from "@/lib/alerts";
import { EmptyState } from "./Panel";

// Status colours are reserved for state and always ship with an icon + label
const SEVERITY: Record<AlertSeverity, { label: string; icon: LucideIcon; badge: string; bar: string }> = {
  critical: { label: "Critical", icon: OctagonAlert, badge: "bg-rose-50 text-rose-700 ring-rose-600/20", bar: "bg-rose-500" },
  warning: { label: "Warning", icon: TriangleAlert, badge: "bg-amber-50 text-amber-800 ring-amber-600/20", bar: "bg-amber-400" },
  info: { label: "Review", icon: Info, badge: "bg-sky-50 text-sky-700 ring-sky-600/20", bar: "bg-sky-400" },
};

const KIND_LABEL: Record<AlertKind, string> = {
  "missing-spend": "Missing months",
  spike: "Unusual spend",
  classification: "Classification",
};

interface AlertListProps {
  alerts: Alert[];
  onInvestigate: (alert: Alert) => void;
  limit?: number;
}

export function AlertList({ alerts, onInvestigate, limit }: AlertListProps) {
  if (!alerts.length) {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        <CircleCheck className="h-5 w-5 shrink-0" /> No exceptions found for this selection.
      </div>
    );
  }
  const visible = limit ? alerts.slice(0, limit) : alerts;
  return (
    <ul className="divide-y divide-slate-100">
      {visible.map((a) => {
        const sev = SEVERITY[a.severity];
        const Icon = sev.icon;
        return (
          <li key={a.id} className="relative flex flex-wrap items-start gap-3 py-3 pl-4 pr-1 sm:flex-nowrap">
            <span className={`absolute inset-y-3 left-0 w-1 rounded-full ${sev.bar}`} aria-hidden />
            <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${sev.badge}`}>
              <Icon className="h-3.5 w-3.5" /> {sev.label}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900">
                {a.subject} <span className="font-normal text-slate-500">· {a.title}</span>
              </p>
              <p className="mt-0.5 text-xs text-slate-600">{a.detail}</p>
            </div>
            <button
              type="button"
              onClick={() => onInvestigate(a)}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 print:hidden"
            >
              Investigate <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Full alerts view with a filter by alert type. */
export function AlertsPanel({ alerts, onInvestigate }: { alerts: Alert[]; onInvestigate: (a: Alert) => void }) {
  const [kind, setKind] = useState<AlertKind | "all">("all");
  const counts = (Object.keys(KIND_LABEL) as AlertKind[]).map((k) => ({ k, n: alerts.filter((a) => a.kind === k).length }));
  const shown = kind === "all" ? alerts : alerts.filter((a) => a.kind === kind);

  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5 print:hidden" role="radiogroup" aria-label="Alert type">
        {[{ k: "all" as const, n: alerts.length }, ...counts].map(({ k, n }) => (
          <button
            key={k}
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-medium ${kind === k ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
          >
            {k === "all" ? "All" : KIND_LABEL[k]} ({n})
          </button>
        ))}
      </div>
      {shown.length || !alerts.length ? (
        <AlertList alerts={shown} onInvestigate={onInvestigate} />
      ) : (
        <EmptyState message="No alerts of this type." />
      )}
    </div>
  );
}

/** Compact banner for the overview. */
export function AlertSummary({ alerts, onOpen }: { alerts: Alert[]; onOpen: () => void }) {
  const critical = alerts.filter((a) => a.severity === "critical").length;
  const warning = alerts.filter((a) => a.severity === "warning").length;
  const review = alerts.length - critical - warning;
  if (!alerts.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/60 px-5 py-3">
      <BellRing className="h-5 w-5 text-amber-600" />
      <p className="mr-auto text-sm text-slate-800">
        <b>{alerts.length} exception{alerts.length === 1 ? "" : "s"}</b> need attention
        <span className="text-slate-500">
          {" "}
          · {critical} critical · {warning} warning · {review} to review
        </span>
      </p>
      <button onClick={onOpen} className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 print:hidden">
        View alerts
      </button>
    </div>
  );
}
