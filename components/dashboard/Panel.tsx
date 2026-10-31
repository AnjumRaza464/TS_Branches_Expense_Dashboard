import type { ReactNode } from "react";

interface PanelProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}

export function Panel({ title, subtitle, actions, children, className = "", bodyClassName = "p-5" }: PanelProps) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white shadow-sm print:break-inside-avoid print:shadow-none ${className}`}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
      </header>
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-500">
      {message}
    </div>
  );
}


/**
 * Keyboard access for clickable table rows: a real button in the first cell.
 * It has no handler of its own — Enter/Space fire a click that bubbles to the
 * row's onClick, so mouse and keyboard share one code path.
 */
export function RowAction({ label, children }: { label: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      className="rounded text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
    >
      {children}
    </button>
  );
}
