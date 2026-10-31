"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { Building2, Check, Link, LogOut, Menu, ReceiptText, Users, Wallet } from "lucide-react";
import { logout } from "@/app/login/actions";
import { computeAlerts, type Alert } from "@/lib/alerts";
import { buildModel, bucketLabel, monthsOfBucket, summarize, type Model } from "@/lib/analytics";
import { formatNumber, formatPKR, monthLabel } from "@/lib/format";
import {
  ALL,
  DASHBOARD_VIEWS,
  DEFAULT_FILTERS,
  type DashboardData,
  type DashboardView,
  type Filters,
  type Grain,
} from "@/lib/types";
import { AlertsPanel, AlertSummary } from "./AlertsPanel";
import { BranchTable, StatusBadge } from "./BranchTable";
import { BreakdownTable } from "./BreakdownTable";
import { CostHeadMix } from "./CostHeadMix";
import { DrillBreadcrumb } from "./DrillBreadcrumb";
import { FilterBar } from "./FilterBar";
import { KpiCard, KpiCards } from "./KpiCards";
import { LedgerTable } from "./LedgerTable";
import { MonthlyMatrix } from "./MonthlyMatrix";
import { Panel } from "./Panel";
import { PeriodTable } from "./PeriodTable";
import { Sidebar } from "./Sidebar";
import { GrainToggle, SpendTrendChart } from "./SpendTrendChart";
import { DepartmentsPanel, WorkforceNote, WorkforceTrend } from "./WorkforcePanel";

const TITLES: Record<DashboardView, { title: string; subtitle: string }> = {
  overview: { title: "Executive Overview", subtitle: "Spend, cost mix and drill-down from company to individual ledger entries" },
  alerts: { title: "Alerts & Exceptions", subtitle: "Missing months, unusual spend and possible misbookings — click Investigate to drill in" },
  monthly: { title: "Monthly Analysis", subtitle: "Month-wise spend by location and cost head — click any cell to drill in" },
  branches: { title: "Branch Performance", subtitle: "Every branch, factory, office and B-Coffee outlet ranked by spend" },
  workforce: { title: "Workforce & Payroll", subtitle: "HRIS headcount and payroll by department" },
  ledger: { title: "Ledger Explorer", subtitle: "Individual vouchers behind every figure — searchable and exportable" },
};

// ---------------------------------------------------------------------------
// URL <-> state, so any view can be bookmarked or shared as a link
// ---------------------------------------------------------------------------

const URL_KEYS: Record<keyof Filters, string> = {
  monthFrom: "from",
  monthTo: "to",
  branchType: "type",
  branch: "branch",
  expenseHead: "head",
  subCategory: "sub",
  department: "dept",
};
const GRAINS: Grain[] = ["month", "quarter", "fiscal-year"];

function readUrl(params: URLSearchParams, model: Model) {
  const d = model.data.dimensions;
  const valid: Record<keyof Filters, (v: string) => boolean> = {
    monthFrom: (v) => model.monthIdx.has(v),
    monthTo: (v) => model.monthIdx.has(v),
    branchType: (v) => d.branches.some((b) => b.type === v),
    branch: (v) => model.branchByCode.has(v),
    expenseHead: (v) => model.headByName.has(v),
    subCategory: (v) => model.subByName.has(v),
    department: (v) => d.departments.some((dep) => dep.code === v),
  };
  const filters = { ...DEFAULT_FILTERS };
  for (const key of Object.keys(URL_KEYS) as (keyof Filters)[]) {
    const v = params.get(URL_KEYS[key]);
    if (v && valid[key](v)) (filters as Record<keyof Filters, string>)[key] = v;
  }
  const view = params.get("view");
  const grain = params.get("grain");
  return {
    filters,
    view: (DASHBOARD_VIEWS as readonly string[]).includes(view ?? "") ? (view as DashboardView) : "overview",
    grain: GRAINS.includes(grain as Grain) ? (grain as Grain) : null,
  };
}

