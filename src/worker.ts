import { health, publish, pageEvent, type PublisherEnv } from "./publisher.mjs";
import config from "../config.json";
interface WorkerEnv extends Env, PublisherEnv {}
declare const BUILD_SHA: string;
const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
const app = {
  async fetch(req: Request, env: WorkerEnv) {
    const u = new URL(req.url);
    if (u.pathname === "/build.json")
      return Response.json(
        {
          app: "hello",
          commit: BUILD_SHA,
          title: config.title,
          contract: 1,
          dataVersion: 1,
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    if (u.pathname !== "/") return env.ASSETS.fetch(req);
    const origin = env.PUBLIC_ORIGIN || u.origin;
    const nonce = btoa(
      String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))),
    );
    return new Response(
      `<!doctype html><html lang="en" data-app="hello" data-theme="${config.theme === "midnight" ? "dark" : "light"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex,nofollow"><title>${esc(config.title)} · App Composer</title><meta name="description" content="${esc(config.intro)}"><link rel="canonical" href="${esc(origin)}/"><link rel="icon" type="image/png" sizes="32x32" href="/brand/hello-icon-20261018-32.png"><link rel="icon" type="image/png" sizes="48x48" href="/brand/hello-icon-20261018-48.png"><link rel="apple-touch-icon" sizes="180x180" href="/brand/hello-icon-20261018-180.png"><link rel="preload" href="/brand/space-latin-20261018.woff2" as="font" type="font/woff2" crossorigin><meta name="theme-color" content="#17181b"><meta property="og:type" content="website"><meta property="og:title" content="${esc(config.title)} · App Composer"><meta property="og:description" content="${esc(config.intro)}"><meta property="og:url" content="${esc(origin)}/"><meta property="og:image" content="${esc(origin)}/brand/hello-share-20261018.jpg"><meta property="og:image:alt" content="Hello World: build and deploy a first app and keep the source. A tiny relay sends an orange signal toward a distant satellite."><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(config.title)} · App Composer"><meta name="twitter:description" content="${esc(config.intro)}"><meta name="twitter:image:alt" content="Hello World: build and deploy a first app and keep the source. A tiny relay sends an orange signal toward a distant satellite."><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:type" content="image/jpeg"><meta name="twitter:image" content="${esc(origin)}/brand/hello-share-20261018.jpg"><link rel="stylesheet" href="/brand/navigation.css"><link rel="stylesheet" href="/brand/launcher.css"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/brand/page-share.css"><link rel="stylesheet" href="/brand/theme-control.css"></head><body><a class="skip" href="#main">Skip to content</a><header class="app-header"><a class="brand" href="/"><img src="/brand/hello-icon-20261018-96.png" width="36" height="36" alt=""><span>Hello World <small>App Composer reference</small></span></a><div class="app-tools"><button type="button" class="secondary" data-open-apps aria-haspopup="dialog"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/></svg>Apps <kbd>⌘K / Ctrl K</kbd></button><button type="button" class="theme-control secondary" id="reader-theme" aria-label="Dark theme" aria-pressed="true" title="Switch to light theme"><svg data-theme-glyph="dark" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"/></svg><svg data-theme-glyph="light" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg></button></div></header><dialog id="app-navigation" aria-labelledby="app-navigation-title"><div class="dialog-heading"><h2 id="app-navigation-title">Apps and shortcuts</h2><button type="button" data-close-apps autofocus>Close</button></div><label>Find an app or task<input type="search" placeholder="App name, Get Ready, Init…" autocomplete="off"></label><p role="status" aria-live="polite"></p><ul><li data-destination><a href="https://guestbook.loftwah.com"><img src="/brand/apps/herethere-small-20261018.webp" width="40" height="40" alt=""><span>Here / there<small>Photo guestbook</small></span></a></li><li data-destination><a href="https://showcase.loftwah.com"><img src="/brand/apps/linkarooie-small-20261018.webp" width="40" height="40" alt=""><span>Linkarooie<small>Curated collection</small></span></a></li><li data-destination><a href="https://share.loftwah.com"><img src="/brand/apps/linkcheck-small-20261018.webp" width="40" height="40" alt=""><span>Link Check<small>SEO and sharing</small></span></a></li><li data-destination><a href="https://ready.loftwah.com" aria-current="page"><img src="/brand/apps/hello-small-20261018.webp" width="40" height="40" alt=""><span>Hello World<small>Deployment reference</small></span></a></li><li data-destination><a href="https://ai.loftwah.com"><img src="/brand/apps/carryforward-small-20261018.webp" width="40" height="40" alt=""><span>Carry / forward<small>Portable assistant memory</small></span></a></li><li data-destination><a href="https://composer.loftwah.com/ready">Get Ready<small>Composer task</small></a></li><li data-destination><a href="https://composer.loftwah.com/init">Init<small>Composer task</small></a></li></ul></dialog><main id="main"><section class="hello"><div><h1>${esc(config.title)}</h1><p class="lede">${esc(config.intro)}</p><a class="button" href="https://composer.loftwah.com/init">Configure your own app in Init</a><p class="note">If this page loads over HTTPS, this environment can build and deploy. No database, account or permanent app is required.</p><ol class="steps"><li><strong>Check the proof.</strong> Open <a href="/build.json">this deployment’s /build.json</a> and confirm the commit matches the source you deployed.</li><li><strong>Make it yours.</strong> Configure an app in Init, then hand the saved specification to your coding agent.</li><li><strong>Verify the result.</strong> Your agent deploys and checks the live revision. This reference app is only the starting point.</li></ol></div><figure><img src="/brand/hello-art-v4-960.webp" srcset="/brand/hello-art-v4-480.webp 480w, /brand/hello-art-v4-960.webp 960w" sizes="(max-width: 820px) calc(100vw - 48px), 440px" width="960" height="960" alt="An original animated-style illustration of a tiny newly built relay sending its first bright orange signal up to a distant satellite."><figcaption>Original illustration for Hello World. Kept separate from any deployed page.</figcaption></figure></section></main><footer><div class="public-page-share" data-page-share hidden><button type="button" class="secondary" data-page-native hidden>Share page</button><button type="button" class="secondary" data-page-copy hidden>Copy page link</button><p role="status" aria-live="polite" data-share-status></p><label data-share-fallback hidden>Published page URL<input readonly aria-label="Published page URL"></label></div><a href="https://github.com/loftwah/app-composer-hello">MIT source</a> · Reviewed 17 October 2026<span> · <a href="https://composer.loftwah.com/">App Composer</a></span></footer><script nonce="${nonce}" src="/brand/navigation.js"></script><script nonce="${nonce}" src="/brand/launcher.js"></script><script type="module" src="/brand/page-performance.mjs"></script><script type="module" src="/brand/page-share.mjs"></script></body></html>`,
      {
        headers: {
          "Content-Type": "text/html;charset=utf-8",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
          "Content-Security-Policy": `default-src 'self'; script-src 'self' 'nonce-${nonce}' https://static.cloudflareinsights.com/beacon.min.js; style-src 'self'; img-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'`,
        },
      },
    );
  },
};

export default {
  async fetch(req: Request, env: WorkerEnv, context: ExecutionContext) {
    const probe = health(req, "/healthz", "hello", BUILD_SHA);
    if (probe) return probe;
    const response = await app.fetch(req, env);
    if (pageEvent(req, response) === "app_open")
      publish(env, context, req, "app_open");
    return response;
  },
};
