# Dossivo Outcome Workbench

First runnable work package for Dossivo, governed by Product Constitution v2.0 dated 2026-09-18.

## What runs

The application persists one tenant-scoped synthetic outcome and demonstrates:

1. choose a buyer evidence goal;
2. complete an adaptive self-check;
3. extract traceable facts from synthetic materials;
4. generate gaps and remediation tasks;
5. record enterprise fact confirmation;
6. preview Chinese, English and Italian card versions;
7. create an authorized, expiring, count-limited Link 1; and
8. show explicitly fictional expert candidates when a professional gap remains.

The application intentionally rejects real original files. Customer-held-key processing, Link 2, production language gates and real professional directory data belong to later work packages.

## Run locally

```bash
pnpm install
pnpm db:generate
pnpm build
node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_majestic_lethal_legion.sql
pnpm dev
```

Open the printed local URL. Use `pnpm test`, `pnpm lint` and `pnpm build` for verification.

## Environment and bindings

- `DB`: Cloudflare D1 logical binding declared in `.openai/hosting.json`.
- No application secrets or external model keys are required for this synthetic work package.
- Signed-in identity comes from the hosting platform's authenticated-user headers. Anonymous visitors use separate browser sessions with random, HTTP-only cookies; no shared demo-owner fallback is used.
- The public demonstration uses synthetic materials only. Do not enter confidential information. Anonymous-session rate limits, retention and quotas remain production-readiness work.

## Architecture

- Vinext / React / TypeScript modular monolith
- Cloudflare D1 with generated Drizzle migrations
- Versioned, server-authorized workflow actions with idempotency keys
- Separate Link 1 read API that returns card fields only
- Deterministic controls for workflow state, authorization expiry and view limits

See `docs/HANDOFF.md` for the demo and `docs/STATUS.md` for exact readiness labels.

## 2026-11-05 continuation

Read `docs/HANDOFF_DOSSIVO.md` first for current scope, source versions and actual acceptance. The existing Site now contains `/protocol` and an authenticated private synthetic task panel at `#private-tasks`. Do not upload real labour originals. No model or on-chain execution is claimed.

Install the lockfile dependencies with the repository's existing install workflow, then run `npm test`, `node node_modules/typescript/bin/tsc --noEmit`, and `npm run build`. Database migrations are schema-only under `drizzle/`; apply each pending local migration once following the starter instructions. Publishing applies hosted migrations separately. The optional real HTTP integration script requires the existing separately maintained PACI core directory; it does not download or fork that core.
