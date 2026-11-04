import { errorResponse, googleConfigured, requireSession } from "../../../_lib/http";
import type { PagesContext } from "../../../_lib/types";

export async function onRequestGet(context: PagesContext): Promise<Response> {
  const session = await requireSession(context);
  if (typeof session !== "string") return session;
  if (!googleConfigured(context.env)) {
    return errorResponse(
      "NOT_CONFIGURED",
      "Google credentials are not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET as Pages secrets and redeploy.",
      503,
    );
  }
  const state = crypto.randomUUID();
  await context.env.DB.prepare("INSERT INTO oauth_states (state, created_at) VALUES (?, ?)")
    .bind(state, Math.floor(Date.now() / 1000))
    .run();
  const origin = new URL(context.request.url).origin;
  const params = new URLSearchParams({
    client_id: context.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: `${origin}/api/auth/drive/callback`,
    response_type: "code",
    // Full Drive scope is needed because photos batch-uploaded outside this
    // app must still be readable here; drive.file alone only sees app files.
    scope: "https://www.googleapis.com/auth/drive",
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, 302);
}
