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
  assert.match(worker, /\/brand\/hello-share-20261018\.jpg/);
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
    ["Here / there", "herethere-small-20261018"],
    ["Linkarooie", "linkarooie-small-20261018"],
    ["Link Check", "linkcheck-small-20261018"],
    ["Hello World", "hello-small-20261018"],
    ["Carry / forward", "carryforward-small-20261018"],
  ]) {
    assert.ok(worker.includes(name), name + " stays in the switcher");
    assert.ok(
      worker.includes(`/brand/apps/${crop}.webp`),
      crop + " thumbnail stays in the switcher",
    );
  }
  assert.doesNotMatch(worker, /Portable AI State/);
});

// LDraw is the reviewed Composer destination: one authored row using this app's
// own root tile path, and no invented artwork of its own.
test("the LDraw row keeps its exact link, local tile and authored label", () => {
  const row =
    '<li data-destination><a href="https://ldraw.loftwah.com/"><img src="/brand/apps/ldraw-tile-c9c2339a1296-d2e0dc4b-r2-96.webp" width="40" height="40" alt=""><span>LDraw<small>Editable diagrams</small></span></a></li>';
  assert.ok(worker.includes(row), "the row keeps its local tile and empty alt");
  assert.ok(
    worker.indexOf(row) > worker.indexOf("Carry / forward"),
    "LDraw follows Carry / forward",
  );
  assert.ok(
    worker.indexOf(row) < worker.indexOf('href="https://composer.loftwah.com/ready"'),
    "LDraw precedes the Composer task links",
  );
  assert.equal(
    worker.split('href="https://ldraw.loftwah.com/"').length - 1,
    1,
    "exactly one LDraw destination",
  );
  assert.doesNotMatch(worker, /ldraw[^"<]*(logo|mark)\.(svg|png)/i);
  assert.equal(
    existsSync(
      new URL(
        "public/brand/apps/ldraw-tile-c9c2339a1296-d2e0dc4b-r2-96.webp",
        root,
      ),
    ),
    true,
    "the reviewed tile is committed locally",
  );
});

// The shipped controller owns search, arrow/Home/End navigation, Enter and Escape.
// It indexes a destination by the first span's leading text, so the authored LDraw
// row must match the controller's own LDraw definition rather than another name.
test("the local launcher indexes LDraw for search and keeps its keyboard contract", () => {
  const launcher = readFileSync(
    new URL("public/brand/launcher.js", root),
    "utf8",
  );
  assert.match(
    launcher,
    /name: "LDraw", href: "https:\/\/ldraw\.loftwah\.com\/", image: "apps\/ldraw-tile-c9c2339a1296-d2e0dc4b-r2-96\.webp", standaloneOnly: true, explainer: "\/ldraw", description: "Editable diagrams, PNG and SVG", keywords: "draw drawing diagram excalidraw scene png svg local offline"/,
  );
  assert.match(
    launcher,
    /querySelector\("span:not\(\.task-icon\)"\)\?\.firstChild\?\.textContent/,
  );
  assert.match(
    launcher,
    /value\.normalize\("NFD"\)\.replace\(\/\\p\{Diacritic\}\/gu, ""\)\.toLocaleLowerCase\("en"\)/,
  );
  assert.match(launcher, /event\.key === "Escape"/);
  assert.match(
    launcher,
    /event\.key === "ArrowDown" \|\| event\.key === "ArrowUp" \|\| event\.key === "Home" \|\| event\.key === "End"/,
  );
  assert.match(
    launcher,
    /\(event\.ctrlKey \|\| event\.metaKey\) && !event\.altKey && event\.key\.toLowerCase\(\) === "k"/,
  );
});
