const Block = ({ className }: { className: string }) => <div className={`animate-pulse rounded-xl bg-slate-200/70 ${className}`} />;

/** Prerendered placeholder shown until the client dashboard mounts. */
export function DashboardSkeleton() {
  return (
    <div className="flex min-h-screen bg-slate-50" aria-busy="true" aria-label="Loading dashboard">
      <div className="hidden w-72 shrink-0 bg-slate-900 lg:block" />
      <div className="flex-1 space-y-6 px-4 py-6 sm:px-6 lg:px-8">
        <Block className="h-10 w-72" />
        <Block className="h-44" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }, (_, i) => (
            <Block key={i} className="h-28" />
          ))}
        </div>
        <div className="grid gap-6 xl:grid-cols-3">
          <Block className="h-96 xl:col-span-2" />
          <Block className="h-96" />
        </div>
      </div>
    </div>
  );
}
