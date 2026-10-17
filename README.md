# Before the idea

MIT, independently deployable Hello World reference for App Composer. Configurable `config.json`; no database or user data. Use `pnpm install` and `pnpm dev` locally. Deployment proves `/build.json` exact source identity, not mere HTTP 200. Disposable reference is noindex. Retaining or publishing it requires a reviewed indexing policy.

## Select the release target

Reviewed 14 October 2026. A copied configuration is not permission to deploy to its original account or domain. Your agent must select the intended GitHub repository, Cloudflare account, Worker and exact HTTPS origin before release, then configure `wrangler.jsonc` to match. Source must be reviewed, committed and pushed to main in that selected repository.

```sh
HELLO_REPOSITORY=YOUR_GITHUB_OWNER/YOUR_REPOSITORY \
HELLO_ACCOUNT_ID=YOUR_ACCOUNT_ID \
HELLO_WORKER=YOUR_WORKER_NAME \
HELLO_ORIGIN=https://YOUR_HOST pnpm deploy
```

These are non-secret target identifiers. Authentication stays in your authorised GitHub/Wrangler environment. Get Ready supplies them from its already verified scope; it still executes only the maintained reference. This standalone command does not provision a customer fork, domain or account.

The release refuses absent intent, credential-bearing origins/remotes, another process account, mismatched repository/configuration and extra custom-domain routes before deployment. A custom-domain target requires exactly that hostname. A workers.dev target requires its selected Worker, `workers_dev: true` and no custom routes; your agent must separately verify the account subdomain and authorise any provisioning. Official [Wrangler configuration](https://developers.cloudflare.com/workers/wrangler/configuration/) and [workers.dev routing](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/) reviewed 14 October 2026.

The guard verifies actual GitHub main, reruns `pnpm test`, builds/deploys through the pinned Wrangler with the explicit root configuration, then checks the selected origin's exact app/source/title/contract with bounded retries. Redirects and another hostname cannot satisfy verification. It no longer probes the launch operator's hostname when configured for another target. Local `pnpm test` has no network/deployment side effects. Physical devices and a real customer-owned deployment remain separate acceptance gates.

## Public project standard

Reviewed 13 October 2026; artwork and first-deployment clarity reviewed 17 October 2026. The app supplies saved reader dark/light themes, native app navigation with Ctrl/Cmd+K and ordinary links, visible keyboard focus, phone layouts, favicon/touch icon and page-specific social metadata. These features do not widen signup, owner access or disclosure permissions.

Artwork: the hero, the default social card, the favicon and the apple-touch icon are this app's own reviewed ink-line cel animation set — a tiny newly built relay sending its first bright orange signal up to a distant satellite. `public/brand/hello-art-v4-master.png` is the editable master; the 480/960 WebP hero and the 1200 × 630 JPEG share card are its reviewed derivatives. The superseded `hello-share-v2.jpg` baked the words "Hello, world. Your first app with App Composer" into the image and made the reference app wear App Composer's own mark and icon; both are replaced. The display font is preloaded from `/brand/space.woff2`, the file the stylesheet declares as the one bundled face. `tests/page-content.test.mjs` keeps the reviewed artwork, the ordered first-deployment steps and the switcher names tied to the source.

First-deployment clarity: the page states what a successful first deployment proves, then gives the three ordered steps — check this deployment's `/build.json` against the source you deployed, configure your own app in Init, and let your agent deploy and verify the result. The proof link is named for what it shows rather than left as a bare "inspect" link.

Contributions: [Contributing](CONTRIBUTING.md), [Code of Conduct](CODE_OF_CONDUCT.md), [Security](SECURITY.md), [Accessibility](ACCESSIBILITY.md). Physical-device, screen-reader and full platform sharing acceptance remain distinct from browser checks.

## Health and optional usage

Reviewed 14 October 2026. `GET /healthz` (or the declared mount plus `/healthz`) returns public liveness and exact source revision. It does not query storage, inspect credentials or prove a full user journey. `HEAD` is supported; other methods return 405.

Optional server-only daily counts use `USAGE_ENDPOINT` (an explicit HTTPS app-scoped endpoint) and `USAGE_TOKEN` (a write-only runtime secret). Both are absent by default, so forks remain independent. The copied MIT publisher derives from App Composer `lib/usage/publisher.mjs`; it is owned and deployable here, without a Composer package or Woodhouse runtime dependency. Failure or a 1.5-second timeout drops a count without blocking the app; there are no retries. Only successful public home-page opens are published. No visitor, URL, referrer, entered text, identity, profile, filename or passphrase is sent. `X-Composer-Verification: 1` excludes synthetic release probes.

The launch operator enables its own instances through Wrangler secrets; do not copy those secrets into a fork. The public [app activity](https://composer.loftwah.com/activity) explains retention, limits and missing-count/bot caveats.

Add `?vitals=1` to the public page, then open “Page performance” for local LCP/INP/CLS measurements. Values apply to this load only; unsupported metrics say unavailable. The self-hosted standard `web-vitals` 6.2.3 bundle and Apache licence/provenance are retained. No values, element attribution or page data are uploaded or persisted. Developer console links stay public and do not print app contents.

## Public sharing and link presentation

MP direction, 16 October 2026: links use no underlines and retain visible keyboard focus. Page, Open Graph and X titles/descriptions agree; the app serves an explicit large-image card with dimensions, type and alt text. The normal release checks live public HTML and JPEG dimensions with a marked Twitterbot user-agent probe. Actual X rendering is a separate observation; a probe alone does not establish it.

The shared header keeps theme switching as a quiet current-mode sun/moon icon. Preserve the stable Dark theme accessible toggle name, pressed state, keyboard focus, 44px target and existing saved-preference key. Keep the secondary control class so light-theme primary-button rules cannot override its foreground.
