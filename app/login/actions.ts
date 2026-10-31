"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { hasUsers, verifyCredentials } from "@/lib/auth/dal";
import { isAuthConfigured, SESSION_COOKIE, SESSION_HOURS, signSession } from "@/lib/auth/session";

export type LoginState = { error: string; username?: string } | undefined;

// Brute-force protection: per username + IP, in memory (per server instance)
const MAX_FAILURES = 5;
const LOCK_MS = 10 * 60 * 1000;
const failures = new Map<string, { count: number; until: number }>();

/** Only allow same-site relative paths after login (no open redirects). */
function safeNext(value: FormDataEntryValue | null): string {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : "/";
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!isAuthConfigured() || !hasUsers()) {
    return { error: "Login is not configured on the server. Set AUTH_SECRET and DASHBOARD_USERS in .env.local." };
  }

  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `${username.toLowerCase()}|${ip}`;

  const record = failures.get(key);
  if (record && record.until > Date.now()) {
    const minutes = Math.ceil((record.until - Date.now()) / 60000);
    return { error: `Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`, username };
  }

  const user = username && password ? verifyCredentials(username, password) : null;
  if (!user) {
    const count = (record && record.until <= Date.now() && record.count >= MAX_FAILURES ? 0 : (record?.count ?? 0)) + 1;
    failures.set(key, { count, until: count >= MAX_FAILURES ? Date.now() + LOCK_MS : 0 });
    await new Promise((r) => setTimeout(r, 500)); // slow down guessing
    return { error: "Invalid username or password.", username };
  }

  failures.delete(key);
  const token = await signSession(user);
  if (!token) return { error: "Login is not configured on the server." };

  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
  redirect(safeNext(formData.get("next")));
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
