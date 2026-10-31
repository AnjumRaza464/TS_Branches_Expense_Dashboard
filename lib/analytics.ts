import { fiscalYearOf, monthLabel } from "@/lib/format";
import {
  ALL,
  type Branch,
  type DashboardData,
  type Dimensions,
  type Filters,
  type Grain,
} from "@/lib/types";

// ---------------------------------------------------------------------------
// Model: the raw data plus lookup tables, built once on the client.
// ---------------------------------------------------------------------------

export interface Model {
  data: DashboardData;
  monthFy: number[]; // month idx -> fiscal year idx
  monthIdx: Map<string, number>;
  branchByCode: Map<string, number>;
  headByName: Map<string, number>;
  subByName: Map<string, number>;
  hrisCoverage: { first: string; last: string } | null; // months with HRIS payroll
}

const indexOf = (values: string[]) => new Map(values.map((v, i) => [v, i]));

export function buildModel(data: DashboardData): Model {
  const { dimensions: d } = data;
  const fyIdx = indexOf(d.fiscalYears);
  const hrisMonths = data.workforceFacts.map((f) => f[0]);

  return {
    data,
    monthFy: d.months.map((m) => fyIdx.get(fiscalYearOf(m)) ?? -1),
    monthIdx: indexOf(d.months),
    branchByCode: indexOf(d.branches.map((b) => b.code)),
    headByName: indexOf(d.expenseHeads),
    subByName: indexOf(d.subCategories),
    hrisCoverage: hrisMonths.length
      ? { first: d.months[Math.min(...hrisMonths)], last: d.months[Math.max(...hrisMonths)] }
      : null,
  };
}

// ---------------------------------------------------------------------------
// Period helpers
// ---------------------------------------------------------------------------

/** Selected month range as indexes into dimensions.months (inclusive). */
export function resolveRange(model: Model, f: Pick<Filters, "monthFrom" | "monthTo">) {
  const last = model.data.dimensions.months.length - 1;
  let from = f.monthFrom === ALL ? 0 : (model.monthIdx.get(f.monthFrom) ?? 0);
  let to = f.monthTo === ALL ? last : (model.monthIdx.get(f.monthTo) ?? last);
  if (from > to) [from, to] = [to, from];
  return { from, to };
}

/** "FY 2025-26", "Jun 2026", "Jan 2026 – Mar 2026" or "All time". */
export function rangeLabel(d: Dimensions, from: number, to: number): string {
  const last = d.months.length - 1;
  if (from === 0 && to === last) return "All time";
  if (from === to) return monthLabel(d.months[from]);
  const fy = fiscalYearOf(d.months[from]);
  const isFullFy = d.months[from].endsWith("-07") && d.months[to].endsWith("-06") && fiscalYearOf(d.months[to]) === fy;
  if (isFullFy) return fy;
  return `${monthLabel(d.months[from], true)} – ${monthLabel(d.months[to], true)}`;
}

/** The fiscal year whose 12 months exactly match the range, if any. */
export function fiscalYearOfRange(d: Dimensions, from: number, to: number): string | null {
  const label = rangeLabel(d, from, to);
  return label.startsWith("FY ") ? label : null;
}

/** Month range for a fiscal year label, e.g. "FY 2025-26" -> 2025-07 .. 2026-06. */
export function fiscalYearRange(fy: string): { monthFrom: string; monthTo: string } {
  const start = Number(fy.slice(3, 7));
  return { monthFrom: `${start}-07`, monthTo: `${start + 1}-06` };
}

/** Sensible bucket size for a span of months. */
export function autoGrain(months: number): Grain {
  if (months <= 24) return "month";
  if (months <= 48) return "quarter";
  return "fiscal-year";
}

function bucketKey(month: string, grain: Grain): string {
  if (grain === "month") return month;
  if (grain === "fiscal-year") return fiscalYearOf(month);
  return `${month.slice(0, 4)} Q${Math.ceil(Number(month.slice(5, 7)) / 3)}`;
}

export function bucketLabel(key: string, grain: Grain, short = false): string {
  if (grain === "month") return monthLabel(key, short);
  if (grain === "fiscal-year" && short) return key.replace("FY ", "");
  return key;
}

