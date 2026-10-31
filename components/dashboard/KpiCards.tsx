import { Building2, CalendarClock, CalendarRange, ChartPie, ReceiptText, Sheet, TrendingDown, TrendingUp, Users, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { Kpis } from "@/lib/analytics";
import { formatChange, formatNumber, formatPKR, formatShare, monthLabel } from "@/lib/format";

interface KpiCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  detail: string;
  delta?: { value: number | null; label: string; /** true when an increase is unfavourable (costs) */ upIsBad?: boolean };
}

export function KpiCard({ label, value, icon: Icon, detail, delta }: KpiCardProps) {
  const up = (delta?.value ?? 0) > 0;
  const bad = delta?.upIsBad ? up : !up;
  const tone =
    delta?.value == null || delta.value === 0
      ? "bg-slate-100 text-slate-600"
      : bad
        ? "bg-rose-50 text-rose-700"
        : "bg-emerald-50 text-emerald-700";
  const Trend = up ? TrendingUp : TrendingDown;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <span className="rounded-lg bg-indigo-50 p-1.5 text-indigo-600">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-2 truncate text-2xl font-semibold text-slate-900" title={value}>
        {value}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
        {delta && (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${tone}`}>
            {delta.value != null && delta.value !== 0 && <Trend className="h-3 w-3" />}
            {formatChange(delta.value)}
          </span>
        )}
        <span className="truncate">{delta ? delta.label : detail}</span>
      </div>
      {delta && <p className="mt-1 truncate text-xs text-slate-400">{detail}</p>}
    </div>
  );
}

export function KpiCards({ kpis }: { kpis: Kpis }) {
  const c = kpis.comparison;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard
        label="Total spend"
        icon={Wallet}
        value={formatPKR(kpis.totalSpend)}
        detail={kpis.periodLabel}
        delta={{
          value: c.change,
          upIsBad: true,
          label: c.previousLabel ? `${c.currentLabel} vs ${c.previousLabel}` : c.currentLabel,
        }}
      />
      <KpiCard
        label="Avg monthly spend"
        icon={CalendarRange}
        value={formatPKR(kpis.avgMonthly)}
        detail={`over ${kpis.monthsCovered} month${kpis.monthsCovered === 1 ? "" : "s"} with spend`}
      />
      <KpiCard
        label="Latest month"
        icon={CalendarClock}
        value={kpis.latestMonth ? formatPKR(kpis.latestMonth.amount) : "—"}
        detail={kpis.latestMonth ? `spend in ${monthLabel(kpis.latestMonth.month)}` : "No spend in scope"}
        delta={
          kpis.latestMonth?.previousMonth
            ? { value: kpis.latestMonth.change, upIsBad: true, label: `vs ${monthLabel(kpis.latestMonth.previousMonth)}` }
            : undefined
        }
      />
      <KpiCard
        label="Largest cost head"
        icon={ChartPie}
        value={kpis.topHead?.name ?? "—"}
        detail={kpis.topHead ? `${formatShare(kpis.topHead.share)} of spend in scope` : "No spend in scope"}
      />
      <KpiCard
        label="Active locations"
        icon={Building2}
        value={`${kpis.activeLocations} / ${kpis.locationsInScope}`}
        detail="active = spend in last 3 months"
      />
      <KpiCard
        label="Headcount (HRIS)"
        icon={Users}
        value={formatNumber(kpis.headcount)}
        detail={kpis.headcountMonth ? `employees paid · ${monthLabel(kpis.headcountMonth)}` : "No HRIS data in scope"}
        delta={kpis.headcountMonth ? { value: kpis.headcountChange, label: "vs previous month" } : undefined}
      />
      <KpiCard
        label="Payroll (HRIS)"
        icon={ReceiptText}
        value={formatPKR(kpis.payroll)}
        detail={`salary paid · ${kpis.periodLabel}`}
      />
      <KpiCard
        label="Ledger entries"
        icon={Sheet}
        value={formatNumber(kpis.entries)}
        detail="vouchers & salary months in scope"
      />
    </div>
  );
}
