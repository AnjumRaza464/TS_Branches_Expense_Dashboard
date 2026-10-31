"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowRight, Eye, EyeOff, LoaderCircle, LockKeyhole, UserRound } from "lucide-react";
import { login, type LoginState } from "./actions";

const INPUT =
  "login-input h-12 w-full rounded-xl border border-white/10 bg-white/[0.06] pl-11 text-sm text-white placeholder:text-slate-500 outline-none transition focus:border-sky-400/60 focus:bg-white/[0.09] focus:ring-4 focus:ring-sky-400/15";

export function LoginForm() {
  const next = useSearchParams().get("next") ?? "/";
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined);
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-slate-300">Username</span>
        <span className="relative block">
          <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            name="username"
            defaultValue={state?.username}
            key={state?.username ?? ""}
            autoComplete="username"
            placeholder="Your username"
            required
            autoFocus
            className={`${INPUT} pr-4`}
          />
        </span>
      </label>
      <label className="block">
        <span className="mb-1.5 block text-xs font-medium text-slate-300">Password</span>
        <span className="relative block">
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <input
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            placeholder="••••••••••"
            required
            className={`${INPUT} pr-12`}
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </span>
      </label>

      {state?.error && (
        <p role="alert" className="flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3.5 py-2.5 text-sm text-rose-200">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="group relative mt-2 inline-flex h-12 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-indigo-500 via-indigo-500 to-sky-500 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:shadow-sky-500/30 disabled:opacity-70"
      >
        <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
        {pending ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" /> Signing in…
          </>
        ) : (
          <>
            Sign in <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </>
        )}
      </button>
    </form>
  );
}
