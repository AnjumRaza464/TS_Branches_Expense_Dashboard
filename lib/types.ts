// ---------------------------------------------------------------------------
// Shapes of the JSON produced by scripts/convert_excel.py
// Facts are compact tuples that reference the lookup tables in Dimensions by
// index, which keeps 56k ledger rows down to ~11k monthly aggregates.
// ---------------------------------------------------------------------------

export type BranchType = "Branch" | "Factory / Office" | "B-Coffee";
export type BranchStatus = "Active" | "Inactive" | "HRIS only";

export interface Branch {
  code: string;
  name: string;
  type: BranchType;
  status: BranchStatus;
  firstMonth: string | null; // "YYYY-MM"
  lastMonth: string | null;
}

export interface Department {
  code: string; // HRIS code, e.g. "SPP"
  name: string; // e.g. "Store, Procurement & Purchase"
}

export interface Dimensions {
  generatedAt: string;
  sourceFile: string;
  months: string[]; // continuous "YYYY-MM" axis; facts store an index into it
  fiscalYears: string[]; // "FY 2017-18" ... (Jul–Jun)
  branches: Branch[];
  expenseHeads: string[];
  subCategories: string[];
  costUnits: string[];
  departments: Department[];
  totals: { spend: number; entries: number };
}

/** [monthIdx, branchIdx, headIdx, subCategoryIdx, costUnitIdx, amountPKR, entries] */
export type ExpenseFact = [number, number, number, number, number, number, number];

/** [monthIdx, branchIdx, departmentIdx, employees, salaryPKR] */
export type WorkforceFact = [number, number, number, number, number];

export interface DashboardData {
  dimensions: Dimensions;
  expenseFacts: ExpenseFact[];
  workforceFacts: WorkforceFact[];
}

// ---------------------------------------------------------------------------
// Filters & drill-down state
// The drill path (branch -> expense head -> sub-category) is part of the same
// filter object, so the global filter bar and the breadcrumb never disagree.
// ---------------------------------------------------------------------------

export const ALL = "all";
export type All = typeof ALL;

export interface Filters {
  /** Inclusive month range, "YYYY-MM". ALL = first / last month in the data. */
  monthFrom: string | All;
  monthTo: string | All;
  branchType: BranchType | All;
  branch: string | All; // branch code
  expenseHead: string | All;
  subCategory: string | All;
  department: string | All; // HRIS department code
}

export const DEFAULT_FILTERS: Filters = {
  monthFrom: ALL,
  monthTo: ALL,
  branchType: ALL,
  branch: ALL,
  expenseHead: ALL,
  subCategory: ALL,
  department: ALL,
};

export const DASHBOARD_VIEWS = ["overview", "alerts", "monthly", "branches", "workforce", "ledger"] as const;
export type DashboardView = (typeof DASHBOARD_VIEWS)[number];

/** Time bucket for trend charts and the monthly matrix. */
export type Grain = "month" | "quarter" | "fiscal-year";

// ---------------------------------------------------------------------------
// Ledger API (/api/ledger)
// ---------------------------------------------------------------------------

export interface LedgerEntry {
  date: string;
  branchCode: string;
  branchName: string;
  expenseHead: string;
  subCategory: string;
  costUnit: string;
  ledgerAccount: string;
  accountCode: string;
  voucher: string;
  narration: string;
  amount: number;
}

export type LedgerSortKey = "date" | "amount";

export interface LedgerResponse {
  rows: LedgerEntry[];
  total: number; // matching rows
  amount: number; // sum of matching rows
  page: number;
  pageSize: number;
}
