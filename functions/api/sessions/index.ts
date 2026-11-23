import { sha256Hex } from "../../_lib/crypto";
import { errorResponse, jsonResponse, parseCookies, requireSessionUser } from "../../_lib/http";
import type { PagesContext } from "../../_lib/types";

export interface SessionItem {
  tokenHashPrefix: string;
  username: string;
  expiresAt: number;
  isCurrent: boolean;
}

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const userOrResponse = await requireSessionUser(context);
  if ("status" in userOrResponse) return userOrResponse;

  const cookieToken = parseCookies(context.request)["dpl_session"];
  const currentTokenHash = cookieToken ? await sha256Hex(cookieToken) : "";
  const now = Math.floor(Date.now() / 1000);

  const isAdmin = userOrResponse.role === "admin";

  let query: string;
  let params: unknown[];

  if (isAdmin) {
    query = "SELECT token_hash, username, expires_at FROM sessions WHERE expires_at > ? ORDER BY expires_at DESC";
    params = [now];
  } else {
    query = "SELECT token_hash, username, expires_at FROM sessions WHERE username = ? AND expires_at > ? ORDER BY expires_at DESC";
    params = [userOrResponse.username, now];
  }

  const { results } = await context.env.DB
    .prepare(query)
    .bind(...params)
    .all<{ token_hash: string; username: string; expires_at: number }>();

  const sessions: SessionItem[] = (results ?? []).map((row) => ({
    tokenHashPrefix: row.token_hash.slice(0, 12),
    username: row.username,
    expiresAt: row.expires_at,
    isCurrent: row.token_hash === currentTokenHash,
  }));

  return jsonResponse({ ok: true, sessions });
}
