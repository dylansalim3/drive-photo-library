import { sha256Hex } from "./crypto";
import type { Env, PagesContext } from "./types";
import { findUserByUsername, hasAnyUsers } from "./users";

export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

export function errorResponse(code: string, message: string, status: number): Response {
  return jsonResponse({ error: code, message }, status);
}

export function parseCookies(request: Request): Record<string, string> {
  const header = request.headers.get("Cookie") ?? "";
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index > 0) out[part.slice(0, index).trim()] = decodeURIComponent(part.slice(index + 1).trim());
  }
  return out;
}

function sessionCookieHeader(request: Request, token: string, maxAge: number): string {
  const secure = new URL(request.url).protocol === "https:";
  return [
    `dpl_session=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${maxAge}`,
    ...(secure ? ["Secure"] : []),
  ].join("; ");
}

export async function createSession(env: Env, request: Request, username: string): Promise<string> {
  const token = `${crypto.randomUUID()}-${crypto.randomUUID()}`;
  const tokenHash = await sha256Hex(token);
  const expiresAt = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;
  await env.DB.prepare(
    "INSERT INTO sessions (token_hash, username, expires_at) VALUES (?, ?, ?)",
  )
    .bind(tokenHash, username, expiresAt)
    .run();
  return sessionCookieHeader(request, token, 7 * 24 * 60 * 60);
}

export async function requireSession(context: PagesContext): Promise<string | Response> {
  const token = parseCookies(context.request)["dpl_session"];
  if (!token) return errorResponse("UNAUTHORIZED", "Sign in to use this API.", 401);
  const tokenHash = await sha256Hex(token);
  const now = Math.floor(Date.now() / 1000);
  const row = await context.env.DB.prepare(
    "SELECT username FROM sessions WHERE token_hash = ? AND expires_at > ?",
  )
    .bind(tokenHash, now)
    .first<{ username: string }>();
  if (!row) return errorResponse("UNAUTHORIZED", "Session expired. Sign in again.", 401);
  return row.username;
}

export interface SessionUser {
  username: string;
  role: string;
}

export async function requireSessionUser(context: PagesContext): Promise<SessionUser | Response> {
  const usernameOrResponse = await requireSession(context);
  if (typeof usernameOrResponse !== "string") return usernameOrResponse;

  const user = await findUserByUsername(context.env.DB, usernameOrResponse);
  return {
    username: usernameOrResponse,
    role: user?.role ?? (usernameOrResponse === context.env.APP_USER ? "admin" : "user"),
  };
}

export async function requireAdmin(context: PagesContext): Promise<SessionUser | Response> {
  const userOrResponse = await requireSessionUser(context);
  if ("status" in userOrResponse) return userOrResponse;
  if (userOrResponse.role !== "admin") {
    return errorResponse("FORBIDDEN", "Admin privilege required for this action.", 403);
  }
  return userOrResponse;
}

export async function destroySession(context: PagesContext): Promise<string> {
  const token = parseCookies(context.request)["dpl_session"];
  if (token) {
    const tokenHash = await sha256Hex(token);
    await context.env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(tokenHash).run();
  }
  return "dpl_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0";
}

export async function appLoginConfigured(env: Env): Promise<boolean> {
  if (Boolean(env.APP_USER && env.APP_PASS)) return true;
  return hasAnyUsers(env.DB);
}

export function googleConfigured(env: Env): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
}
