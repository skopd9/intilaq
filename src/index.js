/**
 * Cloudflare Worker for intilaq.dev.
 *
 * - POST /api/apply and GET /api/applications store and list cohort
 *   applications in D1 (see worker/schema.sql for the table).
 * - Everything else is served from ./public via the ASSETS binding.
 *   Cloudflare's default HTML Content-Type omits charset, and without
 *   it — and without a <meta charset> in the first bytes — Safari
 *   decodes UTF-8 Arabic and punctuation as Windows-1252
 *   (انطلاق → Ø§Ù†Ø·Ù„Ø§Ù‚), so HTML responses get charset=utf-8 forced on.
 */

const MAX_FIELDS = 40;
const MAX_FIELD_LEN = 4000;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/apply" && request.method === "POST") {
      return handleApply(request, env);
    }
    if (url.pathname === "/api/applications" && request.method === "GET") {
      return handleList(request, env);
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

async function handleApply(request, env) {
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }

  const answers = normalizeAnswers(body && body.answers);
  if (!answers) return json({ error: "Malformed application" }, 400);

  const team = fieldValue(answers, "Team name");
  const email = fieldValue(answers, "Founder 1 email");

  await env.DB.prepare(
    "INSERT INTO applications (created_at, team, email, data) VALUES (?, ?, ?, ?)"
  )
    .bind(new Date().toISOString(), team, email, JSON.stringify(answers))
    .run();

  return json({ ok: true });
}

function normalizeAnswers(raw) {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_FIELDS) return null;
  const out = [];
  for (const pair of raw) {
    if (!Array.isArray(pair) || pair.length !== 2) return null;
    const [name, value] = pair;
    if (typeof name !== "string" || typeof value !== "string") return null;
    if (name.length > 200 || value.length > MAX_FIELD_LEN) return null;
    out.push([name, value]);
  }
  return out;
}

function fieldValue(answers, name) {
  const hit = answers.find((p) => p[0] === name);
  return hit ? hit[1] : "";
}

async function handleList(request, env) {
  if (!authorized(request, env)) {
    return new Response("Unauthorized", {
      status: 401,
      headers: { "WWW-Authenticate": 'Bearer realm="Intilaq admin"' },
    });
  }
  const { results } = await env.DB.prepare(
    "SELECT id, created_at, team, email, data FROM applications ORDER BY id DESC"
  ).all();
  return json({ applications: results });
}

function authorized(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const header = request.headers.get("Authorization") || "";
  const expected = "Bearer " + env.ADMIN_PASSWORD;
  return timingSafeEqual(header, expected);
}

function timingSafeEqual(a, b) {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function json(data, status) {
  return new Response(JSON.stringify(data), {
    status: status || 200,
    headers: { "content-type": "application/json" },
  });
}
