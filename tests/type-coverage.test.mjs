// MIT. Exercise the real project checker against isolated deliberate mistakes.
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  cpSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
  existsSync,
} from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const project = fileURLToPath(new URL("..", import.meta.url));

test("the project gate rejects Worker, binding, context and browser type errors", () => {
  const root = mkdtempSync(join(tmpdir(), "hello-type-coverage-"));
  try {
    cpSync(join(project, "src"), join(root, "src"), { recursive: true });
    mkdirSync(join(root, "scripts"));
    mkdirSync(join(root, "public/brand"), { recursive: true });
    for (const file of [
      "package.json",
      "config.json",
      "tsconfig.json",
      "tsconfig.browser.json",
      "worker-configuration.d.ts",
      "scripts/build-source.mjs",
      "public/brand/navigation.js",
    ])
      copyFileSync(join(project, file), join(root, file));
    // Reuse only this project's already-installed pinned tools; never install.
    symlinkSync(
      realpathSync(join(project, "node_modules")),
      join(root, "node_modules"),
      "dir",
    );
    const check = () =>
      spawnSync(process.execPath, ["scripts/build-source.mjs", "--check"], {
        cwd: root,
        encoding: "utf8",
        timeout: 30000,
      });
    const baseline = check();
    assert.equal(baseline.status, 0, baseline.stderr);
    const cases = [
      [
        "src/worker.ts",
        "return env.ASSETS.fetch(req)",
        "return env.ASSETS.missingMethod(req)",
        /TS2339/,
      ],
      [
        "src/worker.ts",
        "const probe = health(req,",
        'context.waitUntil("not a promise");\n    const probe = health(req,',
        /TS2345/,
      ],
      [
        "src/worker.ts",
        "return response;",
        'return "not a Response";',
        /TS2322/,
      ],
      [
        "src/browser/navigation.ts",
        "themeLabel();",
        'theme.disabled = "not a boolean";\n  themeLabel();',
        /TS2322/,
      ],
      [
        "src/browser/navigation.ts",
        "themeLabel();",
        "const values: string[] = []; const required: string = values[0]; void required;\n  themeLabel();",
        /TS2322/,
      ],
      [
        "src/worker.ts",
        "const probe = health(req,",
        "const optional: PublisherEnv = { USAGE_ENDPOINT: undefined }; void optional;\n    const probe = health(req,",
        /TS2375/,
      ],
    ];
    for (const [name, before, after, diagnostic] of cases) {
      const file = join(root, name),
        original = readFileSync(file, "utf8");
      assert.ok(
        original.includes(before),
        "fixture must still target actual source: " + name,
      );
      try {
        writeFileSync(file, original.replace(before, after));
        const result = check();
        assert.notEqual(result.status, 0, "bad source passed: " + name);
        assert.match(result.stderr, diagnostic);
      } finally {
        writeFileSync(file, original);
      }
    }
    const restored = check();
    assert.equal(restored.status, 0, restored.stderr);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  assert.equal(
    existsSync(root),
    false,
    "owned compiler fixture must be removed",
  );
});
