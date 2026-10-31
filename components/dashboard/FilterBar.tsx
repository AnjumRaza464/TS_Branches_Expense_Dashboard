"use client";

import { CalendarDays, CalendarRange, Funnel, Layers, MapPin, RotateCcw, Users, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { fiscalYearOfRange, fiscalYearRange, resolveRange, type Model } from "@/lib/analytics";
import { fiscalYearOf, monthLabel } from "@/lib/format";
import { ALL, type BranchType, type Filters } from "@/lib/types";

const BRANCH_TYPES: BranchType[] = ["Branch", "Factory / Office", "B-Coffee"];
const CUSTOM = "custom";

interface FilterBarProps {
  model: Model;
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
}

export function FilterBar({ model, filters, onChange, onReset }: FilterBarProps) {
  const { dimensions: d } = model.data;
  const { from, to } = resolveRange(model, filters);
  const last = d.months.length - 1;
  const span = to - from + 1;

  const fyValue = from === 0 && to === last ? ALL : (fiscalYearOfRange(d, from, to) ?? CUSTOM);

  // Months grouped by fiscal year for the From / To pickers
  const monthGroups = d.fiscalYears.map((fy) => ({
    fy,
    months: d.months.map((m, i) => ({ m, i })).filter(({ m }) => fiscalYearOf(m) === fy),
  }));

  const setRange = (a: number, b: number) =>
    onChange({
      monthFrom: a === 0 ? ALL : d.months[a],
      monthTo: b === last ? ALL : d.months[b],
    });

  const presets: { label: string; months: number }[] = [
    { label: "Last month", months: 1 },
    { label: "Last 3M", months: 3 },
    { label: "Last 6M", months: 6 },
    { label: "Last 12M", months: 12 },
  ];

  const branchOptions = d.branches
    .filter((b) => filters.branchType === ALL || b.type === filters.branchType)
    .map((b) => ({ value: b.code, label: `${b.name}${b.status === "Active" ? "" : ` (${b.status})`}` }));

  const departmentOptions = d.departments.map((dep) => ({ value: dep.code, label: `${dep.name} (${dep.code})` }));

  const isDirty = (Object.keys(filters) as (keyof Filters)[]).some((k) => filters[k] !== ALL);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm print:hidden">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <Funnel className="h-4 w-4 text-indigo-600" /> Global filters
          <span className="font-normal text-slate-400">· apply to every tab</span>
        </div>
        <button
          onClick={onReset}
          disabled={!isDirty}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset all
        </button>
      </div>

      {/* Period */}
      <div className="border-b border-slate-100 px-4 py-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:grid-cols-[1fr_1fr_1fr_auto]">
          <Select
            label="Fiscal year (Jul–Jun)"
            icon={CalendarRange}
            value={fyValue}
            allLabel="All time"
            options={[
              ...(fyValue === CUSTOM ? [{ value: CUSTOM, label: "Custom range" }] : []),
              ...[...d.fiscalYears].reverse().map((fy) => ({ value: fy, label: fy })),
            ]}
            onChange={(v) => {
              if (v === ALL) onChange({ monthFrom: ALL, monthTo: ALL });
              else if (v !== CUSTOM) onChange(fiscalYearRange(v));
            }}
          />
          <MonthSelect
            label="From month"
            value={from}
            groups={monthGroups}
            isDisabled={(i) => i > to}
            onChange={(i) => setRange(i, to)}
          />
          <MonthSelect
            label="To month"
            value={to}
            groups={monthGroups}
            isDisabled={(i) => i < from}
            onChange={(i) => setRange(from, i)}
          />
          <div className="sm:col-span-3 xl:col-span-1">
            <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">Quick range</span>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => {
                const active = to === last && span === p.months;
                return (
                  <Chip key={p.label} active={active} onClick={() => setRange(Math.max(0, last - p.months + 1), last)}>
                    {p.label}
                  </Chip>
                );
              })}
              <Chip active={from === 0 && to === last} onClick={() => setRange(0, last)}>
                All time
              </Chip>
            </div>
          </div>
        </div>
        <p className="mt-2 text-xs text-slate-500">
          Showing <b className="text-slate-700">{monthLabel(d.months[from])}</b> to{" "}
          <b className="text-slate-700">{monthLabel(d.months[to])}</b> · {span} month{span === 1 ? "" : "s"}
        </p>
      </div>

      {/* Dimensions */}
      <div className="grid grid-cols-1 gap-3 px-4 py-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          label="Location type"
          icon={Layers}
          value={filters.branchType}
          allLabel="All types"
          options={BRANCH_TYPES.map((t) => ({ value: t, label: t }))}
          onChange={(branchType) => onChange({ branchType: branchType as Filters["branchType"], branch: ALL })}
        />
        <Select
          label="Branch / cost centre"
          icon={MapPin}
          value={filters.branch}
          allLabel="All locations"
          options={branchOptions}
          onChange={(branch) => onChange({ branch, subCategory: ALL })}
        />
        <Select
          label="Expense head"
          icon={Wallet}
          value={filters.expenseHead}
          allLabel="All heads"
          options={d.expenseHeads.map((h) => ({ value: h, label: h }))}
          onChange={(expenseHead) => onChange({ expenseHead, subCategory: ALL })}
        />
        <Select
          label="Department (HRIS)"
          icon={Users}
          value={filters.department}
          allLabel="All departments"
          options={departmentOptions}
          onChange={(department) => onChange({ department })}
        />
      </div>
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`h-9 rounded-lg border px-3 text-xs font-medium transition ${active ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50"}`}
    >
      {children}
    </button>
  );
}

const selectClass = (active: boolean) =>
  `h-9 w-full appearance-none truncate rounded-lg border bg-white pl-8 pr-8 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 ${active ? "border-indigo-300 bg-indigo-50/50 font-medium text-indigo-900" : "border-slate-200 text-slate-700"}`;

function Chevron() {
  return (
    <svg className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
    </svg>
  );
}

interface MonthSelectProps {
  label: string;
  value: number;
  groups: { fy: string; months: { m: string; i: number }[] }[];
  isDisabled: (i: number) => boolean;
  onChange: (i: number) => void;
}

function MonthSelect({ label, value, groups, isDisabled, onChange }: MonthSelectProps) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <span className="relative block">
        <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-600" />
        <select value={value} onChange={(e) => onChange(Number(e.target.value))} className={selectClass(false)}>
          {groups.map((g) => (
            <optgroup key={g.fy} label={g.fy}>
              {g.months.map(({ m, i }) => (
                <option key={m} value={i} disabled={isDisabled(i)}>
                  {monthLabel(m)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <Chevron />
      </span>
    </label>
  );
}

interface SelectProps {
  label: string;
  icon: LucideIcon;
  value: string;
  allLabel: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}

function Select({ label, icon: Icon, value, allLabel, options, onChange }: SelectProps) {
  const active = value !== ALL;
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</span>
      <span className="relative block">
        <Icon className={`pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 ${active ? "text-indigo-600" : "text-slate-400"}`} />
        <select value={value} onChange={(e) => onChange(e.target.value)} className={selectClass(active)}>
          <option value={ALL}>{allLabel}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Chevron />
      </span>
    </label>
  );
}
