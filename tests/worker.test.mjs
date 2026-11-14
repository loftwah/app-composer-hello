// MIT. Execute actual maintained Worker source with fictional local bindings.
import test, { after, mock } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { publish } from "../src/publisher.mjs";

const revision = "a".repeat(40);
const configuration = {
  title: 'Fictional <welcome> & "forms"',
  intro: "A fictional 'form' <script>canary</script>.",
  theme: "daylight",
};
const source = readFileSync(
  new URL("../src/worker.ts", import.meta.url),
  "utf8",
);
assert.ok(source.includes('import config from "../config.json";'));
assert.ok(source.includes("declare const BUILD_SHA: string;"));
const executable = source
  .replace(
    'from "./publisher.mjs"',
    `from ${JSON.stringify(new URL("../src/publisher.mjs", import.meta.url).href)}`,
  )
  .replace(
    'import config from "../config.json";',
    "const config = " + JSON.stringify(configuration) + ";",
  )
  .replace(
    "declare const BUILD_SHA: string;",
    "const BUILD_SHA = " + JSON.stringify(revision) + ";",
  );
const compiled = ts.transpileModule(executable, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ES2022,
  },
}).outputText;
const { default: worker } = await import(
  "data:text/javascript;base64," + Buffer.from(compiled).toString("base64")
);

const outbound = [];
mock.method(globalThis, "fetch", async (url) => {
  outbound.push(String(url));
  throw Error("Runtime fixtures must not make network requests");
});
after(() => {
  try {
    assert.deepEqual(outbound, [], "no runtime fixture may dispatch a request");
  } finally {
    mock.restoreAll();
  }
});

const request = (path, init) =>
  new Request("https://hello.example.test" + path, init);
function fixture() {
  const assets = [],
    deferred = [];
  const response = new Response("fictional asset", { status: 404 });
  return {
    assets,
    deferred,
    response,
    env: {
      PUBLIC_ORIGIN: "https://hello.example.test",
      ASSETS: {
        fetch(req) {
          assets.push(req);
          return response;
        },
      },
    },
    context: {
      waitUntil(value) {
        deferred.push(value);
      },
    },
  };
}

test("health methods and build identity bypass assets and optional publishing", async () => {
  const f = fixture();
  const health = await worker.fetch(request("/healthz"), f.env, f.context);
  assert.deepEqual(await health.json(), {
    status: "up",
    check: "liveness",
    app: "hello",
    revision,
  });
  const head = await worker.fetch(
    request("/healthz", { method: "HEAD" }),
    f.env,
    f.context,
  );
  assert.equal(await head.text(), "");
  const denied = await worker.fetch(
    request("/healthz", { method: "POST" }),
    f.env,
    f.context,
  );
  assert.equal(denied.status, 405);
  assert.equal(denied.headers.get("Allow"), "GET, HEAD");
  const build = await worker.fetch(request("/build.json"), f.env, f.context);
  assert.equal(build.headers.get("Cache-Control"), "no-store");
  assert.deepEqual(await build.json(), {
    app: "hello",
    commit: revision,
    title: configuration.title,
    contract: 1,
    dataVersion: 1,
  });
  assert.equal(f.assets.length, 0);
  assert.equal(f.deferred.length, 0);
});

test("assets retain the actual request and response; fictional page values are escaped", async () => {
  const f = fixture(),
    asset = request("/missing.css");
  assert.equal(await worker.fetch(asset, f.env, f.context), f.response);
  assert.equal(f.assets[0], asset);
  const page = await worker.fetch(request("/"), f.env, f.context);
  const html = await page.text();
  assert.match(html, /Fictional &lt;welcome&gt; &amp; &quot;forms&quot;/);
  assert.match(html, /&lt;script&gt;canary&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>canary/);
  assert.match(html, /data-theme="light"/);
  const video = html.match(/<video\b[^>]*>/)?.[0];
  assert.ok(video?.includes('preload="none"'));
  assert.doesNotMatch(video, /\bautoplay\b/);
  assert.match(html, /small-beginning-motion\.mp4/);
  assert.match(html, /artwork, not deployment evidence/);
  assert.match(html, /woodhouse\.loftwah\.com\/api\/v1\/assets\/new-116/);
  assert.match(
    page.headers.get("Content-Security-Policy"),
    /script-src 'self' 'nonce-[A-Za-z0-9+/=]+'/,
  );
  assert.equal(f.deferred.length, 0, "unconfigured forks never publish usage");
});

test("invalid optional endpoints and synthetic probes schedule no outbound work", async () => {
  for (const endpoint of [
    "http://usage.example.test",
    "https://secret@usage.example.test",
    "https://usage.example.test/?secret=fixture",
  ]) {
    const f = fixture();
    await worker.fetch(
      request("/"),
      { ...f.env, USAGE_ENDPOINT: endpoint, USAGE_TOKEN: "fictional-token" },
      f.context,
    );
    assert.equal(f.deferred.length, 0);
  }
  const f = fixture();
  await worker.fetch(
    request("/", { headers: { "X-Composer-Verification": "1" } }),
    {
      ...f.env,
      USAGE_ENDPOINT: "https://usage.example.test/app",
      USAGE_TOKEN: "fictional-token",
    },
    f.context,
  );
  assert.equal(f.deferred.length, 0);
});

