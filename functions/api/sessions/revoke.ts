import { sha256Hex } from "../../_lib/crypto";
import { errorResponse, jsonResponse, parseCookies, requireSessionUser } from "../../_lib/http";
import type { PagesContext } from "../../_lib/types";

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const userOrResponse = await requireSessionUser(context);
  if ("status" in userOrResponse) return userOrResponse;

  const cookieToken = parseCookies(context.request)["dpl_session"];
  const currentTokenHash = cookieToken ? await sha256Hex(cookieToken) : "";

  let body: { tokenHashPrefix?: unknown; revokeAllOthers?: unknown; username?: unknown };
  try {
    body = (await context.request.json()) as typeof body;
  } catch {
    return errorResponse("BAD_REQUEST", "Expected JSON request body.", 400);
  }

  const isAdmin = userOrResponse.role === "admin";
  const revokeAllOthers = Boolean(body.revokeAllOthers);
  const prefix = typeof body.tokenHashPrefix === "string" ? body.tokenHashPrefix.trim() : "";
  const targetUsername = typeof body.username === "string" ? body.username.trim() : userOrResponse.username;

  if (revokeAllOthers) {
    // Revoke all sessions for this user except current
    if (!isAdmin && targetUsername.toLowerCase() !== userOrResponse.username.toLowerCase()) {
      return errorResponse("FORBIDDEN", "You can only revoke your own sessions.", 403);
    }

    await context.env.DB
      .prepare("DELETE FROM sessions WHERE username = ? COLLATE NOCASE AND token_hash != ?")
      .bind(targetUsername, currentTokenHash)
      .run();

    return jsonResponse({ ok: true, message: "All other sessions have been revoked." });
  }

  if (prefix) {
    if (prefix.length < 6) {
      return errorResponse("BAD_REQUEST", "Token prefix must be at least 6 characters.", 400);
    }

    if (isAdmin) {
      await context.env.DB
        .prepare("DELETE FROM sessions WHERE token_hash LIKE ?")
        .bind(`${prefix}%`)
        .run();
    } else {
      await context.env.DB
        .prepare("DELETE FROM sessions WHERE username = ? COLLATE NOCASE AND token_hash LIKE ?")
        .bind(userOrResponse.username, `${prefix}%`)
        .run();
    }

    return jsonResponse({ ok: true, message: "Session revoked." });
  }

  return errorResponse("BAD_REQUEST", "Specify tokenHashPrefix or revokeAllOthers: true.", 400);
}
