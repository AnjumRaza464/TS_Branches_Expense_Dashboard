import { resolveRange, type Model } from "@/lib/analytics";
import { formatPKR, monthLabel } from "@/lib/format";
import { ALL, type Branch, type DashboardView, type Filters } from "@/lib/types";

// ---------------------------------------------------------------------------
// Exceptions worth a manager's attention, computed from the same facts as the
// dashboard and scoped by the period, location type, branch and expense head.
// ---------------------------------------------------------------------------

export type AlertSeverity = "critical" | "warning" | "info";
export type AlertKind = "missing-spend" | "spike" | "classification";

export interface Alert {
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  subject: string; // location or sub-category the alert is about
  detail: string;
  amount: number | null;
  /** Where "Investigate" takes the user */
  drill: Partial<Filters> & { view: DashboardView };
}

// Thresholds — tune here
const SPIKE_RATIO = 1.5; // month spend vs trailing 12-month average
const SPIKE_CRITICAL_RATIO = 2;
const SPIKE_MIN_EXCESS = 250_000; // PKR above average, so tiny branches don't flood the list
const SPIKE_MIN_HISTORY = 6; // months of history needed for a baseline
const MAX_SPIKES = 15;
const MIN_COVERAGE = 0.8; // gaps are only flagged for locations that normally book spend every month

/** Sub-category names that clearly belong to another expense head. */
const HEAD_KEYWORDS: Record<string, string[]> = {
  Rent: ["rent"],
  "Utility Bills": ["utilities", "utility", "electricity", "gas", "water bill"],
  "Staff Salaries": ["salary", "salaries", "staff salary"],
};

const SEVERITY_ORDER: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };

export function computeAlerts(model: Model, f: Filters): Alert[] {
  const { dimensions: d, expenseFacts } = model.data;
  const { from, to } = resolveRange(model, f);
  const headIdx = f.expenseHead === ALL ? -1 : (model.headByName.get(f.expenseHead) ?? -2);
  const branchIdx = f.branch === ALL ? -1 : (model.branchByCode.get(f.branch) ?? -2);
  const inScope = (b: number) =>
    (f.branchType === ALL || d.branches[b].type === f.branchType) && (branchIdx === -1 || branchIdx === b);

  // Branch × month totals over the whole history (baselines need months before the range)
  const months = d.months.length;
  const anySpend = d.branches.map(() => new Float64Array(months)); // all heads
  // Per head: heads start at different times (salaries enter the ledger only in late 2020),
  // so each head is compared with its own history.
  const headSpend = d.branches.map(() => d.expenseHeads.map(() => new Float64Array(months)));
  const misclassified = new Map<string, { sub: number; head: number; amount: number; entries: number }>();

  for (const [m, b, h, sub, , amount, n] of expenseFacts) {
    if (!inScope(b)) continue;
    anySpend[b][m] += amount;
    headSpend[b][h][m] += amount;

    if (m >= from && m <= to && (headIdx === -1 || h === headIdx)) {
      const name = d.subCategories[sub].toLowerCase();
      const belongsTo = Object.entries(HEAD_KEYWORDS).find(([, words]) => words.includes(name))?.[0];
      if (belongsTo && belongsTo !== d.expenseHeads[h]) {
        const key = `${sub}|${h}`;
        const row = misclassified.get(key) ?? { sub, head: h, amount: 0, entries: 0 };
        row.amount += amount;
        row.entries += n;
        misclassified.set(key, row);
      }
    }
  }

  const alerts: Alert[] = [];

  d.branches.forEach((branch, b) => {
    if (!inScope(b) || !branch.firstMonth || !branch.lastMonth) return;
    alerts.push(...missingRuns(model, branch, anySpend[b], from, to));
    d.expenseHeads.forEach((head, h) => {
      if (headIdx === -1 || headIdx === h) alerts.push(...spikes(model, branch, headSpend[b][h], from, to, head));
    });
  });

  // Keep the largest spikes only
  const spikeAlerts = alerts.filter((a) => a.kind === "spike").sort((a, b) => (b.amount ?? 0) - (a.amount ?? 0));
  const dropped = new Set(spikeAlerts.slice(MAX_SPIKES).map((a) => a.id));

  for (const r of misclassified.values()) {
    const sub = d.subCategories[r.sub];
    const head = d.expenseHeads[r.head];
    alerts.push({
      id: `class-${r.sub}-${r.head}`,
      kind: "classification",
      severity: "info",
      title: "Possible misclassification",
      subject: `“${sub}” booked under ${head}`,
      detail: `${r.entries.toLocaleString("en-US")} entries totalling ${formatPKR(r.amount)} look like ${Object.entries(HEAD_KEYWORDS).find(([, w]) => w.includes(sub.toLowerCase()))?.[0]} but are booked as ${head}, which understates that head.`,
      amount: r.amount,
      drill: { view: "ledger", expenseHead: head, subCategory: sub },
    });
  }

  return alerts
    .filter((a) => !dropped.has(a.id))
    .sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || (b.amount ?? 0) - (a.amount ?? 0));
}

