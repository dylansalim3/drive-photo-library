import { errorResponse, jsonResponse, requireAdmin, requireSessionUser } from "../../_lib/http";
import type { PagesContext } from "../../_lib/types";
import { createUser, hasAnyUsers, listUsers } from "../../_lib/users";

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const userOrResponse = await requireSessionUser(context);
  if ("status" in userOrResponse) return userOrResponse;

  const users = await listUsers(context.env.DB);
  return jsonResponse({ ok: true, users });
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const { env, request } = context;

  const hasUsers = await hasAnyUsers(env.DB);
  // If users already exist in D1, only an admin can create additional users
  if (hasUsers) {
    const adminOrResponse = await requireAdmin(context);
    if ("status" in adminOrResponse) return adminOrResponse;
  }

  let body: { username?: unknown; password?: unknown; role?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return errorResponse("BAD_REQUEST", "Expected JSON with username, password, and optional role.", 400);
  }

  const username = typeof body.username === "string" ? body.username.trim() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = typeof body.role === "string" && body.role === "admin" ? "admin" : "user";

  if (!username || !password) {
    return errorResponse("BAD_REQUEST", "Username and password are required.", 400);
  }

  try {
    const user = await createUser(env.DB, username, password, hasUsers ? role : "admin");
    return jsonResponse({ ok: true, user }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create user.";
    if (message.includes("UNIQUE constraint failed") || message.includes("constraint")) {
      return errorResponse("CONFLICT", `Username '${username}' is already taken.`, 409);
    }
    return errorResponse("BAD_REQUEST", message, 400);
  }
}
