/**
 * Pass-through Worker so the intilaq deploy is never an empty
 * assets-only script. Static files are served from ./public via ASSETS.
 *
 * Cloudflare's default HTML Content-Type omits charset. Without it —
 * and without a <meta charset> in the first bytes — Safari decodes
 * UTF-8 Arabic and punctuation as Windows-1252 (انطلاق → Ø§Ù†Ø·Ù„Ø§Ù‚).
 */
export default {
  async fetch(request, env) {
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
