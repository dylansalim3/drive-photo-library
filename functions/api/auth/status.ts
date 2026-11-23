import { getAccessToken, getRootFolderId } from "../../_lib/drive";
import { appLoginConfigured, googleConfigured, jsonResponse, requireSession } from "../../_lib/http";
import type { PagesContext } from "../../_lib/types";

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const session = await requireSession(context);
  if (typeof session !== "string") {
    return jsonResponse({
      configured: appLoginConfigured(context.env),
      authenticated: false,
      driveConnected: false,
    });
  }
  const rootFolderId = getRootFolderId(context.env);
  if (!googleConfigured(context.env)) {
    return jsonResponse({
      configured: true,
      authenticated: true,
      username: session,
      rootFolderId,
      driveConnected: false,
      driveError: "NOT_CONFIGURED",
    });
  }
  const token = await getAccessToken(context.env);
  return jsonResponse({
    configured: true,
    authenticated: true,
    username: session,
    rootFolderId,
    driveConnected: token !== null,
    ...(token ? {} : { driveError: "DRIVE_NOT_CONNECTED" }),
  });
}
