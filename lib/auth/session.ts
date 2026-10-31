// Stateless session token: base64url(payload).base64url(HMAC-SHA256).
// Uses Web Crypto only, so the same code runs in proxy.ts and on the server.

export const SESSION_COOKIE = "bod_session";
export const SESSION_HOURS = 12;

export interface Session {
  user: string;
  exp: number; // unix ms
}

const encoder = new TextEncoder();

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const bin = atob(text.replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** null when AUTH_SECRET is missing or too short — every check then fails closed. */
async function getKey(): Promise<CryptoKey | null> {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) return null;
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export function isAuthConfigured(): boolean {
  return Boolean(process.env.AUTH_SECRET && process.env.AUTH_SECRET.length >= 32);
}

export async function signSession(user: string): Promise<string | null> {
  const key = await getKey();
  if (!key) return null;
  const payload: Session = { user, exp: Date.now() + SESSION_HOURS * 3600 * 1000 };
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(body)));
  return `${body}.${toBase64Url(sig)}`;
}

export async function verifySessionToken(token: string | undefined): Promise<Session | null> {
  if (!token) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const key = await getKey();
  if (!key) return null;
  try {
    const valid = await crypto.subtle.verify("HMAC", key, fromBase64Url(sig), encoder.encode(body));
    if (!valid) return null;
    const session = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as Session;
    return typeof session.user === "string" && session.exp > Date.now() ? session : null;
  } catch {
    return null;
  }
}
