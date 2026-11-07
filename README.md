# DOSSIVO — Evidence preparation workbench

[Live application](https://dossivo-outcome-workbench.xugv.chatgpt.site)

Current source includes private versioned synthetic evidence tasks, source/copy/translation lineage, all repeated field candidates, confirmation history, conservative ambiguity checks, private frozen cards, tiered buyer access, contact consent and structured evidence messaging, account contact preferences, and approval-gated partner applications/contracts.

## Verification and handoff

Latest local suite: **287 passed, 0 failed**. TypeScript passed. See [release evidence](docs/RELEASE_EVIDENCE.json) for the exact deployed version, build status and limitations. Historical counts are not current results.

- [Development status](docs/DOSSIVO_STATUS.md)
- [Compatibility matrix](docs/PACI_COMPATIBILITY.md)
- [Acceptance report](docs/ACCEPTANCE_REPORT.md)
- [Handoff](docs/HANDOFF_DOSSIVO.md)
- [Latest test log](docs/evidence/repeated-field-tests.log)
- [Material lineage](docs/MATERIAL_LINEAGE.md)
- [Build and runtime](docs/BUILD_AND_RUNTIME.md)

## Run

Node >=22.13. Install the pinned dependencies, run `npm test`, `node node_modules/typescript/bin/tsc --noEmit`, and `npm run build`. Hosted operation requires configured Sites/Cloudflare Worker, D1 and ChatGPT authentication. Apply SQL migrations in order through 0022; source alone does not provision the hosted services.

## Boundaries

Evidence inputs remain synthetic only. Real labour originals, OCR/AI extraction, autonomous HR Agent execution, production enterprise-storage connectors, email/SMS verification and notifications are not enabled. Authenticated multi-account browser acceptance remains incomplete. PACI integration does not constitute a formal on-chain proof or compliance certification.

Partner terms are runtime-only confidential documents released to explicitly approved accounts; no real contracts, commission schedules, administrator credentials or user records belong in this repository. Current source snapshots are synchronized without importing the private development repository history. Optional account contact details remain private and unverified. Development does not gate Chinese language or China-region users; launch policy is separate.

Historical designs, thresholds and prototype prices are not adopted policy. No software licence grant is added by this synchronization.
