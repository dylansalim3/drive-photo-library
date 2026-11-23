import {
  getAccessToken,
  getConnectedGoogleUser,
  getRootFolderId,
  getRootFolderName,
} from "../../_lib/drive";
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

  const rootFolderId = await getRootFolderId(context.env);
  const rootFolderName = await getRootFolderName(context.env);

  if (!googleConfigured(context.env)) {
    return jsonResponse({
      configured: true,
      authenticated: true,
      username: userOrResponse.username,
      role: userOrResponse.role,
      rootFolderId,
      rootFolderName,
      driveConnected: false,
      driveError: "NOT_CONFIGURED",
    });
  }

  const token = await getAccessToken(context.env);
  let googleEmail: string | undefined = undefined;
  let googleDisplayName: string | undefined = undefined;

  if (token) {
    try {
      const googleUser = await getConnectedGoogleUser(context.env);
      if (googleUser) {
        googleEmail = googleUser.emailAddress;
        googleDisplayName = googleUser.displayName;
      }
    } catch {
      // ignore
    }
  }

  return jsonResponse({
    configured: true,
    authenticated: true,
    username: userOrResponse.username,
    role: userOrResponse.role,
    rootFolderId,
    rootFolderName,
    googleEmail,
    googleDisplayName,
    driveConnected: token !== null,
    ...(token ? {} : { driveError: "DRIVE_NOT_CONNECTED" }),
  });
}
