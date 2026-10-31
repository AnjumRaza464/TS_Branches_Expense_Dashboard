import { readFile } from "node:fs/promises";
import path from "node:path";
import dimensions from "@/data/generated/dimensions.json";
import type { Dimensions, LedgerEntry, LedgerSortKey } from "@/lib/types";

/** [date, branchIdx, headIdx, subIdx, unitIdx, ledgerIdx, accountCode, voucher, narration, amount] */
type LedgerRow = [string, number, number, number, number, number, string, string, string, number];

interface LedgerFile {
  ledgerAccounts: string[];
  rows: LedgerRow[];
}

const dims = dimensions as Dimensions;
const LEDGER_PATH = path.join(process.cwd(), "data", "generated", "ledger.json");

// 6 MB file: read once per server instance, then reuse.
let cache: Promise<LedgerFile> | null = null;
function loadLedger(): Promise<LedgerFile> {
  cache ??= readFile(LEDGER_PATH, "utf-8").then((text) => JSON.parse(text) as LedgerFile);
  return cache;
}

export interface LedgerQuery {
  monthFrom?: string; // "YYYY-MM", inclusive
  monthTo?: string;
  branchType?: string;
  branch?: string;
  expenseHead?: string;
  subCategory?: string;
  costUnit?: string;
  search?: string;
  sort: LedgerSortKey;
  dir: "asc" | "desc";
  page: number;
  pageSize: number;
}

function toEntry(row: LedgerRow, accounts: string[]): LedgerEntry {
  const [date, b, h, sub, unit, ledger, accountCode, voucher, narration, amount] = row;
  const branch = dims.branches[b];
  return {
    date,
    branchCode: branch.code,
    branchName: branch.name,
    expenseHead: dims.expenseHeads[h],
    subCategory: dims.subCategories[sub],
    costUnit: dims.costUnits[unit],
    ledgerAccount: accounts[ledger],
    accountCode,
    voucher,
    narration,
    amount,
  };
}

/** Filter, sort and page the ledger. Always returns a single page. */
export async function queryLedger(q: LedgerQuery) {
  const { rows, ledgerAccounts } = await loadLedger();
  const idx = (values: string[], v?: string) => (v ? values.indexOf(v) : -1);
  const branch = q.branch ? dims.branches.findIndex((b) => b.code === q.branch) : -1;
  const head = idx(dims.expenseHeads, q.expenseHead);
  const sub = idx(dims.subCategories, q.subCategory);
  const unit = idx(dims.costUnits, q.costUnit);
  const search = q.search?.trim().toLowerCase();

  const matches = rows.filter((r) => {
    const month = r[0].slice(0, 7);
    if (q.monthFrom && month < q.monthFrom) return false;
    if (q.monthTo && month > q.monthTo) return false;
    if (q.branchType && dims.branches[r[1]].type !== q.branchType) return false;
    if (q.branch && r[1] !== branch) return false;
    if (q.expenseHead && r[2] !== head) return false;
    if (q.subCategory && r[3] !== sub) return false;
    if (q.costUnit && r[4] !== unit) return false;
    if (search) {
      const text = `${r[7]} ${r[8]} ${ledgerAccounts[r[5]]} ${r[6]}`.toLowerCase();
      if (!text.includes(search)) return false;
    }
    return true;
  });

  const sign = q.dir === "asc" ? 1 : -1;
  matches.sort((a, b) =>
    q.sort === "amount" ? sign * (a[9] - b[9]) : sign * a[0].localeCompare(b[0]),
  );

  const amount = matches.reduce((sum, r) => sum + r[9], 0);
  const slice = matches.slice((q.page - 1) * q.pageSize, q.page * q.pageSize);

  return {
    rows: slice.map((r) => toEntry(r, ledgerAccounts)),
    total: matches.length,
    amount: Math.round(amount * 100) / 100,
    page: q.page,
    pageSize: q.pageSize,
  };
}
