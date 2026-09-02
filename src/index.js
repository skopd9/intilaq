/**
 * Intilaq Worker: static assets from ./public plus /api/apply,
 * which stores cohort applications in the D1 `DB` binding.
 *
 * Cloudflare's default HTML Content-Type omits charset. Without it —
 * and without a <meta charset> in the first bytes — Safari decodes
 * UTF-8 Arabic and punctuation as Windows-1252 (انطلاق → Ø§Ù†Ø·Ù„Ø§Ù‚).
 */
import { handleApply, handleList, json } from "./apply.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/apply") {
      if (request.method === "POST") return handleApply(request, env);
      return json(405, { error: "Use POST." });
    }
    if (url.pathname === "/api/applications") {
      if (request.method === "GET") return handleList(request, env);
      return json(405, { error: "Use GET." });
    }

    const response = await env.ASSETS.fetch(request);
    const type = response.headers.get("Content-Type") || "";
    if (!type.startsWith("text/html") || /charset=/i.test(type)) return response;
    const headers = new Headers(response.headers);
    headers.set("Content-Type", "text/html; charset=utf-8");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
