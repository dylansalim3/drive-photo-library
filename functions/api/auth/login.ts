import { timingSafeEqual, verifyPassword } from "../../_lib/crypto";
import { appLoginConfigured, createSession, errorResponse, jsonResponse } from "../../_lib/http";
import type { PagesContext } from "../../_lib/types";
import { createUser, findUserByUsername } from "../../_lib/users";

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { env, request } = context;

  const configured = await appLoginConfigured(env);
  if (!configured) {
    return errorResponse(
      "NOT_CONFIGURED",
      "Login is not configured. Add a user in D1 or set APP_USER and APP_PASS.",
      503,
    );
  }

  let body: { username?: unknown; password?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorResponse("BAD_REQUEST", "Expected a JSON body with username and password.", 400);
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";

  if (!username || !password) {
    return errorResponse("BAD_REQUEST", "Username and password are required.", 400);
  }

  // 1. Check D1 users table
  const user = await findUserByUsername(env.DB, username);
  if (user) {
    const isPassValid = await verifyPassword(password, user.password_hash, user.salt);
    if (!isPassValid) {
      return errorResponse("UNAUTHORIZED", "Wrong username or password.", 401);
    }
    const cookie = await createSession(env, request, user.username);
    return jsonResponse(
      { ok: true, user: { id: user.id, username: user.username, role: user.role } },
      200,
      { "Set-Cookie": cookie },
    );
  }

  // 2. Fallback to env APP_USER and APP_PASS
  const envUser = env.APP_USER ?? "";
  const envPass = env.APP_PASS ?? "";
  const userOk = timingSafeEqual(username, envUser);
  const passOk = timingSafeEqual(password, envPass);

  if (userOk && passOk && envUser) {
    // Auto-bootstrap into D1 as admin if not already present
    try {
      await createUser(env.DB, envUser, envPass, "admin");
    } catch {
      // already exists or failed, continue
    }
    const cookie = await createSession(env, request, envUser);
    return jsonResponse(
      { ok: true, user: { username: envUser, role: "admin" } },
      200,
      { "Set-Cookie": cookie },
    );
  }

  return errorResponse("UNAUTHORIZED", "Wrong username or password.", 401);
}