// ---------------------------------------------------------------------------
// Output shapes
// ---------------------------------------------------------------------------

export interface Comparison {
  currentLabel: string;
  previousLabel: string | null;
  current: number;
  previous: number;
  change: number | null;
}

export interface Kpis {
  periodLabel: string;
  totalSpend: number;
  comparison: Comparison;
  avgMonthly: number;
  monthsCovered: number;
  entries: number;
  latestMonth: { month: string; amount: number; previousMonth: string | null; change: number | null } | null;
  topHead: { name: string; share: number } | null;
  activeLocations: number;
  locationsInScope: number;
  headcount: number;
  headcountMonth: string | null;
  headcountChange: number | null;
  payroll: number;
}

/** One bar of a trend chart: bucket key + one numeric key per expense head. */
export type TrendPoint = { label: string; total: number } & Record<string, number | string>;

export interface HeadSlice {
  name: string;
  amount: number;
  share: number;
}

export interface BranchRow {
  branch: Branch;
  spend: number;
  share: number;
  entries: number;
  current: number;
  previous: number;
  change: number | null;
  headcount: number;
  /** Spend ÷ employee-months, over months in range that have HRIS headcount */
  costPerStaffMonth: number | null;
  byHead: number[]; // amount per expense head (same order as dimensions.expenseHeads)
}

export interface BreakdownRow {
  name: string;
  expenseHead: string;
  amount: number;
  entries: number;
  share: number;
}

export interface DepartmentRow {
  code: string;
  name: string;
  employees: number; // in the latest month of the period
  avgEmployees: number;
  salary: number;
  avgSalary: number; // salary per employee-month
  share: number;
}

export interface WorkforcePoint {
  label: string;
  month: string;
  employees: number;
  salary: number;
}

export interface MatrixRow {
  key: string; // branch code or expense head
  label: string;
  sublabel?: string;
  values: number[];
  total: number;
}

export interface Matrix {
  columns: string[]; // bucket keys
  rows: MatrixRow[];
  columnTotals: number[];
  total: number;
}

export interface Summary {
  range: { from: number; to: number };
  grain: Grain;
  kpis: Kpis;
  trend: TrendPoint[];
  heads: HeadSlice[];
  branches: BranchRow[];
  subCategories: BreakdownRow[];
  costUnits: BreakdownRow[];
  departments: DepartmentRow[];
  workforceTrend: WorkforcePoint[];
  branchMatrix: Matrix;
  headMatrix: Matrix;
}

// ---------------------------------------------------------------------------
// Filtering. Each breakdown ignores its own dimension so siblings stay visible
// (e.g. the branch table lists every branch even when one is selected).
// ---------------------------------------------------------------------------

type Ignore = Partial<Record<"period" | "branch" | "head" | "sub", boolean>>;

function scope(model: Model, f: Filters) {
  const { dimensions: d } = model.data;
  const { from, to } = resolveRange(model, f);
  return {
    from,
    to,
    typeOk: d.branches.map((b) => f.branchType === ALL || b.type === f.branchType),
    branch: f.branch === ALL ? -1 : (model.branchByCode.get(f.branch) ?? -2),
    head: f.expenseHead === ALL ? -1 : (model.headByName.get(f.expenseHead) ?? -2),
    sub: f.subCategory === ALL ? -1 : (model.subByName.get(f.subCategory) ?? -2),
    deptOk: d.departments.map((dep) => f.department === ALL || dep.code === f.department),
  };
}

type Scope = ReturnType<typeof scope>;

function expenseMatch(s: Scope, fact: number[], ignore: Ignore = {}): boolean {
  const [m, b, h, sub] = fact;
  if (!s.typeOk[b]) return false;
  if (!ignore.period && (m < s.from || m > s.to)) return false;
  if (!ignore.branch && s.branch !== -1 && b !== s.branch) return false;
  if (!ignore.head && s.head !== -1 && h !== s.head) return false;
  if (!ignore.sub && s.sub !== -1 && sub !== s.sub) return false;
  return true;
}

