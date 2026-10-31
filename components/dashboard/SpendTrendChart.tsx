"use client";

import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import { bucketLabel, type TrendPoint } from "@/lib/analytics";
import { formatMillions, formatPKR } from "@/lib/format";
import type { Grain } from "@/lib/types";
import { AXIS, GRID, headColor } from "./palette";
import { EmptyState } from "./Panel";

interface SpendTrendChartProps {
  data: TrendPoint[];
  heads: string[];
  grain: Grain;
  /** Called with the bucket key of a clicked bar (drills the period into it). */
  onSelectBucket?: (key: string) => void;
}

export function SpendTrendChart({ data, heads, grain, onSelectBucket }: SpendTrendChartProps) {
  if (!data.some((p) => p.total > 0)) return <EmptyState message="No spend recorded for this selection." />;

  // Only heads with spend get a series (keeps the legend honest)
  const visible = heads.filter((h) => data.some((p) => Number(p[h]) > 0));
  // A single bucket can't be drilled further
  const drillable = Boolean(onSelectBucket) && data.length > 1;

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
          onClick={(state) => {
            const index = Number(state?.activeTooltipIndex ?? state?.activeIndex);
            const label = state?.activeLabel ?? data[index]?.label;
            if (drillable && typeof label === "string") onSelectBucket?.(label);
          }}
          style={{ cursor: drillable ? "pointer" : undefined }}
        >
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis
            dataKey="label"
            tickFormatter={(v: string) => bucketLabel(v, grain, true)}
            tick={{ fontSize: 12, fill: AXIS }}
            axisLine={{ stroke: GRID }}
            tickLine={false}
            minTickGap={8}
          />
          <YAxis tickFormatter={formatMillions} tick={{ fontSize: 12, fill: AXIS }} axisLine={false} tickLine={false} width={48} />
          <Tooltip
            cursor={{ fill: "rgba(79,70,229,0.06)" }}
            content={(props) => <TrendTooltip {...props} grain={grain} heads={visible} drillable={drillable} />}
          />
          <Legend itemSorter={null} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, color: AXIS, paddingTop: 8 }} />
          {visible.map((h, i) => (
            <Bar
              key={h}
              dataKey={h}
              stackId="spend"
              fill={headColor(h)}
              stroke="#ffffff"
              strokeWidth={1}
              radius={i === visible.length - 1 ? [4, 4, 0, 0] : 0}
              maxBarSize={56}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function TrendTooltip({
  active, payload, label, grain, heads, drillable,
}: TooltipContentProps & { grain: Grain; heads: string[]; drillable: boolean }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as TrendPoint;
  return (
    <div className="min-w-52 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <p className="mb-2 font-semibold text-slate-900">{bucketLabel(String(label), grain)}</p>
      <ul className="space-y-1">
        {[...heads].reverse().map((h) => (
          <li key={h} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-slate-600">
              <span className="h-2 w-2 rounded-full" style={{ background: headColor(h) }} />
              {h}
            </span>
            <span className="tabular-nums text-slate-900">{formatPKR(Number(point[h]))}</span>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex justify-between border-t border-slate-100 pt-2 font-semibold text-slate-900">
        <span>Total</span>
        <span className="tabular-nums">{formatPKR(point.total)}</span>
      </div>
      {drillable && <p className="mt-1.5 text-[11px] text-indigo-600">Click to focus on this period</p>}
    </div>
  );
}

const GRAINS: { value: Grain; label: string }[] = [
  { value: "month", label: "Month" },
  { value: "quarter", label: "Quarter" },
  { value: "fiscal-year", label: "FY" },
];

/** Segmented control for the time bucket. */
export function GrainToggle({ value, onChange }: { value: Grain; onChange: (g: Grain) => void }) {
  return (
    <div role="radiogroup" aria-label="Time grouping" className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 print:hidden">
      {GRAINS.map((g) => (
        <button
          key={g.value}
          role="radio"
          aria-checked={value === g.value}
          onClick={() => onChange(g.value)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${value === g.value ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
        >
          {g.label}
        </button>
      ))}
    </div>
  );
}
