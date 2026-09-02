import { cpSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const files = [
  ["index.html", "index.html"],
  ["apply.html", "apply.html"],
  ["admin.html", "admin.html"],
  [".nojekyll", ".nojekyll"],
  ["_headers", "_headers"],
  ["tools/design-lab.html", "tools/design-lab.html"],
];

// Cloudflare dashboard templates often pass --assets ./public or ./dist.
// Keep both populated from the root HTML so either override still ships the site.
for (const dir of ["public", "dist"]) {
  mkdirSync(join(root, dir, "tools"), { recursive: true });
  for (const [from, to] of files) {
    cpSync(join(root, from), join(root, dir, to));
  }
}

console.log("Synced site files into public/ and dist/");
