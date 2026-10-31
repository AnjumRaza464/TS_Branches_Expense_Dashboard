// Categorical colours follow the cost head (fixed order), never its rank, so a
// filter never repaints a series. Slots 1–4 of a CVD-validated palette.
export const HEAD_COLORS: Record<string, string> = {
  "Staff Salaries": "#2a78d6",
  Rent: "#eb6834",
  "Utility Bills": "#1baf7a",
  "Other Expenses": "#eda100",
};

export const headColor = (head: string) => HEAD_COLORS[head] ?? "#94a3b8";

// Chart chrome
export const GRID = "#e2e8f0"; // slate-200
export const AXIS = "#64748b"; // slate-500
export const SERIES_PRIMARY = "#4f46e5"; // indigo-600 — single-series charts
export const SERIES_SECONDARY = "#2a78d6";
