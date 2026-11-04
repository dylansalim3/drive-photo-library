import { encryptText } from "../../../_lib/crypto";
import { errorResponse } from "../../../_lib/http";
import type { PagesContext } from "../../../_lib/types";

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const { env, request } = context;
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const origin = url.origin;
  if (!code || !state) {
    return errorResponse("BAD_REQUEST", "Missing OAuth code or state.", 400);
  }
  const stored = await env.DB.prepare("SELECT state FROM oauth_states WHERE state = ?")
    .bind(state)
    .first<{ state: string }>();
  if (!stored) return errorResponse("BAD_REQUEST", "Unknown OAuth state. Start the connection again.", 400);
  await env.DB.prepare("DELETE FROM oauth_states WHERE state = ?").bind(state).run();

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID ?? "",
      client_secret: env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: `${origin}/api/auth/drive/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!response.ok) {
    return errorResponse("DRIVE_CONNECT_FAILED", "Google refused the OAuth code exchange.", 502);
  }
  const tokens = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
  };
  if (!tokens.refresh_token || !env.GOOGLE_CLIENT_SECRET) {
    return errorResponse(
      "DRIVE_CONNECT_FAILED",
      "Google did not return a refresh token. Reconnect and accept offline access.",
      502,
    );
  }
  const access = await encryptText(env.GOOGLE_CLIENT_SECRET, tokens.access_token);
  const refresh = await encryptText(env.GOOGLE_CLIENT_SECRET, tokens.refresh_token);
  const expiresAt = Math.floor(Date.now() / 1000) + Math.max(60, tokens.expires_in - 60);
  await env.DB.prepare(
    `INSERT INTO drive_tokens (id, access_token, refresh_token, expires_at)
     VALUES ('default', ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET access_token = excluded.access_token,
       refresh_token = excluded.refresh_token, expires_at = excluded.expires_at`,
  )
    .bind(access, refresh, expiresAt)
    .run();
  return Response.redirect(`${origin}/`, 302);
}
