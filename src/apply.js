import {
  CREATE_TABLE_SQL,
  FIELDS,
  GET_SQL,
  INDEX_SQL,
  INSERT_SQL,
  LIST_SQL,
  RATE_LIMIT_SQL,
} from "./schema.js";

const MAX_BODY = 100_000;
const MAX_PLAIN = 80_000;
const RATE_PER_HOUR = 8;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^https?:\/\/\S+$/i;
const EMAIL_FIELDS = new Set(["Founder 1 email", "Founder 2 email", "Founder 3 email"]);
const URL_FIELDS = new Set(["Video link"]);

export function json(status, body) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export function normalizeAnswers(raw) {
  if (Array.isArray(raw)) {
    const out = {};
    for (const item of raw) {
      if (Array.isArray(item) && typeof item[0] === "string") out[item[0]] = item[1];
    }
    return out;
  }
  if (raw && typeof raw === "object" && !Array.isArray(raw)) return { ...raw };
  return null;
}

function asText(value) {
  if (value == null) return "";
  return String(value).trim();
}

export function validateApplication(answers, plain) {
  if (!answers || typeof answers !== "object") return { error: "Answers are required." };
  if (typeof plain !== "string") return { error: "Plain-text copy is required." };
  if (plain.length > MAX_PLAIN) return { error: "Application is too long." };

  const row = {};
  const allowed = new Set(FIELDS.map(([name]) => name));
  for (const key of Object.keys(answers)) {
    if (!allowed.has(key)) return { error: "Unknown field: " + key };
  }

  for (const [name, column, required, max] of FIELDS) {
    const value = asText(answers[name]);
    if (required && !value) return { error: name + " is required." };
    if (value.length > max) return { error: name + " is too long." };
    if (value && EMAIL_FIELDS.has(name) && !EMAIL_RE.test(value)) {
      return { error: name + " must be a valid email." };
    }
    if (value && URL_FIELDS.has(name) && !URL_RE.test(value)) {
      return { error: name + " must be a link starting with http." };
    }
    row[column] = value || null;
  }
  return { row };
}

export function clientIp(request) {
  return (
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0].trim() ||
    ""
  );
}

export async function ensureSchema(db) {
  // D1 exec() splits on newlines, so apply each statement with prepare().
  await db.prepare(CREATE_TABLE_SQL).bind().run();
  for (const sql of INDEX_SQL) await db.prepare(sql).bind().run();
}

export async function handleApply(request, env) {
  if (!env.DB) return json(503, { error: "Application database is not configured." });

  const len = Number(request.headers.get("Content-Length") || 0);
  if (len > MAX_BODY) return json(413, { error: "Application is too large." });

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json(400, { error: "Send JSON." });
  }

  const answers = normalizeAnswers(payload.answers);
  const plain = typeof payload.plain === "string" ? payload.plain : "";
  const checked = validateApplication(answers, plain);
  if (checked.error) return json(400, { error: checked.error });

  const ip = clientIp(request);
  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  try {
    await ensureSchema(env.DB);
    if (ip) {
      const count = await env.DB.prepare(RATE_LIMIT_SQL).bind(ip, hourAgo).first();
      if ((count?.n || 0) >= RATE_PER_HOUR) {
        return json(429, { error: "Too many applications from this network. Try again later." });
      }
    }

    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const r = checked.row;
    await env.DB.prepare(INSERT_SQL)
      .bind(
        id,
        createdAt,
        r.team_name,
        r.founder1_name,
        r.founder1_email,
        r.founder1_role,
        r.founder1_affiliation,
        r.founder2_name,
        r.founder2_email,
        r.founder2_role,
        r.founder2_affiliation,
        r.founder3_name,
        r.founder3_email,
        r.who_builds,
        r.links,
        r.seat,
        r.one_line,
        r.what_it_is,
        r.why_you,
        r.metric,
        r.baseline_today,
        r.target_week_12,
        r.how_measured,
        r.who_can_verify,
        r.what_would_fail,
        r.what_exists,
        r.video_link,
        r.demo_or_repo,
        r.hours_per_week,
        r.full_commitment,
        r.equipment_needed,
        r.other_commitments,
        r.how_you_heard,
        r.phone,
        r.anything_else,
        JSON.stringify(answers),
        plain,
        ip || null,
        (request.headers.get("User-Agent") || "").slice(0, 400) || null
      )
      .run();

    return json(201, { ok: true, id });
  } catch (err) {
    console.error("apply insert failed", err);
    return json(500, { error: "Could not save the application." });
  }
}

function adminOk(request, env) {
  const token = env.ADMIN_TOKEN;
  if (!token) return false;
  const header = request.headers.get("Authorization") || "";
  return header === "Bearer " + token;
}

export async function handleList(request, env) {
  if (!env.ADMIN_TOKEN) return json(404, { error: "Not found." });
  if (!adminOk(request, env)) return json(401, { error: "Unauthorized." });
  if (!env.DB) return json(503, { error: "Application database is not configured." });
  await ensureSchema(env.DB);
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (id) {
    const row = await env.DB.prepare(GET_SQL).bind(id).first();
    if (!row) return json(404, { error: "Not found." });
    return json(200, { application: row });
  }
  const { results } = await env.DB.prepare(LIST_SQL).bind().all();
  return json(200, { applications: results || [] });
}