function workforceMatch(s: Scope, fact: number[], ignore: Ignore = {}): boolean {
  const [m, b, dep] = fact;
  if (!s.typeOk[b] || !s.deptOk[dep]) return false;
  if (!ignore.period && (m < s.from || m > s.to)) return false;
  if (!ignore.branch && s.branch !== -1 && b !== s.branch) return false;
  return true;
}

const change = (current: number, previous: number) =>
  previous > 0 ? (current - previous) / previous : null;

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

export function summarize(model: Model, f: Filters, grainOverride?: Grain): Summary {
  const { dimensions: d, expenseFacts, workforceFacts } = model.data;
  const s = scope(model, f);
  const headNames = d.expenseHeads;
  const grain = grainOverride ?? autoGrain(s.to - s.from + 1);

  // Comparison: the last ≤12 months of the range vs the same months a year earlier.
  // (All time -> latest FY vs the one before; Mar 2026 -> Mar 2025.)
  const cmpTo = s.to;
  const cmpFrom = Math.max(s.from, s.to - 11);
  const hasPrev = cmpFrom - 12 >= 0;
  const inCmp = (m: number) => m >= cmpFrom && m <= cmpTo;
  const inPrev = (m: number) => m >= cmpFrom - 12 && m <= cmpTo - 12;

  // Time buckets for the trend and matrices
  const columns: string[] = [];
  const colOf = new Map<number, number>(); // month idx -> column
  for (let m = s.from; m <= s.to; m++) {
    const key = bucketKey(d.months[m], grain);
    if (columns.at(-1) !== key) columns.push(key);
    colOf.set(m, columns.length - 1);
  }
  const zeros = () => columns.map(() => 0);

  let totalSpend = 0;
  let entries = 0;
  let cmpCurrent = 0;
  let cmpPrevious = 0;
  const spendByMonth = new Map<number, number>();
  const headTotals = headNames.map(() => 0);
  const trendAgg = columns.map(() => headNames.map(() => 0));
  const branchAgg = d.branches.map(() => ({
    spend: 0, entries: 0, current: 0, previous: 0, byHead: headNames.map(() => 0), byCol: zeros(),
    byMonth: new Map<number, number>(),
  }));
  const headByCol = headNames.map(() => zeros());
  const subAgg = new Map<number, { head: number; amount: number; entries: number }>();
  const unitAgg = new Map<string, { head: number; amount: number; entries: number }>();

  for (const fact of expenseFacts) {
    const [m, b, h, sub, unit, amount, n] = fact;

    if (expenseMatch(s, fact)) {
      totalSpend += amount;
      entries += n;
      spendByMonth.set(m, (spendByMonth.get(m) ?? 0) + amount);
      trendAgg[colOf.get(m)!][h] += amount;
      const key = `${h}|${unit}`;
      const u = unitAgg.get(key) ?? { head: h, amount: 0, entries: 0 };
      u.amount += amount;
      u.entries += n;
      unitAgg.set(key, u);
    }
    if (expenseMatch(s, fact, { period: true })) {
      if (inCmp(m)) cmpCurrent += amount;
      else if (inPrev(m)) cmpPrevious += amount;
    }
    if (expenseMatch(s, fact, { head: true, sub: true })) {
      headTotals[h] += amount;
      headByCol[h][colOf.get(m)!] += amount;
    }
    if (expenseMatch(s, fact, { branch: true })) {
      const a = branchAgg[b];
      a.spend += amount;
      a.entries += n;
      a.byHead[h] += amount;
      a.byCol[colOf.get(m)!] += amount;
      a.byMonth.set(m, (a.byMonth.get(m) ?? 0) + amount);
    }
    if (expenseMatch(s, fact, { branch: true, period: true })) {
      if (inCmp(m)) branchAgg[b].current += amount;
      else if (inPrev(m)) branchAgg[b].previous += amount;
    }
    if (expenseMatch(s, fact, { sub: true })) {
      const row = subAgg.get(sub) ?? { head: h, amount: 0, entries: 0 };
      row.amount += amount;
      row.entries += n;
      subAgg.set(sub, row);
    }
  }

  // ---- Workforce (HRIS) ---------------------------------------------------
  let payroll = 0;
  let latestHrisMonth = -1;
  const empByMonth = new Map<number, number>();
  const salByMonth = new Map<number, number>();
  const branchEmpByMonth = d.branches.map(() => new Map<number, number>());
  const deptAgg = d.departments.map(() => ({ salary: 0, empMonths: 0, byMonth: new Map<number, number>() }));

  for (const fact of workforceFacts) {
    const [m, b, dep, employees, salary] = fact;
    if (workforceMatch(s, fact)) {
      payroll += salary;
      latestHrisMonth = Math.max(latestHrisMonth, m);
      empByMonth.set(m, (empByMonth.get(m) ?? 0) + employees);
      salByMonth.set(m, (salByMonth.get(m) ?? 0) + salary);
      const a = deptAgg[dep];
      a.salary += salary;
      a.empMonths += employees;
      a.byMonth.set(m, (a.byMonth.get(m) ?? 0) + employees);
    }
    if (workforceMatch(s, fact, { branch: true })) {
      const map = branchEmpByMonth[b];
      map.set(m, (map.get(m) ?? 0) + employees);
    }
  }

  const workforceMonths = [...empByMonth.keys()].sort((a, b) => a - b);
  const headcount = latestHrisMonth >= 0 ? (empByMonth.get(latestHrisMonth) ?? 0) : 0;
  const prevHeadcount = workforceMonths.length > 1 ? empByMonth.get(workforceMonths.at(-2)!)! : 0;

  // Latest month with spend in the range, vs the calendar month before it
  const spendMonths = [...spendByMonth.keys()].sort((a, b) => a - b);
  const lastSpendMonth = spendMonths.at(-1);
  let latestMonth: Kpis["latestMonth"] = null;
  if (lastSpendMonth !== undefined) {
    const amount = spendByMonth.get(lastSpendMonth) ?? 0;
    let previous = 0;
    if (lastSpendMonth > 0) {
      for (const fact of expenseFacts) {
        if (fact[0] === lastSpendMonth - 1 && expenseMatch(s, fact, { period: true })) previous += fact[5];
      }
    }
    latestMonth = {
      month: d.months[lastSpendMonth],
      amount,
      previousMonth: lastSpendMonth > 0 ? d.months[lastSpendMonth - 1] : null,
      change: change(amount, previous),
    };
  }

  // ---- Assemble -------------------------------------------------------------
  const branchesInScope = d.branches.filter((_, i) => s.typeOk[i] && (s.branch === -1 || s.branch === i));
  const topHeadIdx = headTotals.indexOf(Math.max(...headTotals));
  const headSum = headTotals.reduce((a, v) => a + v, 0);
  const branchSpendSum = branchAgg.reduce((a, v) => a + v.spend, 0);

  const kpis: Kpis = {
    periodLabel: rangeLabel(d, s.from, s.to),
    totalSpend,
    comparison: {
      currentLabel: rangeLabel(d, cmpFrom, cmpTo),
      previousLabel: hasPrev ? rangeLabel(d, cmpFrom - 12, cmpTo - 12) : null,
      current: cmpCurrent,
      previous: cmpPrevious,
      change: hasPrev ? change(cmpCurrent, cmpPrevious) : null,
    },
    avgMonthly: spendByMonth.size ? totalSpend / spendByMonth.size : 0,
    monthsCovered: spendByMonth.size,
    entries,
    latestMonth,
    topHead: headSum > 0 ? { name: headNames[topHeadIdx], share: headTotals[topHeadIdx] / headSum } : null,
    activeLocations: branchesInScope.filter((b) => b.status === "Active").length,
    locationsInScope: branchesInScope.length,
    headcount,
    headcountMonth: latestHrisMonth >= 0 ? d.months[latestHrisMonth] : null,
    headcountChange: change(headcount, prevHeadcount),
    payroll,
  };

  const trend: TrendPoint[] = columns.map((label, i) => {
    const point: TrendPoint = { label, total: trendAgg[i].reduce((a, v) => a + v, 0) };
    headNames.forEach((h, j) => (point[h] = trendAgg[i][j]));
    return point;
  });

  const branches: BranchRow[] = d.branches
    .map((branch, i) => {
      const a = branchAgg[i];
      const emp = branchEmpByMonth[i];
      // Staff = employees in the latest HRIS month within the range
      let last = -1;
      let staffSpend = 0;
      let staffMonths = 0;
      for (const [m, n] of emp) {
        if (m < s.from || m > s.to) continue;
        if (m > last) last = m;
        staffSpend += a.byMonth.get(m) ?? 0;
        staffMonths += n;
      }
      return {
        branch,
        spend: a.spend,
        share: branchSpendSum ? a.spend / branchSpendSum : 0,
        entries: a.entries,
        current: a.current,
        previous: a.previous,
        change: hasPrev ? change(a.current, a.previous) : null,
        headcount: last >= 0 ? (emp.get(last) ?? 0) : 0,
        costPerStaffMonth: staffMonths ? staffSpend / staffMonths : null,
        byHead: a.byHead,
      };
    })
    .filter((r, i) => s.typeOk[i] && (r.spend > 0 || r.headcount > 0))
    .sort((a, b) => b.spend - a.spend);

  const toBreakdown = (rows: { name: string; head: number; amount: number; entries: number }[]) => {
    const sum = rows.reduce((a, r) => a + r.amount, 0);
    return rows
      .map((r) => ({ name: r.name, expenseHead: headNames[r.head], amount: r.amount, entries: r.entries, share: sum ? r.amount / sum : 0 }))
      .sort((a, b) => b.amount - a.amount);
  };

  const departments: DepartmentRow[] = d.departments
    .map((dep, i) => {
      const a = deptAgg[i];
      return {
        code: dep.code,
        name: dep.name,
        employees: latestHrisMonth >= 0 ? (a.byMonth.get(latestHrisMonth) ?? 0) : 0,
        avgEmployees: a.byMonth.size ? a.empMonths / a.byMonth.size : 0,
        salary: a.salary,
        avgSalary: a.empMonths ? a.salary / a.empMonths : 0,
        share: payroll ? a.salary / payroll : 0,
      };
    })
    .filter((r) => r.salary > 0 || r.employees > 0)
    .sort((a, b) => b.salary - a.salary);

  const toMatrix = (rows: MatrixRow[]): Matrix => {
    const kept = rows.filter((r) => r.total > 0).sort((a, b) => b.total - a.total);
    const columnTotals = columns.map((_, c) => kept.reduce((a, r) => a + r.values[c], 0));
    return { columns, rows: kept, columnTotals, total: columnTotals.reduce((a, v) => a + v, 0) };
  };

  return {
    range: { from: s.from, to: s.to },
    grain,
    kpis,
    trend,
    heads: headNames.map((name, i) => ({ name, amount: headTotals[i], share: headSum ? headTotals[i] / headSum : 0 })),
    branches,
    subCategories: toBreakdown([...subAgg].map(([sub, r]) => ({ name: d.subCategories[sub], ...r }))),
    costUnits: toBreakdown([...unitAgg].map(([key, r]) => ({ name: d.costUnits[Number(key.split("|")[1])], ...r }))),
    departments,
    workforceTrend: workforceMonths.map((m) => ({
      label: d.months[m],
      month: d.months[m],
      employees: empByMonth.get(m) ?? 0,
      salary: salByMonth.get(m) ?? 0,
    })),
    branchMatrix: toMatrix(
      d.branches
        .map((b, i) => ({
          key: b.code,
          label: b.name,
          sublabel: `${b.code} · ${b.type}`,
          values: branchAgg[i].byCol,
          total: branchAgg[i].spend,
        }))
        .filter((_, i) => s.typeOk[i]),
    ),
    headMatrix: toMatrix(
      headNames.map((h, i) => ({ key: h, label: h, values: headByCol[i], total: headTotals[i] })),
    ),
  };
}

/** Month keys for a bucket (used when a matrix cell is clicked). */
export function monthsOfBucket(d: Dimensions, key: string, grain: Grain): { monthFrom: string; monthTo: string } {
  const months = d.months.filter((m) => bucketKey(m, grain) === key);
  return { monthFrom: months[0], monthTo: months.at(-1)! };
}
