"use client";

import { useActionState, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { login, type LoginState } from "./actions";

export function LoginForm() {
  const next = useSearchParams().get("next") ?? "/";
  const [state, action, pending] = useActionState<LoginState, FormData>(login, undefined);
  const [show, setShow] = useState(false);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">Username</span>
        <input
          name="username"
          defaultValue={state?.username}
          key={state?.username ?? ""}
          autoComplete="username"
          required
          autoFocus
          className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-600">Password</span>
        <span className="relative block">
          <input
            name="password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            className="h-10 w-full rounded-lg border border-slate-200 pl-3 pr-10 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
          />
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Hide password" : "Show password"}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 hover:text-slate-700"
          >
            {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </span>
      </label>

      {state?.error && (
        <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
      >
        <LockKeyhole className="h-4 w-4" />
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
