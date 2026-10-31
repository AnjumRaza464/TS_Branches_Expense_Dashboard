import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, timingSafeEqual } from "node:crypto";
import { SESSION_COOKIE, verifySessionToken, type Session } from "./session";

/** Current session from the cookie, verified. Memoised per request. */
export const getSession = cache(async (): Promise<Session | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return verifySessionToken(token);
});

/** Use next to any data access: redirects to /login when there is no valid session. */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/**
 * Users come from the DASHBOARD_USERS env var: "name:password,name2:password2".
 * Passwords never reach the client and are compared in constant time.
 */
function users(): Map<string, string> {
  const map = new Map<string, string>();
  for (const pair of (process.env.DASHBOARD_USERS ?? "").split(",")) {
    const i = pair.indexOf(":");
    if (i > 0) map.set(pair.slice(0, i).trim().toLowerCase(), pair.slice(i + 1));
  }
  return map;
}

const digest = (v: string) => createHash("sha256").update(v).digest();

export function hasUsers(): boolean {
  return users().size > 0;
}

export function verifyCredentials(username: string, password: string): string | null {
  const name = username.trim().toLowerCase();
  const expected = users().get(name);
  // Compare even for unknown users so timing doesn't reveal valid usernames
  const ok = timingSafeEqual(digest(password), digest(expected ?? "\u0000invalid"));
  return ok && expected !== undefined ? name : null;
}