test("a failed optional transport completes without retries or rejected background work", async () => {
  const f = fixture();
  let calls = 0;
  publish(
    {
      USAGE_ENDPOINT: "https://usage.example.test/app",
      USAGE_TOKEN: "fictional-token",
    },
    f.context,
    request("/"),
    "app_open",
    async () => {
      calls++;
      throw Error("fictional transport failure");
    },
  );
  await Promise.all(f.deferred);
  assert.equal(calls, 1);
});

test("the published film supports bounded single byte ranges and conditional requests", async () => {
  const f = fixture();
  const bytes = new TextEncoder().encode("0123456789");
  f.env.ASSETS.fetch = async (req) => {
    if (req.headers.get("if-none-match") === '"fixture"')
      return new Response(null, {
        status: 304,
        headers: { etag: '"fixture"' },
      });
    return new Response(req.method === "HEAD" ? null : bytes, {
      headers: {
        "content-type": "video/mp4",
        "content-length": "10",
        etag: '"fixture"',
        "last-modified": "Sun, 01 Nov 2026 00:00:00 GMT",
        "cache-control": "public, max-age=60",
        "x-content-type-options": "nosniff",
      },
    });
  };
  const path = "/brand/small-beginning-motion.mp4";
  for (const [range, expected, contentRange] of [
    ["bytes=2-4", "234", "bytes 2-4/10"],
    ["bytes=7-", "789", "bytes 7-9/10"],
    ["bytes=-3", "789", "bytes 7-9/10"],
  ]) {
    const res = await worker.fetch(
      request(path, { headers: { range } }),
      f.env,
      f.context,
    );
    assert.equal(res.status, 206);
    assert.equal(await res.text(), expected);
    assert.equal(res.headers.get("content-range"), contentRange);
    assert.equal(res.headers.get("content-length"), String(expected.length));
    assert.equal(res.headers.get("x-content-type-options"), "nosniff");
  }
  const invalid = await worker.fetch(
    request(path, { headers: { range: "bytes=99-" } }),
    f.env,
    f.context,
  );
  assert.equal(invalid.status, 416);
  assert.equal(invalid.headers.get("content-range"), "bytes */10");
  const changed = await worker.fetch(
    request(path, { headers: { range: "bytes=0-2", "if-range": '"old"' } }),
    f.env,
    f.context,
  );
  assert.equal(changed.status, 200);
  assert.equal(await changed.text(), "0123456789");
  const same = await worker.fetch(
    request(path, { headers: { range: "bytes=0-2", "if-range": '"fixture"' } }),
    f.env,
    f.context,
  );
  assert.equal(same.status, 206);
  assert.equal(await same.text(), "012");
  const matchingDate = await worker.fetch(
    request(path, {
      headers: {
        range: "bytes=0-2",
        "if-range": "Sun, 01 Nov 2026 00:00:00 GMT",
      },
    }),
    f.env,
    f.context,
  );
  assert.equal(matchingDate.status, 206);
  const changedDate = await worker.fetch(
    request(path, {
      headers: {
        range: "bytes=0-2",
        "if-range": "Mon, 02 Nov 2026 00:00:00 GMT",
      },
    }),
    f.env,
    f.context,
  );
  assert.equal(changedDate.status, 200);
  const unchanged = await worker.fetch(
    request(path, {
      headers: { range: "bytes=0-2", "if-none-match": '"fixture"' },
    }),
    f.env,
    f.context,
  );
  assert.equal(unchanged.status, 304);
  const head = await worker.fetch(
    request(path, { method: "HEAD", headers: { range: "bytes=0-2" } }),
    f.env,
    f.context,
  );
  assert.equal(head.status, 200);
  assert.equal(head.headers.get("content-length"), "10");
  const plain = await worker.fetch(request(path), f.env, f.context);
  assert.equal(plain.status, 200);
  assert.equal(await plain.text(), "0123456789");
});

test("film ranges measure a bounded stream when the asset omits length", async () => {
  const f = fixture();
  const path = "/brand/small-beginning-motion.mp4";
  const stream = (bytes) =>
    new ReadableStream({
      start(controller) {
        controller.enqueue(bytes);
        controller.close();
      },
    });
  f.env.ASSETS.fetch = async () =>
    new Response(stream(new TextEncoder().encode("0123456789")), {
      headers: { "content-type": "video/mp4" },
    });
  const ranged = await worker.fetch(
    request(path, { headers: { range: "bytes=2-4" } }),
    f.env,
    f.context,
  );
  assert.equal(ranged.status, 206);
  assert.equal(ranged.headers.get("content-range"), "bytes 2-4/10");
  assert.equal(await ranged.text(), "234");
  const beyond = await worker.fetch(
    request(path, { headers: { range: "bytes=100-" } }),
    f.env,
    f.context,
  );
  assert.equal(beyond.status, 416);
  assert.equal(beyond.headers.get("content-range"), "bytes */10");
  f.env.ASSETS.fetch = async () =>
    new Response(stream(new Uint8Array(2 * 1024 * 1024 + 1)));
  const oversized = await worker.fetch(
    request(path, { headers: { range: "bytes=0-1" } }),
    f.env,
    f.context,
  );
  assert.equal(oversized.status, 502);
});
