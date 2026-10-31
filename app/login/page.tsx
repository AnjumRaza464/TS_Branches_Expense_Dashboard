import type { Metadata } from "next";
import { Suspense } from "react";
import { ShieldCheck } from "lucide-react";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in · Branch Operations Dashboard" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">BE</div>
          <div>
            <p className="font-semibold text-slate-900">Branch Operations</p>
            <p className="text-xs text-slate-500">Expense Intelligence</p>
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-slate-900">Sign in</h1>
          <p className="mb-5 mt-1 text-sm text-slate-500">Authorised staff only. Sign in with the account you were given.</p>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
        <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400">
          <ShieldCheck className="h-3.5 w-3.5" /> Confidential company data
        </p>
      </div>
    </main>
  );
}
