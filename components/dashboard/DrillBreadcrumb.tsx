"use client";

import { ChevronRight } from "lucide-react";
import type { Model } from "@/lib/analytics";
import { ALL, type Filters } from "@/lib/types";

interface DrillBreadcrumbProps {
  model: Model;
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
}

/** Company › Branch › Expense head › Sub-category — click a level to drill back up. */
export function DrillBreadcrumb({ model, filters, onChange }: DrillBreadcrumbProps) {
  const branch = model.data.dimensions.branches.find((b) => b.code === filters.branch);

  const levels: { label: string; onClick: () => void }[] = [
    {
      label: filters.branchType === ALL ? "All locations" : `All ${filters.branchType} locations`,
      onClick: () => onChange({ branch: ALL, expenseHead: ALL, subCategory: ALL }),
    },
  ];
  if (branch) levels.push({ label: branch.name, onClick: () => onChange({ expenseHead: ALL, subCategory: ALL }) });
  if (filters.expenseHead !== ALL) levels.push({ label: filters.expenseHead, onClick: () => onChange({ subCategory: ALL }) });
  if (filters.subCategory !== ALL) levels.push({ label: filters.subCategory, onClick: () => {} });

  return (
    <nav aria-label="Drill-down path" className="flex flex-wrap items-center gap-1 text-sm">
      {levels.map((level, i) => {
        const last = i === levels.length - 1;
        return (
          <span key={level.label + i} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="h-4 w-4 text-slate-400" />}
            {last ? (
              <span className="rounded-md bg-indigo-50 px-2 py-0.5 font-semibold text-indigo-700">{level.label}</span>
            ) : (
              <button onClick={level.onClick} className="rounded-md px-2 py-0.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900">
                {level.label}
              </button>
            )}
          </span>
        );
      })}
    </nav>
  );
}
