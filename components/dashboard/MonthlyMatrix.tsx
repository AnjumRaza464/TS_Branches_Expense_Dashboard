"use client";

import { bucketLabel, type Matrix } from "@/lib/analytics";
import { formatPKR } from "@/lib/format";
import type { Grain } from "@/lib/types";
import { EmptyState } from "./Panel";

// Sequential single-hue ramp (light -> dark) for magnitude
const RAMP = ["#eef5fd", "#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95", "#0d366b"];

function cellStyle(value: number, max: number) {
  if (value <= 0 || max <= 0) return { background: "transparent", color: "#cbd5e1" };
  // sqrt keeps small branches visible next to the factory
  const step = Math.min(RAMP.length - 1, Math.floor(Math.sqrt(value / max) * RAMP.length));
  return { background: RAMP[step], color: step >= 4 ? "#ffffff" : "#0f172a" };
}

function compact(v: number) {
  if (v <= 0) return "–";
  if (v >= 1e6) return `${(v / 1e6).toFixed(v >= 1e7 ? 1 : 2)}M`;
  if (v >= 1e3) return `${Math.round(v / 1e3)}K`;
  return String(Math.round(v));
}

interface MonthlyMatrixProps {
  matrix: Matrix;
  grain: Grain;
  rowHeader: string;
  selectedRow?: string;
  onSelectRow?: (key: string) => void;
  onSelectColumn?: (bucket: string) => void;
  onSelectCell?: (rowKey: string, bucket: string) => void;
  emptyMessage?: string;
}

/** Rows × time buckets heatmap with row and column totals. */
export function MonthlyMatrix({
  matrix,
  grain,
  rowHeader,
  selectedRow,
  onSelectRow,
  onSelectColumn,
  onSelectCell,
  emptyMessage = "No spend for this selection.",
}: MonthlyMatrixProps) {
  if (!matrix.rows.length) return <EmptyState message={emptyMessage} />;
  const max = Math.max(...matrix.rows.flatMap((r) => r.values));

  return (
    <div>
      <div className="-mx-5 max-h-[640px] overflow-auto">
        <table className="w-max min-w-full border-separate border-spacing-0 text-xs">
          <thead className="sticky top-0 z-20">
            <tr className="bg-slate-50 text-slate-500">
              <th className="sticky left-0 z-10 min-w-48 border-b border-slate-200 bg-slate-50 py-2.5 pl-5 pr-3 text-left font-medium uppercase tracking-wide">
                {rowHeader}
              </th>
              {matrix.columns.map((c) => (
                <th key={c} className="border-b border-slate-200 px-1 py-2.5 text-center font-medium">
                  {onSelectColumn ? (
                    <button onClick={() => onSelectColumn(c)} className="rounded px-1.5 py-0.5 hover:bg-indigo-100 hover:text-indigo-700" title={`Focus on ${bucketLabel(c, grain)}`}>
                      {bucketLabel(c, grain, true)}
                    </button>
                  ) : (
                    bucketLabel(c, grain, true)
                  )}
                </th>
              ))}
              <th className="sticky right-0 border-b border-l border-slate-200 bg-slate-100 px-3 py-2.5 text-right font-semibold text-slate-700">Total</th>
            </tr>
          </thead>
          <tbody>
            {matrix.rows.map((r) => (
              <tr key={r.key} className={selectedRow === r.key ? "outline outline-2 -outline-offset-2 outline-indigo-500" : ""}>
                <th scope="row" className="sticky left-0 z-10 border-b border-slate-100 bg-white py-1.5 pl-5 pr-3 text-left font-normal">
                  {onSelectRow ? (
                    <button onClick={() => onSelectRow(r.key)} className="text-left hover:text-indigo-700">
                      <span className="block text-sm font-medium text-slate-900">{r.label}</span>
                      {r.sublabel && <span className="block text-[11px] text-slate-500">{r.sublabel}</span>}
                    </button>
                  ) : (
                    <span className="block text-sm font-medium text-slate-900">{r.label}</span>
                  )}
                </th>
                {r.values.map((v, i) => {
                  const style = cellStyle(v, max);
                  const title = `${r.label} · ${bucketLabel(matrix.columns[i], grain)}: ${formatPKR(v, { compact: false })}`;
                  return (
                    <td key={matrix.columns[i]} className="border-b border-r border-white p-0">
                      {onSelectCell && v > 0 ? (
                        <button
                          onClick={() => onSelectCell(r.key, matrix.columns[i])}
                          title={title}
                          style={style}
                          className="block h-9 w-full min-w-14 px-1.5 text-center tabular-nums transition hover:ring-2 hover:ring-inset hover:ring-indigo-500"
                        >
                          {compact(v)}
                        </button>
                      ) : (
                        <div title={title} style={style} className="flex h-9 min-w-14 items-center justify-center px-1.5 tabular-nums">
                          {compact(v)}
                        </div>
                      )}
                    </td>
                  );
                })}
                <td className="sticky right-0 border-b border-l border-slate-200 bg-slate-50 px-3 text-right font-semibold tabular-nums text-slate-900">
                  {compact(r.total)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="sticky bottom-0 z-20">
            <tr className="bg-slate-100 font-semibold text-slate-900">
              <th className="sticky left-0 z-10 border-t border-slate-300 bg-slate-100 py-2.5 pl-5 pr-3 text-left text-sm">Total</th>
              {matrix.columnTotals.map((v, i) => (
                <td key={matrix.columns[i]} className="border-t border-slate-300 px-1.5 text-center tabular-nums" title={formatPKR(v, { compact: false })}>
                  {compact(v)}
                </td>
              ))}
              <td className="sticky right-0 border-l border-t border-slate-300 bg-slate-200 px-3 text-right tabular-nums">{compact(matrix.total)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
        <span>Low</span>
        <span className="flex overflow-hidden rounded">
          {RAMP.map((c) => (
            <span key={c} className="h-2.5 w-6" style={{ background: c }} />
          ))}
        </span>
        <span>High</span>
        <span className="ml-auto">PKR · K = thousand, M = million · hover a cell for the exact amount</span>
      </div>
    </div>
  );
}
