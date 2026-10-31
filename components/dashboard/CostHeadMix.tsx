"use client";

import type { HeadSlice } from "@/lib/analytics";
import { formatPKR, formatShare } from "@/lib/format";
import { ALL } from "@/lib/types";
import { headColor } from "./palette";
import { EmptyState } from "./Panel";

interface CostHeadMixProps {
  heads: HeadSlice[];
  selected: string;
  onSelect: (head: string) => void;
}

/** Share of spend by cost head — a ranked bar list (clearer than a donut for 4 parts). */
export function CostHeadMix({ heads, selected, onSelect }: CostHeadMixProps) {
  const total = heads.reduce((a, h) => a + h.amount, 0);
  if (total === 0) return <EmptyState message="No spend in scope." />;
  const max = Math.max(...heads.map((h) => h.amount));
  const ranked = [...heads].sort((a, b) => b.amount - a.amount);

  return (
    <div className="space-y-4">
      {/* 100% composition strip */}
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full">
        {heads.filter((h) => h.amount > 0).map((h) => (
          <div key={h.name} title={`${h.name}: ${formatShare(h.share)}`} style={{ width: `${h.share * 100}%`, background: headColor(h.name) }} />
        ))}
      </div>

      <ul className="space-y-1">
        {ranked.map((h) => {
          const isSelected = selected === h.name;
          const dimmed = selected !== ALL && !isSelected;
          return (
            <li key={h.name}>
              <button
                onClick={() => onSelect(isSelected ? ALL : h.name)}
                className={`w-full rounded-lg px-3 py-2.5 text-left transition hover:bg-slate-50 ${isSelected ? "bg-indigo-50 ring-1 ring-indigo-200" : ""} ${dimmed ? "opacity-50" : ""}`}
                title={isSelected ? "Clear expense head filter" : `Filter to ${h.name}`}
              >
                <div className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 font-medium text-slate-800">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: headColor(h.name) }} />
                    {h.name}
                  </span>
                  <span className="tabular-nums text-slate-900">{formatPKR(h.amount)}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-3">
                  <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                    <div className="h-1.5 rounded-full" style={{ width: `${(h.amount / max) * 100}%`, background: headColor(h.name) }} />
                  </div>
                  <span className="w-12 text-right text-xs tabular-nums text-slate-500">{formatShare(h.share)}</span>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-xs text-slate-400">Click a head to filter the whole dashboard.</p>
    </div>
  );
}
