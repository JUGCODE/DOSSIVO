# DOSSIVO — EULC Proofline

[Live application](https://dossivo-outcome-workbench.xugv.chatgpt.site)

Full source snapshot of Site v57, 2026-11-06. Runtime commit: `36ea9c4579e0f715bdc4b7fc0ac32c8e050e8a3d`; source and delivery receipt: `5568f549bda586e2efaad2785410671c26947da9`.

## Implemented

- Private versioned evidence preparation, material coverage, review, findings and frozen cards.
- Temporary and continuous authorised summaries, revocation, publication history, downloads and access records.
- Direct contacts, invitation links, QR sharing, referrals, bilateral conversations and unread counts.
- Structured evidence requests and responses, fixed authorised card references and request tracking.
- Contact-to-existing-grant navigation and incoming workbench request tasks with private task association.
- Request filtering by status, topic and month, global counts, paginated same-month task matching, and manual task creation and association.
- Isolated conversation drafts and synchronous operation locking to prevent overlapping sends.
- Explicit contact-request responses using separately redeemed, authorised fixed cards; same-month and recipient checks, with revocation enforced on access.
- Buyer grant overview with active/expired/revoked filters, complete account totals and pagination.
- Persistent enterprise-storage deployment preferences (connector not enabled).
- Unified account entry and optional unverified email/international phone contacts, with storage confirmation and clearing.
- Protocol interface, sidebar pricing, theme controls and combined sign-in entry.

## Verification

The latest local run passed **221 tests, 0 failures**. [Exact test log](docs/evidence/cross-contact-card-tests.log). Test source is in [tests](tests). TypeScript and Worker build passed. These are service/source tests, not a claim that authenticated two-account browser acceptance or production compliance is complete.

Run: `npm test` (Node >=22.13). See [build/runtime setup](docs/BUILD_AND_RUNTIME.md); the deployed app uses Sites/Cloudflare Worker, D1 and ChatGPT sign-in. This repository alone does not provision those services.

## Authoritative status and handoff

- [Current status](docs/DOSSIVO_STATUS.md)
- [Compatibility matrix](docs/PACI_COMPATIBILITY.md)
- [Acceptance report](docs/ACCEPTANCE_REPORT.md)
- [Handoff](docs/HANDOFF_DOSSIVO.md)
- [Release evidence](docs/RELEASE_EVIDENCE.json) — latest_release is authoritative; earlier entries are historical.
- [Enterprise storage design](docs/ENTERPRISE_STORAGE_DESIGN.md)
- [Registration boundaries](docs/ACCOUNT_REGISTRATION_BOUNDARIES.md)
- [Cross-contact card responses](docs/CROSS_CONTACT_CARD_RESPONSES.md)
- [HR Agent interface plan](docs/HR_AGENT_INTERFACE_PLAN.md)

## Boundaries

Evidence workflows use synthetic test data only. Optional account contact details are private, unverified settings; email/SMS verification and independent email/phone sign-in are not implemented. Real sensitive originals, autonomous HR Agent uploads, actual PACI scan action recording and email notifications are not connected. HR Agent UI is explicitly planned. No formal on-chain verification is claimed. Development currently does not gate China regions or Chinese language; commercial release policy remains separate. Historical design documents and prototype prices are not adopted policy or current test results.

This upload contains source, assets, schema migrations, tests and documentation. It excludes installed dependencies, generated deployment bundles, local databases and credentials. No software licence grant is added by this synchronization.

## GitHub synchronization — 2026-11-06

This sync supersedes earlier handoff notes deferring GitHub upload. It includes the current v57 source and subsequent test/documentation updates; it does not redeploy the application. [Browser acceptance checklist and remaining blocker](docs/COMMUNICATION_BROWSER_ACCEPTANCE.md).
