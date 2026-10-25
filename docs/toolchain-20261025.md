# Hello toolchain qualification — 25 October 2026

Base source: `db0a98c6c3bf2ff5ffb901d3d8f78de3698efb37`. Composer #316/#321 owns the coordinated toolchain work; each app keeps its own release.

The maintained Hello source still declared Wrangler 4.143.1 while Composer's real Get Ready tool verifier requires 4.152.0. An isolated real-source install reproduced `configuration` after installation; this was source-version skew, not proof of a Node 24 incompatibility. This update pins Wrangler 4.152.0 and Workers types 5.20261024.1, the pair already qualified by Composer. npm's current Workers types is 5.20261025.1; adopting that day's types is outside this already-tested pair. Node `>=22 <23`, pnpm 12.8.1, the workerd 1.20261013.1 override, compatibility date, configuration, assets and runtime code are unchanged.

The new dependency tree initially reported one high and two moderate Undici advisories through Miniflare. The existing Composer-reviewed override to Undici 7.30.1 removes those findings; it adds no application dependency. See [the advisory and patched versions](https://github.com/advisories/GHSA-xjj6-f33q-929c). The regenerated Worker declarations reflect Wrangler's current generator.

Actual local startup also reproduced `ReferenceError: BUILD_SHA is not defined` at `/build.json`. The development command now supplies the explicit `development` identity. Production deployment still supplies and verifies the exact committed SHA; development never impersonates a release.

## Run evidence

- Node 22.23.4: `pnpm check` passes all types/parity/lint/format checks and 26 tests; `pnpm build` passes the credential-free Wrangler dry run (11.80 KiB / 4.16 KiB gzip; 57 assets).
- Experimental Node 24.22.1: the same check and build pass. This is bounded compatibility evidence; Hello's declared Node 22 support policy is unchanged.
- Both runtimes: actual `pnpm dev --local --ip 127.0.0.1 --port 8797` starts workerd; `/`, `/build.json` and `/healthz` return 200, the configured heading remains `Hello from Loftwah.`, and development identity is explicit. Each local server was stopped after its probe.
- `pnpm audit --audit-level low`: no known vulnerabilities after the override. This is the registry's dated report, not a security guarantee.
- No owner configuration, user record, provider setting, secret or account was changed by qualification. No paid resource or CI was added. Live deployment and exact Worker/source acceptance follow the separate clean pushed-main guard.
