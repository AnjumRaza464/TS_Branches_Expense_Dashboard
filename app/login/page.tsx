import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { BellRing, Building2, Layers, ShieldCheck, Users } from "lucide-react";
import { BarField } from "./BarField";
import { LoginForm } from "./LoginForm";
import logo from "@/public/brand/logo.png";

export const metadata: Metadata = { title: "Sign in · Black and Brown Bakers" };

const FEATURES = [
  { icon: Building2, title: "Every branch, every month", text: "Spend by location, cost head and period" },
  { icon: BellRing, title: "Exceptions surface themselves", text: "Missing months, unusual spend, misbookings" },
  { icon: Users, title: "Payroll & staff by department", text: "HRIS headcount and salary, month by month" },
  { icon: Layers, title: "Drill to the voucher", text: "From company total to a single ledger entry" },
];

export default function LoginPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0b1024] text-white">
      {/* Background: glows + interactive 3D bar field */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-indigo-600/25 blur-[120px]" />
        <div className="absolute -bottom-48 right-0 h-[560px] w-[560px] rounded-full bg-sky-500/15 blur-[130px]" />
        <div className="absolute left-1/3 top-1/2 h-[380px] w-[380px] rounded-full bg-emerald-500/10 blur-[120px]" />
      </div>
      <BarField />
      {/* Keeps the text readable over the bars */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0b1024]/80 via-transparent to-[#0b1024]/90 lg:bg-gradient-to-r lg:from-[#0b1024]/10 lg:via-[#0b1024]/20 lg:to-[#0b1024]/85"
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 hidden h-1/2 bg-gradient-to-b from-[#0b1024]/75 to-transparent lg:block" />

      <div className="pointer-events-none relative z-10 mx-auto grid min-h-screen max-w-7xl grid-cols-1 items-center gap-10 px-4 py-10 sm:px-8 lg:grid-cols-[1fr_440px] lg:gap-16">
        {/* Brand & value */}
        <section className="hidden self-stretch lg:flex lg:flex-col lg:justify-between lg:py-6">
          <Brand />
          <div className="max-w-lg">
            <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-sky-200 backdrop-blur">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Expense intelligence · FY 2017 – today
            </p>
            <h2 className="text-4xl font-semibold leading-tight tracking-tight xl:text-5xl">
              Every rupee, every branch,{" "}
              <span className="bg-gradient-to-r from-indigo-300 via-sky-300 to-emerald-300 bg-clip-text text-transparent">in one view.</span>
            </h2>
            <p className="mt-4 max-w-md text-base text-slate-300">
              Track spend across locations and cost heads, spot exceptions early and follow any number down to the entry behind it.
            </p>
          </div>
          <ul className="grid max-w-xl grid-cols-2 gap-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <li key={title} className="rounded-xl border border-white/10 bg-white/[0.04] p-3.5 backdrop-blur-md">
                <Icon className="mb-2 h-4 w-4 text-sky-300" />
                <p className="text-sm font-medium text-white">{title}</p>
                <p className="mt-0.5 text-xs text-slate-400">{text}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Sign-in card */}
        <section className="pointer-events-auto w-full max-w-md justify-self-center lg:max-w-none">
          <div className="mb-8 lg:hidden">
            <Brand />
          </div>
          <div className="relative rounded-2xl bg-gradient-to-b from-white/20 via-white/5 to-white/10 p-px shadow-2xl shadow-indigo-950/60">
            <div className="rounded-2xl bg-[#0e1430]/80 p-7 backdrop-blur-2xl sm:p-8">
              <div className="mb-6">
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-sky-500 shadow-lg shadow-indigo-500/30">
                  <ShieldCheck className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
                <p className="mt-1.5 text-sm text-slate-400">Sign in with the account you were given. Authorised staff only.</p>
              </div>
              <Suspense>
                <LoginForm />
              </Suspense>
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" /> Confidential company data
            </span>
            <span className="hidden h-3 w-px bg-white/15 sm:block" />
            <span>No exports · session expires after 12 hours</span>
          </div>
        </section>
      </div>
    </main>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-3">
      <Image src={logo} alt="Black and Brown Bakers logo" width={48} height={48} preload className="h-12 w-12 shrink-0 drop-shadow-[0_6px_18px_rgba(237,24,70,0.35)]" />
      <div>
        <p className="font-semibold leading-tight text-white">Black and Brown Bakers</p>
        <p className="text-xs text-slate-400">Expense Intelligence</p>
      </div>
    </div>
  );
}