function writeUrl(filters: Filters, view: DashboardView, grain: Grain | null) {
  const p = new URLSearchParams();
  if (view !== "overview") p.set("view", view);
  for (const key of Object.keys(URL_KEYS) as (keyof Filters)[]) {
    if (filters[key] !== ALL) p.set(URL_KEYS[key], filters[key]);
  }
  if (grain) p.set("grain", grain);
  const qs = p.toString();
  window.history.replaceState(null, "", qs ? `?${qs}` : window.location.pathname);
}

// ---------------------------------------------------------------------------

export function DashboardShell({ data, user }: { data: DashboardData; user: string }) {
  const model = useMemo(() => buildModel(data), [data]);
  const searchParams = useSearchParams();
  const [initial] = useState(() => readUrl(new URLSearchParams(searchParams.toString()), model));

  const [filters, setFilters] = useState<Filters>(initial.filters);
  const [view, setView] = useState<DashboardView>(initial.view);
  const [grainChoice, setGrainChoice] = useState<Grain | null>(initial.grain); // null = automatic
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [deptMetric, setDeptMetric] = useState<"payroll" | "staff">("payroll");

  const summary = useMemo(() => summarize(model, filters, grainChoice ?? undefined), [model, filters, grainChoice]);
  const alerts = useMemo(() => computeAlerts(model, filters), [model, filters]);

  useEffect(() => writeUrl(filters, view, grainChoice), [filters, view, grainChoice]);

  const update = (patch: Partial<Filters>) => {
    // A new period gets a fresh automatic grain (e.g. drilling FY -> months)
    if ("monthFrom" in patch || "monthTo" in patch) setGrainChoice(null);
    setFilters((f) => ({ ...f, ...patch }));
  };
  const navigate = (v: DashboardView) => {
    setView(v);
    setMenuOpen(false);
    window.scrollTo({ top: 0 });
  };
  const copyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const { dimensions: d } = data;
  const heads = d.expenseHeads;
  const grain = summary.grain;
  const branch = d.branches.find((b) => b.code === filters.branch);
  const branchRow = summary.branches.find((r) => r.branch.code === filters.branch);
  const scopeLabel = [branch?.name ?? (filters.branchType === ALL ? "All locations" : filters.branchType), summary.kpis.periodLabel].join(" · ");
  const cmp = summary.kpis.comparison;

  // Drill actions
  const focusBucket = (bucket: string) => update(monthsOfBucket(d, bucket, grain));
  const investigate = ({ drill: { view: target, ...patch } }: Alert) => {
    update(patch);
    navigate(target);
  };
  const drillToBranch = (code: string) => {
    update({ branch: code, subCategory: ALL });
    navigate("overview");
  };
  const drillToLedger = (subCategory: string, expenseHead: string) => {
    update({ subCategory, expenseHead });
    navigate("ledger");
  };

  const department = d.departments.find((dep) => dep.code === filters.department);
  const showStaff = deptMetric === "staff";
  const grainName = grain === "fiscal-year" ? "fiscal year" : grain;
  const metricToggle = (
    <div role="radiogroup" aria-label="Payroll or staff" className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 print:hidden">
      {(["payroll", "staff"] as const).map((m) => (
        <button
          key={m}
          role="radio"
          aria-checked={deptMetric === m}
          onClick={() => setDeptMetric(m)}
          className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${deptMetric === m ? "bg-white text-indigo-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
        >
          {m === "payroll" ? "Payroll (PKR)" : "Staff"}
        </button>
      ))}
    </div>
  );
  const deptPanel = (
    <Panel
      title={`Department ${showStaff ? "staff" : "payroll"} × ${grainName}`}
      subtitle={`HRIS ${showStaff ? "employees paid" : "salary paid"} · ${branch ? branch.name : "all locations in scope"} · ${
        department ? "click the department to show all departments" : "click a department to filter"
      }`}
      bodyClassName="px-5 pb-4"
      actions={
        <>
          {metricToggle}
          {department && <GrainToggle value={grain} onChange={setGrainChoice} />}
        </>
      }
    >
      <MonthlyMatrix
        matrix={showStaff ? summary.deptStaffMatrix : summary.deptMatrix}
        unit={showStaff ? "count" : "pkr"}
        grain={grain}
        rowHeader="Department"
        selectedRow={filters.department}
        onSelectRow={(code) => update({ department: code === filters.department ? ALL : code })}
        onSelectColumn={focusBucket}
        emptyMessage="No HRIS payroll in this period (outside HRIS coverage)."
      />
    </Panel>
  );

  const trendPanel = (
    <Panel
      className="xl:col-span-2"
      title={`Spend by ${grain === "fiscal-year" ? "fiscal year" : grain}`}
      subtitle="Stacked by cost head · PKR millions · click a bar to focus on that period"
      actions={<GrainToggle value={grain} onChange={setGrainChoice} />}
    >
      <SpendTrendChart data={summary.trend} heads={heads} grain={grain} onSelectBucket={focusBucket} />
    </Panel>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar view={view} onNavigate={navigate} dimensions={d} open={menuOpen} onClose={() => setMenuOpen(false)} alertCount={alerts.length} />

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur print:static">
          <div className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
            <button onClick={() => setMenuOpen(true)} className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 print:hidden lg:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </button>
            <div className="min-w-0 flex-1">
              <h1 className="truncate text-lg font-semibold text-slate-900">{TITLES[view].title}</h1>
              <p className="hidden truncate text-xs text-slate-500 sm:block">{TITLES[view].subtitle}</p>
            </div>
            <span className="hidden max-w-xs truncate rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 md:inline print:inline">
              {scopeLabel}
            </span>
            <div className="flex items-center gap-1 print:hidden">
              <IconButton onClick={copyLink} label={copied ? "Link copied" : "Copy link to this view"}>
                {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Link className="h-4 w-4" />}
              </IconButton>
              <form action={logout} className="ml-1 flex items-center gap-2 border-l border-slate-200 pl-3">
                <span className="hidden text-xs font-medium text-slate-600 sm:inline" title="Signed in as">
                  {user}
                </span>
                <button type="submit" title="Sign out" aria-label="Sign out" className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </header>

        <main className="space-y-6 px-4 py-6 sm:px-6 lg:px-8">
          <FilterBar model={model} filters={filters} onChange={update} onReset={() => update(DEFAULT_FILTERS)} />
          <div className="print:hidden">
            <DrillBreadcrumb model={model} filters={filters} onChange={update} />
          </div>

          {view === "overview" && (
            <>
              <AlertSummary alerts={alerts} onOpen={() => navigate("alerts")} />
              <KpiCards kpis={summary.kpis} />

              <div className="grid gap-6 xl:grid-cols-3">
                {trendPanel}
                <Panel title="Cost head mix" subtitle={scopeLabel}>
                  <CostHeadMix heads={summary.heads} selected={filters.expenseHead} onSelect={(expenseHead) => update({ expenseHead, subCategory: ALL })} />
                </Panel>
              </div>

              {branch ? (
                <>
                  <div className="flex flex-wrap items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/50 px-5 py-4">
                    <Building2 className="h-5 w-5 text-indigo-600" />
                    <div className="mr-auto">
                      <p className="font-semibold text-slate-900">
                        {branch.name} <span className="font-normal text-slate-500">({branch.code})</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        {branch.type}
                        {branch.firstMonth && branch.lastMonth && ` · spend recorded ${monthLabel(branch.firstMonth)} – ${monthLabel(branch.lastMonth)}`}
                      </p>
                    </div>
                    {branchRow?.costPerStaffMonth != null && (
                      <span className="rounded-lg bg-white px-3 py-1.5 text-xs text-slate-600 ring-1 ring-slate-200" title="Spend ÷ employee-months, over months with HRIS headcount">
                        <b className="tabular-nums text-slate-900">{formatPKR(branchRow.costPerStaffMonth)}</b> per staff-month · {branchRow.headcount} staff
                      </span>
                    )}
                    <StatusBadge status={branch.status} />
                    <button onClick={() => navigate("monthly")} className="rounded-lg border border-indigo-200 bg-white px-3 py-1.5 text-xs font-medium text-indigo-700 hover:bg-indigo-50 print:hidden">
                      Month-wise view
                    </button>
                    <button onClick={() => navigate("ledger")} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-700 print:hidden">
                      View ledger entries
                    </button>
                  </div>
                  <div className="grid gap-6 xl:grid-cols-2">
                    <Panel title="Spend by sub-category" subtitle="Click a row to open its ledger entries" bodyClassName="px-5 pb-4">
                      <BreakdownTable rows={summary.subCategories} firstColumn="Sub-category" selected={filters.subCategory} onSelect={(r) => drillToLedger(r.name, r.expenseHead)} />
                    </Panel>
                    <Panel title="Spend by cost unit" subtitle="Department / cost unit as booked in the ledger" bodyClassName="px-5 pb-4">
                      <BreakdownTable rows={summary.costUnits} firstColumn="Cost unit" />
                    </Panel>
                  </div>
                  <DepartmentsPanel
                    rows={summary.departments}
                    selected={filters.department}
                    onSelect={(department) => update({ department })}
                    subtitle={`HRIS staff & payroll at ${branch.name} · ${summary.kpis.periodLabel}`}
                  />
                </>
              ) : (
                <>
                  <Panel
                    title="Branch performance"
                    subtitle={`Click a location to drill down · YoY = ${cmp.currentLabel} vs ${cmp.previousLabel ?? "—"}`}
                    bodyClassName="px-5 pb-4"
                  >
                    <BranchTable rows={summary.branches} heads={heads} comparison={cmp} onSelect={drillToBranch} limit={10} />
                  </Panel>
                  <div className="grid gap-6 xl:grid-cols-2">
                    <Panel title="Top sub-categories" subtitle="Click a row to open its ledger entries" bodyClassName="px-5 pb-4">
                      <BreakdownTable rows={summary.subCategories} firstColumn="Sub-category" selected={filters.subCategory} onSelect={(r) => drillToLedger(r.name, r.expenseHead)} limit={8} />
                    </Panel>
                    <Panel title="Top cost units" subtitle="Department / cost unit as booked in the ledger" bodyClassName="px-5 pb-4">
                      <BreakdownTable rows={summary.costUnits} firstColumn="Cost unit" limit={8} />
                    </Panel>
                  </div>
                </>
              )}
            </>
          )}

          {view === "alerts" && (
            <>
              <Panel title="Exceptions" subtitle={`${scopeLabel} · rules: no spend in an active month, a cost head ≥1.5× its own 12-month average (and ≥ PKR 250K above), sub-categories booked under the wrong head`}>
                <AlertsPanel alerts={alerts} onInvestigate={investigate} />
              </Panel>
            </>
          )}

          {view === "monthly" && department && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs text-sky-800">
                <p>
                  Showing <b>{department.name}</b> only: HRIS payroll and staff by month. Expense spend is booked by location and cost head, not by
                  department, so it is shown when <b>All departments</b> is selected.
                </p>
                <button
                  onClick={() => update({ department: ALL })}
                  className="shrink-0 rounded-lg border border-sky-300 bg-white px-3 py-1.5 font-medium text-sky-800 hover:bg-sky-100"
                >
                  Show all departments
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                  label="Payroll in range"
                  icon={Wallet}
                  value={formatPKR(summary.kpis.payroll)}
                  detail={summary.kpis.periodLabel}
                  delta={{
                    value: summary.kpis.payrollComparison.change,
                    upIsBad: true,
                    label: summary.kpis.payrollComparison.previousLabel ? `vs ${summary.kpis.payrollComparison.previousLabel}` : "no prior-year data",
                  }}
                />
                <KpiCard
                  label="Avg staff / month"
                  icon={Users}
                  value={summary.kpis.hrisMonths ? formatNumber(summary.kpis.employeeMonths / summary.kpis.hrisMonths, 1) : "—"}
                  detail={`${summary.kpis.hrisMonths} month${summary.kpis.hrisMonths === 1 ? "" : "s"} with HRIS data`}
                />
                <KpiCard
                  label="Staff (latest month)"
                  icon={Users}
                  value={summary.kpis.headcountMonth ? formatNumber(summary.kpis.headcount) : "—"}
                  detail={summary.kpis.headcountMonth ? monthLabel(summary.kpis.headcountMonth) : "No HRIS data"}
                  delta={summary.kpis.headcountChange != null ? { value: summary.kpis.headcountChange, label: "vs previous month" } : undefined}
                />
                <KpiCard
                  label="Avg pay / employee-month"
                  icon={ReceiptText}
                  value={summary.kpis.employeeMonths ? formatPKR(summary.kpis.payroll / summary.kpis.employeeMonths) : "—"}
                  detail="payroll ÷ employee-months"
                />
              </div>

              {deptPanel}

              <Panel
                title={`${department.name}: ${showStaff ? "staff" : "payroll"} by location × ${grainName}`}
                subtitle="Click a location to filter to it · click a column header to focus on that period"
                bodyClassName="px-5 pb-4"
                actions={metricToggle}
              >
                <MonthlyMatrix
                  matrix={showStaff ? summary.branchStaffMatrix : summary.branchPayrollMatrix}
                  unit={showStaff ? "count" : "pkr"}
                  grain={grain}
                  rowHeader="Location"
                  selectedRow={filters.branch}
                  onSelectRow={(code) => update({ branch: code === filters.branch ? ALL : code, subCategory: ALL })}
                  onSelectColumn={focusBucket}
                  emptyMessage="No HRIS payroll for this department in this period."
                />
              </Panel>
            </>
          )}

          {view === "monthly" && !department && (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                  label="Spend in range"
                  icon={Wallet}
                  value={formatPKR(summary.kpis.totalSpend)}
                  detail={summary.kpis.periodLabel}
                  delta={{ value: cmp.change, upIsBad: true, label: cmp.previousLabel ? `vs ${cmp.previousLabel}` : "no prior-year data" }}
                />
                <KpiCard label="Avg per month" icon={ReceiptText} value={formatPKR(summary.kpis.avgMonthly)} detail={`${summary.kpis.monthsCovered} month${summary.kpis.monthsCovered === 1 ? "" : "s"} with spend`} />
                <KpiCard
                  label="Latest month"
                  icon={Wallet}
                  value={summary.kpis.latestMonth ? formatPKR(summary.kpis.latestMonth.amount) : "—"}
                  detail={summary.kpis.latestMonth ? monthLabel(summary.kpis.latestMonth.month) : "No spend"}
                  delta={
                    summary.kpis.latestMonth?.previousMonth
                      ? { value: summary.kpis.latestMonth.change, upIsBad: true, label: `vs ${monthLabel(summary.kpis.latestMonth.previousMonth)}` }
                      : undefined
                  }
                />
                <KpiCard label="Peak period" icon={Building2} value={peak(summary.trend, grain).value} detail={peak(summary.trend, grain).label} />
              </div>

              <div className="grid gap-6">{trendPanel}</div>

              <Panel
                title={`Location × ${grain === "fiscal-year" ? "fiscal year" : grain}`}
                subtitle="Click a cell to focus on that location and period · click a location or column header to filter"
                bodyClassName="px-5 pb-4"
                actions={<GrainToggle value={grain} onChange={setGrainChoice} />}
              >
                <MonthlyMatrix
                  matrix={summary.branchMatrix}
                  grain={grain}
                  rowHeader="Location"
                  selectedRow={filters.branch}
                  onSelectRow={(code) => update({ branch: code === filters.branch ? ALL : code, subCategory: ALL })}
                  onSelectColumn={focusBucket}
                  onSelectCell={(code, bucket) => update({ branch: code, subCategory: ALL, ...monthsOfBucket(d, bucket, grain) })}
                />
              </Panel>

              <Panel
                title={`Cost head × ${grain === "fiscal-year" ? "fiscal year" : grain}`}
                subtitle={`${branch ? branch.name : "All locations in scope"} · click a head to filter`}
                bodyClassName="px-5 pb-4"
              >
                <MonthlyMatrix
                  matrix={summary.headMatrix}
                  grain={grain}
                  rowHeader="Cost head"
                  selectedRow={filters.expenseHead}
                  onSelectRow={(h) => update({ expenseHead: h === filters.expenseHead ? ALL : h, subCategory: ALL })}
                  onSelectColumn={focusBucket}
                />
              </Panel>

              {deptPanel}

              <Panel title="Period-over-period" subtitle="Latest period first · click a row to focus on it" bodyClassName="px-5 pb-4">
                <PeriodTable data={summary.trend} heads={heads} grain={grain} onSelect={summary.trend.length > 1 ? focusBucket : undefined} />
              </Panel>
            </>
          )}

          {view === "branches" && (
            <Panel
              title="All locations"
              subtitle={`${summary.branches.length} locations · ${summary.kpis.periodLabel} · YoY compares ${cmp.currentLabel} with ${cmp.previousLabel ?? "—"}`}
              bodyClassName="px-5 pb-4 pt-4"
            >
              <BranchTable rows={summary.branches} heads={heads} comparison={cmp} onSelect={drillToBranch} searchable />
            </Panel>
          )}

          {view === "workforce" && (
            <>
              <WorkforceNote coverage={model.hrisCoverage} />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                  label="Headcount"
                  icon={Users}
                  value={formatNumber(summary.kpis.headcount)}
                  detail={summary.kpis.headcountMonth ? `employees paid · ${monthLabel(summary.kpis.headcountMonth)}` : "No HRIS data in this period"}
                  delta={summary.kpis.headcountMonth ? { value: summary.kpis.headcountChange, label: "vs previous month" } : undefined}
                />
                <KpiCard label="Payroll (period)" icon={Wallet} value={formatPKR(summary.kpis.payroll)} detail={summary.kpis.periodLabel} />
                <KpiCard label="Avg pay / employee-month" icon={ReceiptText} value={formatPKR(avgPay(summary.workforceTrend))} detail="payroll ÷ employee-months" />
                <KpiCard label="Departments" icon={Building2} value={String(summary.departments.length)} detail="with payroll in scope" />
              </div>
              <Panel title="Headcount & payroll trend" subtitle={scopeLabel}>
                <WorkforceTrend data={summary.workforceTrend} coverage={model.hrisCoverage} />
              </Panel>
              <DepartmentsPanel
                rows={summary.departments}
                selected={filters.department}
                onSelect={(department) => update({ department })}
                subtitle="Click a department to filter"
              />
            </>
          )}

          {view === "ledger" && (
            <Panel
              title="Ledger entries"
              subtitle={`Filtered by: ${scopeLabel}${filters.expenseHead !== ALL ? ` · ${filters.expenseHead}` : ""}${filters.subCategory !== ALL ? ` › ${filters.subCategory}` : ""}`}
              bodyClassName="px-5 py-4"
            >
              <LedgerTable filters={filters} />
            </Panel>
          )}

          <footer className="pt-2 text-center text-[11px] text-slate-400">
            Source: {d.sourceFile} · synced {d.generatedAt.slice(0, 10)} · amounts in PKR
          </footer>
        </main>
      </div>
    </div>
  );
}

function avgPay(points: { employees: number; salary: number }[]) {
  const emp = points.reduce((a, p) => a + p.employees, 0);
  return emp ? points.reduce((a, p) => a + p.salary, 0) / emp : 0;
}

function peak(trend: { label: string; total: number }[], grain: Grain) {
  const top = trend.reduce<{ label: string; total: number } | null>((best, p) => (!best || p.total > best.total ? p : best), null);
  return top && top.total > 0
    ? { value: formatPKR(top.total), label: `highest: ${bucketLabel(top.label, grain)}` }
    : { value: "—", label: "No spend" };
}

function IconButton({ onClick, label, children }: { onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button onClick={onClick} title={label} aria-label={label} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900">
      {children}
    </button>
  );
}
