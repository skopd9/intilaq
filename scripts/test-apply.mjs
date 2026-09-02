import { test } from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SCHEMA_SQL, FIELDS } from "../src/schema.js";
import {
  handleApply,
  handleList,
  normalizeAnswers,
  validateApplication,
} from "../src/apply.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function wrapSqlite(db) {
  return {
    exec(sql) {
      db.exec(sql);
    },
    prepare(sql) {
      return {
        bind(...args) {
          const bound = args.map((v) => (v === undefined ? null : v));
          return {
            async run() {
              db.prepare(sql).run(...bound);
              return { success: true };
            },
            async first() {
              return db.prepare(sql).get(...bound) || null;
            },
            async all() {
              return { results: db.prepare(sql).all(...bound) };
            },
          };
        },
      };
    },
  };
}

function sampleAnswers(over = {}) {
  return {
    "Team name": "Gridlab",
    "Founder 1 name": "Ada Khoury",
    "Founder 1 email": "ada@example.com",
    "Founder 1 role": "firmware and the test rig",
    "Founder 1 affiliation": "LAU · current undergraduate",
    "Founder 2 name": "Sam Nassar",
    "Founder 2 email": "sam@example.com",
    "Founder 2 role": "controls",
    "Founder 2 affiliation": "LAU · graduated within 3 years",
    "Founder 3 name": "",
    "Founder 3 email": "",
    "Who builds it": "Ada — two inverter benches last year",
    Links: "https://github.com/example",
    Seat: "Seat 01 · Energy",
    "One line": "Cut facility kWh without slowing the line",
    "What it is": "A meter-side controller for live industrial loads.",
    "Why you": "We already have access to a factory floor.",
    Metric: "Energy per shift, in kWh",
    "Baseline today": "410 kWh",
    "Target at week 12": "280 kWh",
    "How it is measured": "Utility meter plus our logger, same feeder.",
    "Who can verify": "The plant electrician, named.",
    "What would make you fail": "If the line speed drops we fail.",
    "What exists": "A bench prototype on one motor.",
    "Video link": "https://youtu.be/example",
    "Demo or repo": "",
    "Hours per week": "20 to 35",
    "Full commitment": "Yes, all of us",
    "Equipment needed": "A power analyser and a spare VFD.",
    "Other commitments": "",
    "How you heard": "LAU mailing list",
    Phone: "+96170000000",
    "Anything else": "",
    ...over,
  };
}

function samplePlain() {
  return "INTILAQ · COHORT ONE APPLICATION\nGridlab";
}

test("migration SQL matches the Worker schema", () => {
  const migration = readFileSync(join(root, "migrations/0001_create_applications.sql"), "utf8");
  for (const col of FIELDS.map(([, column]) => column)) {
    assert.match(SCHEMA_SQL, new RegExp("\\b" + col + "\\b"));
    assert.match(migration, new RegExp("\\b" + col + "\\b"));
  }
});

test("normalizeAnswers accepts objects and pairs", () => {
  assert.deepEqual(normalizeAnswers({ "Team name": "A" }), { "Team name": "A" });
  assert.deepEqual(normalizeAnswers([["Team name", "A"], ["Seat", "Open"]]), {
    "Team name": "A",
    Seat: "Open",
  });
  assert.equal(normalizeAnswers(null), null);
});

test("validateApplication requires the form fields", () => {
  const ok = validateApplication(sampleAnswers(), samplePlain());
  assert.equal(ok.error, undefined);
  assert.equal(ok.row.team_name, "Gridlab");
  assert.equal(ok.row.founder1_email, "ada@example.com");

  const missing = validateApplication(sampleAnswers({ "Team name": "" }), samplePlain());
  assert.match(missing.error, /Team name/);

  const badEmail = validateApplication(sampleAnswers({ "Founder 1 email": "nope" }), samplePlain());
  assert.match(badEmail.error, /email/);

  const badUrl = validateApplication(sampleAnswers({ "Video link": "ftp://x" }), samplePlain());
  assert.match(badUrl.error, /link/);

  const unknown = validateApplication({ ...sampleAnswers(), Extra: "x" }, samplePlain());
  assert.match(unknown.error, /Unknown/);
});

test("POST /api/apply stores every field", async () => {
  const sqlite = new DatabaseSync(":memory:");
  const env = { DB: wrapSqlite(sqlite) };
  const answers = sampleAnswers();
  const request = new Request("https://intilaq.dev/api/apply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "CF-Connecting-IP": "203.0.113.8",
      "User-Agent": "test-suite",
    },
    body: JSON.stringify({ answers, plain: samplePlain() }),
  });

  const res = await handleApply(request, env);
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.match(body.id, /^[0-9a-f-]{36}$/);

  const row = sqlite.prepare("SELECT * FROM applications WHERE id = ?").get(body.id);
  assert.equal(row.team_name, "Gridlab");
  assert.equal(row.founder1_name, "Ada Khoury");
  assert.equal(row.founder1_email, "ada@example.com");
  assert.equal(row.founder2_name, "Sam Nassar");
  assert.equal(row.seat, "Seat 01 · Energy");
  assert.equal(row.one_line, "Cut facility kWh without slowing the line");
  assert.equal(row.metric, "Energy per shift, in kWh");
  assert.equal(row.phone, "+96170000000");
  assert.equal(row.ip, "203.0.113.8");
  const stored = JSON.parse(row.answers_json);
  for (const [name] of FIELDS) {
    assert.equal(stored[name], answers[name]);
  }
  assert.match(row.plain_text, /Gridlab/);
});

test("POST /api/apply rejects a partial form", async () => {
  const sqlite = new DatabaseSync(":memory:");
  const env = { DB: wrapSqlite(sqlite) };
  const request = new Request("https://intilaq.dev/api/apply", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers: { "Team name": "Only" }, plain: "x" }),
  });
  const res = await handleApply(request, env);
  assert.equal(res.status, 400);
  assert.equal(sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='applications'").get(), undefined);
});

test("POST /api/apply rate-limits a noisy IP", async () => {
  const sqlite = new DatabaseSync(":memory:");
  const env = { DB: wrapSqlite(sqlite) };
  const make = () =>
    new Request("https://intilaq.dev/api/apply", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "CF-Connecting-IP": "198.51.100.4",
      },
      body: JSON.stringify({ answers: sampleAnswers(), plain: samplePlain() }),
    });
  for (let i = 0; i < 8; i++) {
    const res = await handleApply(make(), env);
    assert.equal(res.status, 201, "insert " + (i + 1));
  }
  const blocked = await handleApply(make(), env);
  assert.equal(blocked.status, 429);
});

test("GET /api/applications requires the admin token", async () => {
  const sqlite = new DatabaseSync(":memory:");
  const env = { DB: wrapSqlite(sqlite), ADMIN_TOKEN: "secret-token" };
  await handleApply(
    new Request("https://intilaq.dev/api/apply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers: sampleAnswers(), plain: samplePlain() }),
    }),
    env
  );

  const denied = await handleList(new Request("https://intilaq.dev/api/applications"), env);
  assert.equal(denied.status, 401);

  const listed = await handleList(
    new Request("https://intilaq.dev/api/applications", {
      headers: { Authorization: "Bearer secret-token" },
    }),
    env
  );
  assert.equal(listed.status, 200);
  const data = await listed.json();
  assert.equal(data.applications.length, 1);
  assert.equal(data.applications[0].team_name, "Gridlab");
});

test("GET /api/applications is hidden without ADMIN_TOKEN", async () => {
  const res = await handleList(new Request("https://intilaq.dev/api/applications"), { DB: {} });
  assert.equal(res.status, 404);
});
