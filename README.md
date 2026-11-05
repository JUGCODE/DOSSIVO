# DOSSIVO — EULC Proofline

[Live application](https://dossivo-outcome-workbench.xugv.chatgpt.site)

Full source snapshot of Site v41, 2026-11-05. Runtime commit: `880f960a41b7148a223a1b82d7cb088a2783233a`; source and delivery receipt: `a5e588e6f3e554f854377ad78024754f33c2b73c`.

## Implemented

- Private versioned evidence preparation, material coverage, review, findings and frozen cards.
- Temporary and continuous authorised summaries, revocation, publication history, downloads and access records.
- Direct contacts, invitation links, QR sharing, referrals, bilateral conversations and unread counts.
- Structured evidence requests and responses, fixed authorised card references and request tracking.
- Contact-to-existing-grant navigation and incoming workbench request tasks with private task association.
- Protocol interface, sidebar pricing, theme controls and combined sign-in entry.

## Verification

The latest local run passed **192 tests, 0 failures**. [Exact test log](docs/evidence/workbench-requests-tests.log). Test source is in [tests](tests). TypeScript and Worker build passed. These are service/source tests, not a claim that authenticated two-account browser acceptance or production compliance is complete.

Run: `npm test` (Node >=22.13). See [build/runtime setup](docs/BUILD_AND_RUNTIME.md); the deployed app uses Sites/Cloudflare Worker, D1 and ChatGPT sign-in. This repository alone does not provision those services.

## Authoritative status and handoff

- [Current status](docs/DOSSIVO_STATUS.md)
- [Compatibility matrix](docs/PACI_COMPATIBILITY.md)
- [Acceptance report](docs/ACCEPTANCE_REPORT.md)
- [Handoff](docs/HANDOFF_DOSSIVO.md)
- [Release evidence](docs/RELEASE_EVIDENCE.json) — latest_release is authoritative; earlier entries are historical.
- [HR Agent interface plan](docs/HR_AGENT_INTERFACE_PLAN.md)

## Boundaries

Synthetic test data only. Real sensitive originals, autonomous HR Agent uploads, actual PACI scan action recording and email notifications are not connected. HR Agent UI is explicitly planned. No formal on-chain verification is claimed. Development currently does not gate China regions or Chinese language; commercial release policy remains separate. Historical design documents and prototype prices are not adopted policy or current test results.

This upload contains source, assets, schema migrations, tests and documentation. It excludes installed dependencies, generated deployment bundles, local databases and credentials. No software licence grant is added by this synchronization.
