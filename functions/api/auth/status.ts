import { getAccessToken, getRootFolderId } from "../../_lib/drive";
import { appLoginConfigured, googleConfigured, jsonResponse, requireSessionUser } from "../../_lib/http";
import type { PagesContext } from "../../_lib/types";

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const userOrResponse = await requireSessionUser(context);
  const configured = await appLoginConfigured(context.env);

  if ("status" in userOrResponse) {
    return jsonResponse({
      configured,
      authenticated: false,
      driveConnected: false,
    });
  }

  const rootFolderId = getRootFolderId(context.env);
  if (!googleConfigured(context.env)) {
    return jsonResponse({
      configured: true,
      authenticated: true,
      username: userOrResponse.username,
      role: userOrResponse.role,
      rootFolderId,
      driveConnected: false,
      driveError: "NOT_CONFIGURED",
    });
  }

  const token = await getAccessToken(context.env);
  return jsonResponse({
    configured: true,
    authenticated: true,
    username: userOrResponse.username,
    role: userOrResponse.role,
    rootFolderId,
    driveConnected: token !== null,
    ...(token ? {} : { driveError: "DRIVE_NOT_CONNECTED" }),
  });
}
