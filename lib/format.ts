const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const integer = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });

/** PKR in the workbook's convention: millions shown as "M". */
export function formatPKR(value: number, { compact = true } = {}): string {
  if (!compact) return `PKR ${integer.format(value)}`;
  const abs = Math.abs(value);
  if (abs >= 1e9) return `PKR ${(value / 1e9).toFixed(2)} B`;
  if (abs >= 1e6) return `PKR ${(value / 1e6).toFixed(abs >= 1e8 ? 1 : 2)} M`;
  if (abs >= 1e3) return `PKR ${(value / 1e3).toFixed(1)} K`;
  return `PKR ${integer.format(value)}`;
}

/** Axis ticks: no currency prefix, millions only. */
export function formatMillions(value: number): string {
  if (value === 0) return "0";
  const m = value / 1e6;
  return `${m >= 10 ? m.toFixed(0) : m >= 1 ? m.toFixed(1) : m.toFixed(2)}M`;
}

export function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString("en-US", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

export function formatShare(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/** Signed percentage change, e.g. "+20.3%". */
export function formatChange(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "—";
  return `${value > 0 ? "+" : ""}${(value * 100).toFixed(1)}%`;
}

/** "2025-07" -> "Jul 2025" (or "Jul 25" when short). */
export function monthLabel(key: string, short = false): string {
  const [y, m] = key.split("-");
  return `${MONTHS[Number(m) - 1]} ${short ? y.slice(2) : y}`;
}

export function dateLabel(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`;
}

/** Fiscal year (Jul–Jun) of a "YYYY-MM" month key, e.g. "FY 2025-26". */
export function fiscalYearOf(key: string): string {
  const y = Number(key.slice(0, 4));
  const start = Number(key.slice(5, 7)) >= 7 ? y : y - 1;
  return `FY ${start}-${String(start + 1).slice(2)}`;
}