/** Consecutive months with no spend at all inside a location's active period. */
function missingRuns(model: Model, branch: Branch, spend: Float64Array, from: number, to: number): Alert[] {
  const d = model.data.dimensions;
  const first = model.monthIdx.get(branch.firstMonth!)!;
  const last = model.monthIdx.get(branch.lastMonth!)!;
  let active = 0;
  for (let m = first; m <= last; m++) if (spend[m] > 0) active++;
  // Occasional cost centres (e.g. an office with 14 entries in 4 years) gap by nature
  if (active / (last - first + 1) < MIN_COVERAGE) return [];

  const start = Math.max(from, first);
  const end = Math.min(to, last);
  const out: Alert[] = [];
  let runStart = -1;
  for (let m = start; m <= end + 1; m++) {
    const empty = m <= end && spend[m] === 0;
    if (empty && runStart === -1) runStart = m;
    if (!empty && runStart !== -1) {
      const runEnd = m - 1;
      const n = runEnd - runStart + 1;
      const period = n === 1 ? monthLabel(d.months[runStart]) : `${monthLabel(d.months[runStart])} – ${monthLabel(d.months[runEnd])}`;
      out.push({
        id: `gap-${branch.code}-${runStart}`,
        kind: "missing-spend",
        severity: n >= 2 ? "critical" : "warning",
        title: n === 1 ? "No spend recorded for a month" : `No spend recorded for ${n} months`,
        subject: branch.name,
        detail: `${period}: no rent, utilities, salaries or other expenses were booked while the location was active. Check whether it was closed or the entries are missing.`,
        amount: null,
        drill: {
          view: "monthly",
          branch: branch.code,
          monthFrom: d.months[Math.max(0, runStart - 3)],
          monthTo: d.months[Math.min(d.months.length - 1, runEnd + 3)],
        },
      });
      runStart = -1;
    }
  }
  return out;
}

/**
 * Months where a cost head jumps well above its own trailing 12-month average.
 * One- or two-month jumps are reported as unusual spend; a jump that has lasted
 * 3+ months is reported once, and only while it is still ongoing (older level
 * shifts are history, not exceptions).
 */
function spikes(model: Model, branch: Branch, spend: Float64Array, from: number, to: number, head: string): Alert[] {
  const d = model.data.dimensions;
  const lastMonth = d.months.length - 1;
  const out: Alert[] = [];
  const baselineAt = (m: number) => {
    let sum = 0;
    let n = 0;
    for (let k = Math.max(0, m - 12); k < m; k++) {
      if (spend[k] > 0) {
        sum += spend[k];
        n++;
      }
    }
    return n >= SPIKE_MIN_HISTORY ? sum / n : null;
  };
  const isHigh = (value: number, avg: number) => value >= avg * SPIKE_RATIO && value - avg >= SPIKE_MIN_EXCESS;

  let m = from;
  while (m <= to) {
    const value = spend[m];
    const avg = value > 0 ? baselineAt(m) : null;
    if (avg === null || !isHigh(value, avg)) {
      m++;
      continue;
    }
    let end = m;
    while (end + 1 <= lastMonth && spend[end + 1] > 0 && isHigh(spend[end + 1], avg)) end++;
    const runMonths = end - m + 1;
    const total = Array.from({ length: runMonths }, (_, k) => spend[m + k]).reduce((a, v) => a + v, 0);
    const runAvg = total / runMonths;
    const ratio = runAvg / avg;
    const period = runMonths === 1 ? monthLabel(d.months[m]) : `${monthLabel(d.months[m])} – ${monthLabel(d.months[end])}`;

    if (runMonths <= 2) {
      out.push({
        id: `spike-${branch.code}-${head}-${m}`,
        kind: "spike",
        severity: ratio >= SPIKE_CRITICAL_RATIO ? "critical" : "warning",
        title: `${head} ${ratio.toFixed(1)}× the usual level`,
        subject: branch.name,
        detail: `${period}: ${formatPKR(runAvg)}${runMonths > 1 ? " per month" : ""} vs a 12-month average of ${formatPKR(avg)} — ${formatPKR(total - avg * runMonths)} above normal.`,
        amount: total - avg * runMonths,
        drill: { view: "ledger", branch: branch.code, expenseHead: head, subCategory: ALL, monthFrom: d.months[m], monthTo: d.months[end] },
      });
    } else if (end === lastMonth) {
      out.push({
        id: `step-${branch.code}-${head}-${m}`,
        kind: "spike",
        severity: "warning",
        title: `${head} has stayed ${ratio.toFixed(1)}× higher since ${monthLabel(d.months[m])}`,
        subject: branch.name,
        detail: `${period} (${runMonths} months) averaged ${formatPKR(runAvg)} per month vs ${formatPKR(avg)} in the 12 months before. Confirm this is planned (new lease, expansion, tariff change).`,
        amount: total - avg * runMonths,
        drill: {
          view: "monthly",
          branch: branch.code,
          expenseHead: head,
          subCategory: ALL,
          monthFrom: d.months[Math.max(0, m - 12)],
          monthTo: d.months[lastMonth],
        },
      });
    }
    m = end + 1;
  }
  return out;
}
