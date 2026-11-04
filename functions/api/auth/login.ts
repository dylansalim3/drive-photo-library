import { timingSafeEqual } from "../../_lib/crypto";
import { appLoginConfigured, createSession, errorResponse, jsonResponse } from "../../_lib/http";
import type { PagesContext } from "../../_lib/types";

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { env, request } = context;
  if (!appLoginConfigured(env)) {
    return errorResponse(
      "NOT_CONFIGURED",
      "Login is not configured. Set APP_USER and APP_PASS as Pages secrets and redeploy.",
      503,
    );
  }
  let body: { username?: unknown; password?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorResponse("BAD_REQUEST", "Expected a JSON body with username and password.", 400);
  }
  const username = typeof body.username === "string" ? body.username : "";
  const password = typeof body.password === "string" ? body.password : "";
  const userOk = timingSafeEqual(username, env.APP_USER ?? "");
  const passOk = timingSafeEqual(password, env.APP_PASS ?? "");
  if (!userOk || !passOk) {
    return errorResponse("UNAUTHORIZED", "Wrong username or password.", 401);
  }
  const cookie = await createSession(env, request, username);
  return jsonResponse({ ok: true }, 200, { "Set-Cookie": cookie });
}
