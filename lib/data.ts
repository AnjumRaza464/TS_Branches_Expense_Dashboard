import dimensions from "@/data/generated/dimensions.json";
import expenseFacts from "@/data/generated/expense-facts.json";
import workforceFacts from "@/data/generated/workforce-facts.json";
import type {
  DashboardData,
  Dimensions,
  ExpenseFact,
  WorkforceFact,
} from "@/lib/types";

/**
 * Aggregated dashboard data (~330 KB). Imported statically so the page is
 * prerendered at build time; re-run `npm run data` after updating the Excel.
 * The 6 MB ledger detail is NOT included here — see lib/ledger.ts.
 */
export function getDashboardData(): DashboardData {
  return {
    dimensions: dimensions as Dimensions,
    expenseFacts: expenseFacts as unknown as ExpenseFact[],
    workforceFacts: workforceFacts as unknown as WorkforceFact[],
  };
}
