import { verifyPassword } from "../../_lib/crypto";
import { errorResponse, jsonResponse, requireSessionUser } from "../../_lib/http";
import type { PagesContext } from "../../_lib/types";
import { findUserByUsername, updateUserPassword } from "../../_lib/users";

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const userOrResponse = await requireSessionUser(context);
  if ("status" in userOrResponse) return userOrResponse;

  let body: { currentPassword?: unknown; newPassword?: unknown };
  try {
    body = (await context.request.json()) as typeof body;
  } catch {
    return errorResponse("BAD_REQUEST", "Expected JSON with currentPassword and newPassword.", 400);
  }

  const currentPassword = typeof body.currentPassword === "string" ? body.currentPassword : "";
  const newPassword = typeof body.newPassword === "string" ? body.newPassword : "";

  if (!currentPassword || !newPassword) {
    return errorResponse("BAD_REQUEST", "Current and new password are required.", 400);
  }

  const user = await findUserByUsername(context.env.DB, userOrResponse.username);
  if (!user) {
    return errorResponse("NOT_FOUND", "User record not found in database.", 404);
  }

  const isCurrentValid = await verifyPassword(currentPassword, user.password_hash, user.salt);
  if (!isCurrentValid) {
    return errorResponse("UNAUTHORIZED", "Current password is incorrect.", 401);
  }

  try {
    await updateUserPassword(context.env.DB, user.username, newPassword);
    return jsonResponse({ ok: true, message: "Password updated successfully." });
  } catch (err) {
    return errorResponse("BAD_REQUEST", err instanceof Error ? err.message : "Failed to update password.", 400);
  }
}
