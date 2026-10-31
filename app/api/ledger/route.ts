import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/dal";
import { queryLedger } from "@/lib/ledger";
import type { LedgerResponse, LedgerSortKey } from "@/lib/types";

/**
 * GET /api/ledger — individual ledger entries for the drill-down.
 * Query: monthFrom, monthTo (YYYY-MM), branchType, branch, expenseHead, subCategory, costUnit,
 *        q (search), sort=date|amount, dir=asc|desc, page, pageSize (max 50)
 * Paged JSON only — there is deliberately no bulk / CSV export.
 */
export async function GET(request: NextRequest) {
  if (!(await getSession())) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const p = request.nextUrl.searchParams;
  const opt = (key: string) => p.get(key) || undefined;

  const result = await queryLedger({
    monthFrom: opt("monthFrom"),
    monthTo: opt("monthTo"),
    branchType: opt("branchType"),
    branch: opt("branch"),
    expenseHead: opt("expenseHead"),
    subCategory: opt("subCategory"),
    costUnit: opt("costUnit"),
    search: opt("q"),
    sort: (p.get("sort") === "amount" ? "amount" : "date") satisfies LedgerSortKey,
    dir: p.get("dir") === "asc" ? "asc" : "desc",
    page: Math.max(1, Number(p.get("page")) || 1),
    pageSize: Math.min(50, Math.max(1, Number(p.get("pageSize")) || 25)),
  });

  return Response.json(result satisfies LedgerResponse);
}
