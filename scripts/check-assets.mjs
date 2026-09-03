import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function assert(cond, message) {
  if (!cond) failures.push(message);
}

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function size(rel) {
  return statSync(join(root, rel)).size;
}

const wrangler = JSON.parse(
  read("wrangler.jsonc").replace(/\/\/[^\n]*/g, "")
);

assert(wrangler.name === "intilaq", "wrangler name must be intilaq");
assert(wrangler.main === "src/index.js", "wrangler.main must point at src/index.js");
assert(
  wrangler.assets?.directory === "./public",
  `assets.directory must be ./public (got ${wrangler.assets?.directory})`
);
assert(wrangler.assets?.binding === "ASSETS", "assets.binding must be ASSETS");
assert(Array.isArray(wrangler.d1_databases) && wrangler.d1_databases[0]?.binding === "DB", "D1 binding DB is required");
assert(wrangler.d1_databases[0]?.database_name === "intilaq", "D1 database_name must be intilaq");

const required = ["index.html", "apply.html", "admin.html", "tools/design-lab.html", "_headers"];
for (const file of required) {
  const publicFile = join("public", file);
  assert(size(publicFile) > 0, `${publicFile} is missing or empty`);
  assert(
    read(file) === read(publicFile),
    `${publicFile} is out of sync with ${file}`
  );
}

for (const file of ["apply.html", "index.html", "admin.html", "tools/design-lab.html"]) {
  const head = read(file).slice(0, 1024);
  assert(
    /<meta\s+charset=["']utf-8["']/i.test(head),
    `${file} must declare <meta charset="utf-8"> in the first 1024 bytes`
  );
}

const worker = read("src/index.js");
assert(worker.includes("export default"), "Worker must export a default handler");
assert(worker.includes("fetch"), "Worker must export a fetch handler");
assert(worker.includes("ASSETS"), "Worker must serve via the ASSETS binding");
assert(
  worker.includes("charset=utf-8"),
  "Worker must set Content-Type charset=utf-8 on HTML responses"
);
assert(worker.includes("/api/apply"), "Worker must handle POST /api/apply");
assert(read("apply.html").includes('fetch("/api/apply"'), "apply.html must POST to /api/apply");

assert(worker.includes("/api/applications"), "Worker must handle GET /api/applications");
assert(read("admin.html").includes("/api/applications"), "admin.html must call GET /api/applications");

if (failures.length) {
  console.error("Asset check failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

const dryRun = spawnSync(
  "npx",
  ["wrangler", "deploy", "--dry-run", "--outdir", join(root, ".wrangler-dry-run")],
  { cwd: root, encoding: "utf8" }
);

if (dryRun.status !== 0) {
  console.error(dryRun.stdout);
  console.error(dryRun.stderr);
  console.error("wrangler deploy --dry-run failed");
  process.exit(1);
}

const combined = `${dryRun.stdout}\n${dryRun.stderr}`;
const readMatch = combined.match(/Read (\d+) files from the assets directory/);
assert(Boolean(readMatch), "dry-run output did not report files from the assets directory");
assert(Number(readMatch?.[1] || 0) >= 3, `expected at least 3 uploaded assets, got ${readMatch?.[1] || 0}`);
assert(/\/public/.test(combined), "dry-run must upload from ./public");

if (failures.length) {
  console.error("Asset check failed:\n- " + failures.join("\n- "));
  process.exit(1);
}

console.log("Asset check passed. wrangler.jsonc, public/, and Worker handler look deployable.");
console.log(combined.trim().split("\n").slice(-20).join("\n"));
