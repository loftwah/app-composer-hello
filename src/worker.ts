import {health,publish,pageEvent,type PublisherEnv} from "./publisher.mjs";
import config from "../config.json";
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
  async fetch(req: Request, env: any) {
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
      `<!doctype html><html lang="en" data-app="hello" data-theme="${config.theme === "midnight" ? "dark" : "light"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(config.title)} · App Composer</title><meta name="description" content="${esc(config.intro)}"><link rel="canonical" href="${esc(origin)}/"><link rel="icon" href="/brand/mark.svg"><link rel="apple-touch-icon" href="/brand/icon.png"><meta name="theme-color" content="#17181b"><meta property="og:type" content="website"><meta property="og:title" content="${esc(config.title)}"><meta property="og:description" content="${esc(config.intro)}"><meta property="og:url" content="${esc(origin)}/"><meta property="og:image" content="${esc(origin)}/brand/share-ai-v1.jpg"><meta property="og:image:alt" content="App Composer’s original generated orange and charcoal composition artwork."><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${esc(origin)}/brand/share-ai-v1.jpg"><link rel="stylesheet" href="/brand/navigation.css"><link rel="stylesheet" href="/style.css"></head><body><a class="skip" href="#main">Skip to content</a><header><a class="brand" href="/">Hello World <small>App Composer reference</small></a><div class="app-tools"><a href="https://composer.loftwah.com/apps">All apps</a><button type="button" class="secondary" data-open-apps aria-haspopup="dialog">Apps <kbd>⌘K / Ctrl K</kbd></button><button type="button" class="secondary" id="reader-theme">Light mode</button></div></header><dialog id="app-navigation" aria-labelledby="app-navigation-title"><div class="dialog-heading"><h2 id="app-navigation-title">Apps and shortcuts</h2><button type="button" data-close-apps>Close</button></div><label>Find an app or task<input type="search" placeholder="App name, Get Ready, Init…" autocomplete="off"></label><p role="status" aria-live="polite"></p><ul><li data-destination><a href="https://guestbook.loftwah.com">Here / there<small>Photo guestbook</small></a></li><li data-destination><a href="https://showcase.loftwah.com">Linkarooie<small>Curated collection</small></a></li><li data-destination><a href="https://share.loftwah.com">Link Check<small>SEO and sharing</small></a></li><li data-destination><a href="https://ready.loftwah.com">Hello World<small>Deployment reference</small></a></li><li data-destination><a href="https://ai.loftwah.com">Portable AI State<small>Fictional encrypted assistant</small></a></li><li data-destination><a href="https://composer.loftwah.com/ready">Get Ready<small>Composer task</small></a></li><li data-destination><a href="https://composer.loftwah.com/init">Init<small>Composer task</small></a></li></ul></dialog><main id="main"><section class="hello"><div><h1>${esc(config.title)}</h1><p class="lede">${esc(config.intro)}</p><a class="button" href="https://composer.loftwah.com/init">Make something with App Composer</a><p class="note">A small HTTPS deployment proof. No idea or permanent app required.</p><a href="/build.json">Inspect this exact deployment</a></div><figure><img src="/brand/share-ai-v1.jpg" width="1200" height="630" alt="App Composer’s orange and charcoal joined square frames."><figcaption>Original generated App Composer artwork.</figcaption></figure></section></main><footer><a href="https://github.com/loftwah/app-composer-hello">MIT source</a> · Reviewed 13 October 2026</footer><script nonce="${nonce}" src="/brand/navigation.js"></script><script type="module" src="/brand/page-performance.mjs"></script></body></html>`,
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

export default {async fetch(req:Request,env:PublisherEnv & {ASSETS:any;PUBLIC_ORIGIN?:string},context:any){
 const probe=health(req,'/healthz','hello',BUILD_SHA);if(probe)return probe;
 const response=await app.fetch(req,env);if(pageEvent(req,response)==='app_open')publish(env,context,req,'app_open');return response;
}};
