"use client";

import { ChevronRight } from "lucide-react";
import type { BreakdownRow } from "@/lib/analytics";
import { formatNumber, formatPKR, formatShare } from "@/lib/format";
import { headColor } from "./palette";
import { EmptyState, RowAction } from "./Panel";

interface BreakdownTableProps {
  rows: BreakdownRow[];
  firstColumn: string;
  selected?: string;
  onSelect?: (row: BreakdownRow) => void;
  limit?: number;
}

/** Ranked spend by sub-category or cost unit, with an inline share bar. */
export function BreakdownTable({ rows, firstColumn, selected, onSelect, limit = 12 }: BreakdownTableProps) {
  if (!rows.length) return <EmptyState message="No spend for this selection." />;
  const max = rows[0].amount || 1;
  const visible = rows.slice(0, limit);

  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-y border-slate-100 bg-slate-50/70 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <th className="py-2.5 pl-5 pr-3">{firstColumn}</th>
            <th className="px-3 py-2.5">Expense head</th>
            <th className="px-3 py-2.5 text-right">Entries</th>
            <th className="px-3 py-2.5 text-right">Amount</th>
            <th className="w-40 px-3 py-2.5">Share</th>
            {onSelect && <th className="w-10 pr-5" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {visible.map((r) => (
            <tr
              key={`${r.expenseHead}|${r.name}`}
              onClick={onSelect ? () => onSelect(r) : undefined}
              className={`${onSelect ? "group cursor-pointer hover:bg-indigo-50/40" : ""} ${selected === r.name ? "bg-indigo-50/60" : ""}`}
            >
              <td className="py-2.5 pl-5 pr-3 font-medium text-slate-900">
                {onSelect ? <RowAction label={`Open ${r.name} ledger entries`}>{r.name}</RowAction> : r.name}
              </td>
              <td className="px-3 py-2.5">
                <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-slate-600">
                  <span className="h-2 w-2 rounded-full" style={{ background: headColor(r.expenseHead) }} />
                  {r.expenseHead}
                </span>
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{formatNumber(r.entries)}</td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right font-medium tabular-nums text-slate-900">{formatPKR(r.amount)}</td>
              <td className="px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                    <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${(r.amount / max) * 100}%` }} />
                  </div>
                  <span className="w-12 text-right text-xs tabular-nums text-slate-500">{formatShare(r.share)}</span>
                </div>
              </td>
              {onSelect && (
                <td className="pr-5 text-slate-300 group-hover:text-indigo-600">
                  <ChevronRight className="h-4 w-4" />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length > limit && (
        <p className="px-5 pt-3 text-xs text-slate-500">
          Top {limit} of {rows.length} shown.
        </p>
      )}
    </div>
  );
}
