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

const required = ["index.html", "apply.html", "tools/design-lab.html"];
for (const file of required) {
  const publicFile = join("public", file);
  assert(size(publicFile) > 0, `${publicFile} is missing or empty`);
  assert(
    read(file) === read(publicFile),
    `${publicFile} is out of sync with ${file}`
  );
}

const worker = read("src/index.js");
assert(worker.includes("export default"), "Worker must export a default handler");
assert(worker.includes("fetch"), "Worker must export a fetch handler");
assert(worker.includes("ASSETS"), "Worker must serve via the ASSETS binding");

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
