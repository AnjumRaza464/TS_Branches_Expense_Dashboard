# Branch Operations Dashboard

Executive & branch expense dashboard built from
`Branch_Expenses_Consolidated_2017-2026_v7.xlsx` (Next.js 16 App Router · Tailwind v4 · Recharts · Lucide).

## Run

The Excel workbook, `data/generated/` and `.env.local` are **not in this repository** (company data and
secrets). On a new machine: place the workbook in the project root, copy `.env.example` to `.env.local`
and fill in `AUTH_SECRET` + `DASHBOARD_USERS`, then:

```bash
npm install
pip install openpyxl        # once
npm run data                # Excel -> data/generated/*.json  (re-run whenever the Excel changes)
npm run dev                 # http://localhost:3000
```

## Data flow

| Excel tab | Becomes | Used for |
|---|---|---|
| Branch Master | `dimensions.json → branches` | branch list, type, Active/Inactive |
| Data (56,601 rows) | `expense-facts.json` (monthly aggregates) | KPIs, charts, branch/sub-category tables |
| Data (56,601 rows) | `ledger.json` (server only) | `/api/ledger` — voucher-level drill-down (paged) |
| HRIS Headcount Data | `workforce-facts.json` | headcount & payroll by branch × department |

The report tabs (Summary, Branch Yearly, …) are formulas over these raw tabs, so they are recomputed in `lib/analytics.ts` rather than copied.

## Period filter (applies to every tab)

Fiscal-year preset, **From / To month**, and quick ranges (last month / 3M / 6M / 12M / all time).
Comparisons are always *the last ≤12 months of the range vs the same months a year earlier*
(all time → FY 2025-26 vs FY 2024-25; Mar 2026 → Mar 2025). Trend charts and matrices group by
Month / Quarter / FY (automatic by range length, or pick one). Clicking a bar, column header or
matrix cell narrows the period to it.

The full filter state lives in the URL (`?view=monthly&from=2026-01&to=2026-06&branch=QC`) —
use the link button in the header to share a view. There is deliberately no CSV/Excel export,
and `/api/ledger` only returns paged JSON (max 50 rows per request).

## Drill-down

All locations → Branch → Expense head → Sub-category → individual ledger entries (voucher, narration, amount).
Workforce: Branch → HRIS department → monthly headcount & payroll.
The source has no employee names (HRIS export stores counts only), so employee level = headcount per department per month.

## Structure

```
app/page.tsx                 server component, loads aggregated JSON
app/api/ledger/route.ts      paged / filtered ledger entries (no bulk export)
components/dashboard/        Sidebar, FilterBar, KpiCards, SpendTrendChart, CostHeadMix,
                             BranchTable, BreakdownTable, WorkforcePanel, LedgerTable, DashboardShell
lib/types.ts                 data + filter types
lib/analytics.ts             filtering & aggregation (each breakdown ignores its own filter)
lib/ledger.ts                server-side ledger query
scripts/convert_excel.py     Excel -> JSON
```
