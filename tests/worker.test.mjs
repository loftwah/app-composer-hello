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
