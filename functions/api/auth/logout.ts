import { destroySession, jsonResponse } from "../../_lib/http";
import type { PagesContext } from "../../_lib/types";

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const cookie = await destroySession(context);
  return jsonResponse({ ok: true }, 200, { "Set-Cookie": cookie });
}
