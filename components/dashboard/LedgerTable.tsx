"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ArrowUpDown, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { dateLabel, formatNumber, formatPKR } from "@/lib/format";
import { ALL, type Filters, type LedgerResponse, type LedgerSortKey } from "@/lib/types";
import { headColor } from "./palette";

const PAGE_SIZE = 25;

function buildParams(filters: Filters, extra: Record<string, string>) {
  const p = new URLSearchParams();
  const map: [string, string][] = [
    ["monthFrom", filters.monthFrom],
    ["monthTo", filters.monthTo],
    ["branchType", filters.branchType],
    ["branch", filters.branch],
    ["expenseHead", filters.expenseHead],
    ["subCategory", filters.subCategory],
  ];
  for (const [k, v] of map) if (v !== ALL) p.set(k, v);
  for (const [k, v] of Object.entries(extra)) if (v) p.set(k, v);
  return p;
}

/** Lowest drill level: individual ledger entries, paged on the server. */
export function LedgerTable({ filters }: { filters: Filters }) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [sort, setSort] = useState<{ key: LedgerSortKey; dir: "asc" | "desc" }>({ key: "date", dir: "desc" });
  // Page resets to 1 whenever the question (filters, search, sort) changes
  const questionKey = JSON.stringify([filters, debounced, sort]);
  const [pager, setPager] = useState({ key: questionKey, page: 1 });
  const page = pager.key === questionKey ? pager.page : 1;
  const setPage = (next: number) => setPager({ key: questionKey, page: next });

  // Last response, tagged with the query it answers; older data stays visible while loading
  const [result, setResult] = useState<{ query: string; data?: LedgerResponse; error?: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const query = buildParams(filters, {
    q: debounced,
    sort: sort.key,
    dir: sort.dir,
    page: String(page),
    pageSize: String(PAGE_SIZE),
  }).toString();

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/ledger?${query}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        return res.json() as Promise<LedgerResponse>;
      })
      .then((data) => setResult({ query, data }))
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        setResult({ query, error: err instanceof Error ? err.message : "Could not load ledger" });
      });
    return () => controller.abort();
  }, [query]);

  const loading = result?.query !== query;
  const data = result?.data ?? null;
  const error = !loading && result?.error ? result.error : null;

  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE_SIZE)) : 1;
  const toggleSort = (key: LedgerSortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search voucher, narration or ledger account…"
            className="h-9 w-full rounded-lg border border-slate-200 pl-8 pr-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
        </div>
        <div className="flex items-center gap-4 text-sm">
          {data && (
            <span className="text-slate-600">
              <b className="tabular-nums text-slate-900">{formatNumber(data.total)}</b> entries ·{" "}
              <b className="tabular-nums text-slate-900">{formatPKR(data.amount)}</b>
            </span>
          )}
        </div>
      </div>

      <div className={`-mx-5 overflow-x-auto transition-opacity ${loading ? "opacity-60" : ""}`}>
        <table className="w-full min-w-[980px] text-sm">
          <thead>
            <tr className="border-y border-slate-100 bg-slate-50/70 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
              <th className="py-2.5 pl-5 pr-3">
                <SortButton label="Date" active={sort.key === "date"} onClick={() => toggleSort("date")} />
              </th>
              <th className="px-3 py-2.5">Location</th>
              <th className="px-3 py-2.5">Head / sub-category</th>
              <th className="px-3 py-2.5">Cost unit · ledger account</th>
              <th className="px-3 py-2.5">Voucher</th>
              <th className="px-3 py-2.5">Narration</th>
              <th className="py-2.5 pl-3 pr-5 text-right">
                <SortButton label="Amount" active={sort.key === "amount"} onClick={() => toggleSort("amount")} />
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {error && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-rose-600">{error}</td>
              </tr>
            )}
            {!error && data?.rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">No ledger entries match.</td>
              </tr>
            )}
            {!error && !data && (
              <tr>
                <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-500">Loading ledger…</td>
              </tr>
            )}
            {!error &&
              data?.rows.map((r, i) => (
                <tr key={`${r.voucher}-${r.date}-${i}`} className="align-top hover:bg-slate-50">
                  <td className="whitespace-nowrap py-2.5 pl-5 pr-3 tabular-nums text-slate-700">{dateLabel(r.date)}</td>
                  <td className="px-3 py-2.5">
                    <div className="font-medium text-slate-900">{r.branchName}</div>
                    <div className="text-xs text-slate-500">{r.branchCode}</div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1.5 text-slate-800">
                      <span className="h-2 w-2 rounded-full" style={{ background: headColor(r.expenseHead) }} />
                      {r.expenseHead}
                    </div>
                    <div className="text-xs text-slate-500">{r.subCategory}</div>
                  </td>
                  <td className="max-w-56 px-3 py-2.5">
                    <div className="text-slate-800">{r.costUnit}</div>
                    <div className="truncate text-xs text-slate-500" title={`${r.ledgerAccount} (${r.accountCode})`}>
                      {r.ledgerAccount}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-3 py-2.5 font-mono text-xs text-slate-600">{r.voucher || "—"}</td>
                  <td className="max-w-72 px-3 py-2.5 text-xs text-slate-600">
                    <p className="line-clamp-2" title={r.narration}>{r.narration || "—"}</p>
                  </td>
                  <td className="whitespace-nowrap py-2.5 pl-3 pr-5 text-right font-medium tabular-nums text-slate-900">
                    {formatPKR(r.amount, { compact: false })}
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <span>
          Page {page} of {formatNumber(pages)}
        </span>
        <div className="flex gap-2">
          <PageButton disabled={page <= 1 || loading} onClick={() => setPage(page - 1)} label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </PageButton>
          <PageButton disabled={page >= pages || loading} onClick={() => setPage(page + 1)} label="Next">
            <ChevronRight className="h-4 w-4" />
          </PageButton>
        </div>
      </div>
    </div>
  );
}

function SortButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1 uppercase hover:text-slate-900 ${active ? "text-indigo-700" : ""}`}>
      {label} <ArrowUpDown className="h-3 w-3" />
    </button>
  );
}

function PageButton({ disabled, onClick, label, children }: { disabled: boolean; onClick: () => void; label: string; children: ReactNode }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}
