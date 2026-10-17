# Engineering baseline

This is the first #175 type-coverage slice, using Node 22, pinned pnpm 12.8.1, TypeScript 6.0.3, Wrangler 4.143.1 and Prettier 3.9.10. Node/pnpm run local tools; Cloudflare Workers execute the deployed application. Bun is not part of this tested command contract. Use `pnpm install --frozen-lockfile`; the existing reviewed esbuild/workerd native-build policy stays in `pnpm-workspace.yaml`.

| Command | Verifies or does |
| --- | --- |
| `pnpm dev` | Strictly checks/emits local source, then starts Wrangler. |
| `pnpm source:write` | Strictly checks Worker/browser source and emits committed readable distributions in memory. |
| `pnpm check:types` | Checks configuration-derived bindings and both strict compiler environments, then rejects stale generated files. |
| `pnpm lint` | TypeScript semantic unused-local/parameter checks over maintained Worker/browser source. This initial scoped lint is not an ESLint claim. |
| `pnpm format:check` / `pnpm format` | Checks/formats the maintained sources/configuration/build gates listed in `scripts/format-source.mjs`. |
| `pnpm test` | Runs existing Node behavior and release-boundary tests. |
| `pnpm check` | Types, generated parity, semantic lint, formatting and tests. |
| `pnpm build` | Type/parity gate plus a credential-free Wrangler dry run. |
| `pnpm deploy` | Existing exact clean pushed-main guard, quality/build gates, upload and live identity/sharing checks. |

`src/worker.ts` uses actual Fetcher/ExecutionContext types. `worker-configuration.d.ts` is generated with project-local `wrangler types --include-runtime=false --strict-vars=false`; rerun after binding changes. Worker compilation uses Workers globals; browser compilation uses DOM globals in `tsconfig.browser.json`, without combining incompatible global environments.

Maintained browser source: `src/browser/navigation.ts` → `public/brand/navigation.js`. `src/publisher.mts` produces its `.mjs` and `.d.mts` together; declarations no longer independently assert an unchecked implementation. Build/check never write a temporary project or require a compiler in the deployed browser. Edit the TS/MTS source, run `pnpm source:write`, and commit the reviewed source and output together.

Scope exceptions remain explicit: small Node distribution/test tools are JavaScript; shared launcher/sharing/performance files and vendor bundles retain their existing independent copied-source/provenance boundaries and notices. The launcher is checked and copied from Composer; no runtime Composer dependency is added. Legacy tooling outside the formatter's listed scope is not claimed to be newly formatted. Wider #175 coverage and Composer's verified Get Ready snapshot integration remain separate gates.
