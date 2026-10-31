"use client";

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import { Info } from "lucide-react";
import type { DepartmentRow, WorkforcePoint } from "@/lib/analytics";
import { formatMillions, formatNumber, formatPKR, formatShare, monthLabel } from "@/lib/format";
import { ALL } from "@/lib/types";
import { AXIS, GRID, SERIES_PRIMARY } from "./palette";
import { EmptyState, Panel, RowAction } from "./Panel";

export function WorkforceNote({ coverage }: { coverage: { first: string; last: string } | null }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-800">
      <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <span>
        Workforce figures come from HRIS payroll ({coverage ? `${monthLabel(coverage.first)} – ${monthLabel(coverage.last)}` : "no data"}, headcount per branch × department; employee names are not
        stored in the source). The period filter applies; months outside HRIS coverage show no workforce data. The <b>Department</b> filter applies to these figures only — the expense
        ledger is booked by cost head, not HRIS department.
      </span>
    </div>
  );
}

/** Two single-measure charts side by side — never a dual axis. */
export function WorkforceTrend({ data, coverage }: { data: WorkforcePoint[]; coverage: { first: string; last: string } | null }) {
  if (!data.length) {
    const range = coverage ? ` HRIS payroll covers ${monthLabel(coverage.first)} – ${monthLabel(coverage.last)}.` : "";
    return <EmptyState message={`No HRIS payroll data for this selection.${range}`} />;
  }
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <MiniLine title="Employees paid per month" data={data} dataKey="employees" format={(v) => formatNumber(v)} axisFormat={(v) => formatNumber(v)} />
      <MiniLine title="Payroll per month (PKR)" data={data} dataKey="salary" format={(v) => formatPKR(v)} axisFormat={formatMillions} />
    </div>
  );
}

function MiniLine({
  title, data, dataKey, format, axisFormat,
}: {
  title: string;
  data: WorkforcePoint[];
  dataKey: "employees" | "salary";
  format: (v: number) => string;
  axisFormat: (v: number) => string;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-slate-500">{title}</p>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={GRID} />
            <XAxis dataKey="label" tickFormatter={(v: string) => monthLabel(v, true)} tick={{ fontSize: 11, fill: AXIS }} axisLine={{ stroke: GRID }} tickLine={false} minTickGap={24} />
            <YAxis tickFormatter={axisFormat} tick={{ fontSize: 11, fill: AXIS }} axisLine={false} tickLine={false} width={44} />
            <Tooltip
              cursor={{ stroke: AXIS, strokeDasharray: "3 3" }}
              content={(props: TooltipContentProps) =>
                props.active && props.payload?.length ? (
                  <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-lg">
                    <p className="font-semibold text-slate-900">{monthLabel(String(props.label))}</p>
                    <p className="tabular-nums text-slate-600">{format(Number(props.payload[0].value))}</p>
                  </div>
                ) : null
              }
            />
            <Line type="monotone" dataKey={dataKey} stroke={SERIES_PRIMARY} strokeWidth={2} dot={false} activeDot={{ r: 4, stroke: "#fff", strokeWidth: 2 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

interface DepartmentTableProps {
  rows: DepartmentRow[];
  selected: string;
  onSelect: (code: string) => void;
}

export function DepartmentTable({ rows, selected, onSelect }: DepartmentTableProps) {
  if (!rows.length) return <EmptyState message="No departments in scope." />;
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-y border-slate-100 bg-slate-50/70 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
            <th className="py-2.5 pl-5 pr-3">Department</th>
            <th className="px-3 py-2.5 text-right">Staff (latest)</th>
            <th className="px-3 py-2.5 text-right">Avg staff / month</th>
            <th className="px-3 py-2.5 text-right">Payroll (period)</th>
            <th className="px-3 py-2.5 text-right">Avg pay / employee-month</th>
            <th className="w-32 py-2.5 pl-3 pr-5">Share</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((r) => {
            const isSelected = selected === r.code;
            return (
              <tr
                key={r.code}
                onClick={() => onSelect(isSelected ? ALL : r.code)}
                className={`cursor-pointer hover:bg-indigo-50/40 ${isSelected ? "bg-indigo-50/60" : ""}`}
                title={isSelected ? "Clear department filter" : "Filter dashboard to this department"}
              >
                <td className="py-2.5 pl-5 pr-3">
                  <RowAction label={isSelected ? `Clear ${r.name} filter` : `Filter to ${r.name}`}>
                    <span className="block font-medium text-slate-900">{r.name}</span>
                    <span className="block text-xs text-slate-500">{r.code}</span>
                  </RowAction>
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-900">{formatNumber(r.employees)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{formatNumber(r.avgEmployees, 1)}</td>
                <td className="px-3 py-2.5 text-right font-medium tabular-nums text-slate-900">{formatPKR(r.salary)}</td>
                <td className="px-3 py-2.5 text-right tabular-nums text-slate-600">{formatPKR(r.avgSalary)}</td>
                <td className="py-2.5 pl-3 pr-5">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 rounded-full bg-slate-100">
                      <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${r.share * 100}%` }} />
                    </div>
                    <span className="w-11 text-right text-xs tabular-nums text-slate-500">{formatShare(r.share)}</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function DepartmentsPanel({ subtitle, ...table }: DepartmentTableProps & { subtitle: string }) {
  return (
    <Panel title="Departments" subtitle={subtitle} bodyClassName="px-5 pb-4">
      <DepartmentTable {...table} />
    </Panel>
  );
}
