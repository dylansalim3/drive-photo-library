import { errorResponse, jsonResponse, requireAdmin } from "../../_lib/http";
import type { PagesContext } from "../../_lib/types";
import { deleteUser } from "../../_lib/users";

export async function onRequestDelete(context: PagesContext): Promise<Response> {
  const adminOrResponse = await requireAdmin(context);
  if ("status" in adminOrResponse) return adminOrResponse;

  const idParam = context.params.id;
  const idStr = Array.isArray(idParam) ? idParam[0] : idParam;
  const id = parseInt(idStr ?? "", 10);

  if (isNaN(id) || id <= 0) {
    return errorResponse("BAD_REQUEST", "Invalid user ID.", 400);
  }

  // Check if trying to delete self
  const target = await context.env.DB
    .prepare("SELECT username FROM users WHERE id = ?")
    .bind(id)
    .first<{ username: string }>();

  if (!target) {
    return errorResponse("NOT_FOUND", "User not found.", 404);
  }

  if (target.username.toLowerCase() === adminOrResponse.username.toLowerCase()) {
    return errorResponse("BAD_REQUEST", "You cannot delete your own account.", 400);
  }

  try {
    await deleteUser(context.env.DB, id);
    return jsonResponse({ ok: true, message: `User ${target.username} deleted.` });
  } catch (err) {
    return errorResponse("BAD_REQUEST", err instanceof Error ? err.message : "Failed to delete user.", 400);
  }
}
