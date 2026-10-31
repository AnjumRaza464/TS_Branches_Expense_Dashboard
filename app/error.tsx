"use client"; // Error boundaries must be Client Components

import { useEffect } from "react";

export default function DashboardError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">The dashboard could not load</h2>
        <p className="mt-2 text-sm text-slate-500">
          If you just updated the Excel file, run <code className="rounded bg-slate-100 px-1">npm run data</code> and try again.
        </p>
        <button onClick={() => retry()} className="mt-5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
          Try again
        </button>
      </div>
    </div>
  );
}
