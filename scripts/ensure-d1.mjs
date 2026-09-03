/**
 * Create or reuse the remote D1 database named `intilaq`, write its
 * database_id into wrangler.jsonc, and apply migrations.
 *
 * Workers Builds currently runs `npx wrangler deploy`, which fails on the
 * placeholder ID. This script is hooked from postinstall (best-effort) and
 * from `npm run deploy` so the real ID is in place before deploy.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const NAME = "intilaq";
const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const wranglerPath = join(root, "wrangler.jsonc");
const optional = process.env.npm_lifecycle_event === "postinstall";

export function firstJson(text) {
  if (!text) return null;
  const startArr = text.indexOf("[");
  const startObj = text.indexOf("{");
  let start = -1;
  if (startArr === -1) start = startObj;
  else if (startObj === -1) start = startArr;
  else start = Math.min(startArr, startObj);
  if (start === -1) return null;
  try {
    return JSON.parse(text.slice(start));
  } catch {
    return null;
  }
}

export function idFromRecord(row) {
  if (!row || typeof row !== "object") return "";
  return String(row.uuid || row.database_id || row.id || "");
}

export function findNamed(list, name) {
  const rows = Array.isArray(list) ? list : list?.result || list?.databases || [];
  return rows.find((row) => (row.name || row.database_name) === name) || null;
}

export function patchDatabaseId(source, id) {
  if (!UUID_RE.test(id)) throw new Error("Not a database id: " + id);
  if (!/"database_id"\s*:/.test(source)) throw new Error("wrangler.jsonc has no database_id");
  return source.replace(/"database_id"\s*:\s*"[^"]+"/, `"database_id": "${id}"`);
}

function wrangler(args) {
  return spawnSync("npx", ["wrangler", ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, CI: process.env.CI || "1" },
  });
}

function fail(message, detail) {
  console.error("ensure-d1:", message);
  if (detail) console.error(detail);
  process.exit(optional ? 0 : 1);
}

function combined(result) {
  return `${result.stdout || ""}\n${result.stderr || ""}`;
}

if (process.argv[1] && basename(process.argv[1]) === "ensure-d1.mjs") {
  const listed = wrangler(["d1", "list", "--json"]);
  let row = findNamed(firstJson(combined(listed)), NAME);
  let id = idFromRecord(row);

  if (!id && listed.status !== 0) {
    fail(
      "could not list D1 databases (not logged in, or token cannot manage D1).",
      combined(listed).trim()
    );
  }

  if (!id) {
    console.log("ensure-d1: creating remote D1 database", NAME);
    const created = wrangler(["d1", "create", NAME, "--json"]);
    const parsed = firstJson(combined(created));
    id = idFromRecord(parsed);
    if (!id) row = findNamed(firstJson(combined(wrangler(["d1", "list", "--json"]))), NAME);
    id = id || idFromRecord(row);
    if (!id) {
      const uuid = combined(created).match(UUID_RE);
      id = uuid ? uuid[0] : "";
    }
    if (!id) fail("could not create D1 database " + NAME, combined(created).trim());
  } else {
    console.log("ensure-d1: found existing D1 database", NAME);
  }

  writeFileSync(wranglerPath, patchDatabaseId(readFileSync(wranglerPath, "utf8"), id));
  console.log("ensure-d1: wrote database_id", id, "to wrangler.jsonc");

  const migrated = wrangler(["d1", "migrations", "apply", NAME, "--remote"]);
  if (migrated.status !== 0) {
    fail("could not apply D1 migrations", combined(migrated).trim());
  }
  console.log("ensure-d1: remote migrations applied");
}
