import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";

const root = new URL("..", import.meta.url);
const worker = readFileSync(new URL("src/worker.ts", root), "utf8");

// The reference page is the only page this app serves, so its contract is
// asserted from the rendered template rather than trusted to review by eye.
test("the reference page shows the reviewed artwork and never a baked-in card", () => {
  assert.match(worker, /\/brand\/hello-art-v4-960\.webp/);
  assert.match(worker, /\/brand\/hello-art-v4-480\.webp 480w/);
  assert.match(worker, /srcset="\/brand\/hello-art-v4-480\.webp 480w/);
  assert.match(worker, /width="960" height="960"/);
  assert.match(worker, /\/brand\/hello-share-v4\.jpg/);
  assert.doesNotMatch(worker, /hello-share-v2|share-ai-v1|greeting card and paper sprout/);
});

test("every brand asset the page names exists in this repository", () => {
  const paths = [...worker.matchAll(/\/brand\/[a-z0-9./-]+\.(?:webp|jpg|png|svg|woff2)/g)].map(
    ([path]) => path,
  );
  assert.ok(paths.length >= 6, "the page names its brand assets");
  for (const path of new Set(paths))
    assert.equal(
      existsSync(new URL("public" + path, root)),
      true,
      "public" + path + " must exist",
    );
});

test("the display font is preloaded from the file the stylesheet declares", () => {
  assert.match(
    worker,
    /rel="preload" href="\/brand\/space-latin-20261018\.woff2" as="font" type="font\/woff2" crossorigin/,
  );
  assert.match(
    readFileSync(new URL("public/style.css", root), "utf8"),
    /@font-face\s*\{[^}]*src:\s*url\("\/brand\/space-latin-20261018\.woff2"\)/,
  );
});

test("a first deployment is explained as ordered steps with the real proof link", () => {
  for (const step of ["Check the proof.", "Make it yours.", "Verify the result."])
    assert.ok(worker.includes(step), step + " must stay in the page");
  assert.match(worker, /href="\/build\.json"/);
  assert.match(worker, /commit matches the source you deployed/);
  assert.doesNotMatch(worker, /Inspect this exact deployment/);
});

test("the app switcher names each app as its own repository does", () => {
  for (const [name, crop] of [
    ["Here / there", "herethere-small-v4"],
    ["Linkarooie", "linkarooie-small-20261018"],
    ["Link Check", "linkcheck-small-v4"],
    ["Hello World", "hello-small-v4"],
    ["Carry / forward", "carryforward-small-v4"],
  ]) {
    assert.ok(worker.includes(name), name + " stays in the switcher");
    assert.ok(
      worker.includes(`/brand/apps/${crop}.webp`),
      crop + " thumbnail stays in the switcher",
    );
  }
  assert.doesNotMatch(worker, /Portable AI State/);
});
