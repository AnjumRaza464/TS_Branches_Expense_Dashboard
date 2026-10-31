"use client";

import { useMemo, useState, type ReactNode } from "react";
import { ArrowUpDown, ChevronRight, Search } from "lucide-react";
import type { BranchRow, Comparison } from "@/lib/analytics";
import { formatChange, formatNumber, formatPKR, formatShare } from "@/lib/format";
import { headColor } from "./palette";
import { EmptyState, RowAction } from "./Panel";

type SortKey = "name" | "spend" | "current" | "change" | "headcount" | "costPerStaffMonth";

interface BranchTableProps {
  rows: BranchRow[];
  heads: string[];
  comparison: Comparison;
  onSelect: (code: string) => void;
  limit?: number;
  searchable?: boolean;
}

export function BranchTable({ rows, heads, comparison, onSelect, limit, searchable = false }: BranchTableProps) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "spend", dir: -1 });
  const [query, setQuery] = useState("");

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const value = (r: BranchRow) =>
      sort.key === "name"
        ? r.branch.name
        : sort.key === "change" || sort.key === "costPerStaffMonth"
          ? (r[sort.key] ?? -Infinity)
          : r[sort.key];
    return rows
      .filter((r) => !q || r.branch.name.toLowerCase().includes(q) || r.branch.code.toLowerCase().includes(q))
      .sort((a, b) => {
        const va = value(a);
        const vb = value(b);
        return sort.dir * (typeof va === "string" ? va.localeCompare(vb as string) : (va as number) - (vb as number));
      });
  }, [rows, sort, query]);

  const visible = limit ? sorted.slice(0, limit) : sorted;
  const toggle = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "name" ? 1 : -1 }));

  return (
    <div>
      {searchable && (
        <div className="relative mb-3 max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search branch or code…"
            className="h-9 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
      )}
      {visible.length === 0 ? (
        <EmptyState message="No locations match this selection." />
      ) : (
        <div className="-mx-5 overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-y border-slate-100 bg-slate-50/70 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                <Th onClick={() => toggle("name")} sort={sort} k="name" className="pl-5">Location</Th>
                <th className="px-3 py-2.5">Status</th>
                <Th onClick={() => toggle("spend")} sort={sort} k="spend" align="right">Spend (period)</Th>
                <th className="px-3 py-2.5">Cost mix</th>
                <Th onClick={() => toggle("current")} sort={sort} k="current" align="right">{comparison.currentLabel}</Th>
                <Th onClick={() => toggle("change")} sort={sort} k="change" align="right">
                  YoY {comparison.previousLabel ? "" : "—"}
                </Th>
                <Th onClick={() => toggle("headcount")} sort={sort} k="headcount" align="right">Staff</Th>
                <Th onClick={() => toggle("costPerStaffMonth")} sort={sort} k="costPerStaffMonth" align="right" title="Spend ÷ employee-months, over months with HRIS headcount">
                  Cost / staff-mo
                </Th>
                <th className="w-10 pr-5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visible.map((r) => (
                <tr key={r.branch.code} onClick={() => onSelect(r.branch.code)} className="group cursor-pointer hover:bg-indigo-50/40">
                  <td className="py-3 pl-5 pr-3">
                    <RowAction label={`Drill into ${r.branch.name}`}>
                      <span className="block font-medium text-slate-900">{r.branch.name}</span>
                      <span className="block text-xs text-slate-500">
                        {r.branch.code} · {r.branch.type}
                      </span>
                    </RowAction>
                  </td>
                  <td className="px-3 py-3">
                    <StatusBadge status={r.branch.status} />
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="whitespace-nowrap font-medium tabular-nums text-slate-900">{formatPKR(r.spend)}</div>
                    <div className="text-xs tabular-nums text-slate-500">{formatShare(r.share)} of total</div>
                  </td>
                  <td className="px-3 py-3">
                    <MixBar values={r.byHead} heads={heads} />
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-slate-700">{formatPKR(r.current)}</td>
                  <td className="px-3 py-3 text-right">
                    <ChangeText value={r.change} />
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-slate-700">{r.headcount ? formatNumber(r.headcount) : "—"}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-right tabular-nums text-slate-700">
                    {r.costPerStaffMonth === null ? "—" : formatPKR(r.costPerStaffMonth)}
                  </td>
                  <td className="pr-5 text-slate-300 group-hover:text-indigo-600">
                    <ChevronRight className="h-4 w-4" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {limit && sorted.length > limit && (
        <p className="mt-3 text-xs text-slate-500">
          Showing top {limit} of {sorted.length} locations — open <span className="font-medium">Branch Performance</span> for the full list.
        </p>
      )}
    </div>
  );
}

function Th({
  children, onClick, sort, k, align = "left", className = "", title,
}: {
  children: ReactNode;
  onClick: () => void;
  sort: { key: SortKey; dir: 1 | -1 };
  k: SortKey;
  align?: "left" | "right";
  className?: string;
  title?: string;
}) {
  const active = sort.key === k;
  return (
    <th
      className={`px-3 py-2.5 ${align === "right" ? "text-right" : ""} ${className}`}
      aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"}
      title={title}
    >
      <button onClick={onClick} className={`inline-flex items-center gap-1 uppercase hover:text-slate-900 ${active ? "text-indigo-700" : ""}`}>
        {children}
        <ArrowUpDown className="h-3 w-3" />
      </button>
    </th>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const style =
    status === "Active"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-600/20"
      : status === "Inactive"
        ? "bg-slate-100 text-slate-600 ring-slate-500/20"
        : "bg-amber-50 text-amber-700 ring-amber-600/20";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${style}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === "Active" ? "bg-emerald-500" : status === "Inactive" ? "bg-slate-400" : "bg-amber-500"}`} />
      {status}
    </span>
  );
}

export function ChangeText({ value }: { value: number | null }) {
  if (value === null) return <span className="text-slate-400">—</span>;
  // Spend going up is unfavourable
  const tone = value > 0 ? "text-rose-600" : value < 0 ? "text-emerald-600" : "text-slate-500";
  return <span className={`whitespace-nowrap font-medium tabular-nums ${tone}`}>{value > 0 ? "▲" : value < 0 ? "▼" : ""} {formatChange(value)}</span>;
}

function MixBar({ values, heads }: { values: number[]; heads: string[] }) {
  const total = values.reduce((a, v) => a + v, 0);
  if (!total) return <span className="text-xs text-slate-400">—</span>;
  return (
    <div className="flex h-2 w-32 gap-px overflow-hidden rounded-full bg-slate-100">
      {values.map((v, i) =>
        v > 0 ? (
          <div key={heads[i]} title={`${heads[i]}: ${formatPKR(v)} (${formatShare(v / total)})`} style={{ width: `${(v / total) * 100}%`, background: headColor(heads[i]) }} />
        ) : null,
      )}
    </div>
  );
}
