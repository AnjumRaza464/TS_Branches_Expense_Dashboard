import { Suspense } from "react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { DashboardSkeleton } from "@/components/dashboard/DashboardSkeleton";
import { requireSession } from "@/lib/auth/dal";
import { getDashboardData } from "@/lib/data";

// The data is only rendered after the session is verified here, next to the
// data (proxy.ts is just a fast first gate). Ledger detail is fetched on demand
// from /api/ledger, which checks the session too.
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <ProtectedDashboard />
    </Suspense>
  );
}

async function ProtectedDashboard() {
  const session = await requireSession();
  return <DashboardShell data={getDashboardData()} user={session.user} />;
}
