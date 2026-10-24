// MIT. Initial formatting scope: maintained Worker/browser sources and their gates.
import { check, format, resolveConfig } from "prettier";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
const files = [
  "src/worker.ts",
  "src/publisher.mts",
  "src/browser/navigation.ts",
  "scripts/build-source.mjs",
  "scripts/format-source.mjs",
  "tests/type-coverage.test.mjs",
  "tests/worker.test.mjs",
  "tsconfig.json",
  "tsconfig.browser.json",
  "package.json",
];
let failed = false;
for (const file of files) {
  const path = resolve(root, file),
    source = readFileSync(path, "utf8");
  const options = { ...(await resolveConfig(path)), filepath: path };
  if (process.argv[2] === "--write")
    writeFileSync(path, await format(source, options));
  else if (!(await check(source, options))) {
    console.error("Format: " + file);
    failed = true;
  }
}
if (failed) process.exitCode = 1;
