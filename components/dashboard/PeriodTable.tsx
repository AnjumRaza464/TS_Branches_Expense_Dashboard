"use client";

import { bucketLabel, type TrendPoint } from "@/lib/analytics";
import { formatPKR } from "@/lib/format";
import type { Grain } from "@/lib/types";
import { ChangeText } from "./BranchTable";
import { headColor } from "./palette";
import { EmptyState, RowAction } from "./Panel";

interface PeriodTableProps {
  data: TrendPoint[];
  heads: string[];
  grain: Grain;
  onSelect?: (bucket: string) => void;
}

/** One row per period: spend by cost head, total, and change vs the previous period. */
export function PeriodTable({ data, heads, grain, onSelect }: PeriodTableProps) {
  if (!data.length) return <EmptyState message="No periods in range." />;
  const rows = [...data].reverse(); // latest first

  return (
    <div className="-mx-5 max-h-[520px] overflow-auto">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="sticky top-0 z-10 bg-slate-50">
          <tr className="text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <th className="border-b border-slate-200 py-2.5 pl-5 pr-3">Period</th>
            {heads.map((h) => (
              <th key={h} className="border-b border-slate-200 px-3 py-2.5 text-right">
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full" style={{ background: headColor(h) }} />
                  {h}
                </span>
              </th>
            ))}
            <th className="border-b border-slate-200 px-3 py-2.5 text-right">Total</th>
            <th className="border-b border-slate-200 py-2.5 pl-3 pr-5 text-right">vs prior period</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((p, i) => {
            const prior = rows[i + 1];
            const change = prior && prior.total > 0 ? (p.total - prior.total) / prior.total : null;
            return (
              <tr
                key={p.label}
                onClick={onSelect ? () => onSelect(p.label) : undefined}
                className={onSelect ? "cursor-pointer hover:bg-indigo-50/40" : ""}
              >
                <td className="whitespace-nowrap py-2.5 pl-5 pr-3 font-medium text-slate-900">
                  {onSelect ? <RowAction label={`Focus on ${bucketLabel(p.label, grain)}`}>{bucketLabel(p.label, grain)}</RowAction> : bucketLabel(p.label, grain)}
                </td>
                {heads.map((h) => (
                  <td key={h} className="whitespace-nowrap px-3 py-2.5 text-right tabular-nums text-slate-600">
                    {Number(p[h]) ? formatPKR(Number(p[h])) : "–"}
                  </td>
                ))}
                <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold tabular-nums text-slate-900">{formatPKR(p.total)}</td>
                <td className="py-2.5 pl-3 pr-5 text-right">
                  <ChangeText value={change} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
