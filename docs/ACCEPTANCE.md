# Acceptance Record

| ID | Result | Evidence |
| --- | --- | --- |
| WP1-U01 | Pass | Four tests cover workflow gates, risk bounds, language invariants and fictional expert labels. |
| WP1-D01 | Pass | Bounded schema-only migration applied locally. |
| WP1-B01 | Pass | Production build emitted Worker routes and migration metadata. |
| WP1-E01 | Pass | Browser completed all eight stages and persisted case version 8. |
| WP1-E02 | Pass | Link 1 returned only card and scope fields and decremented remaining views. |
| WP1-S01 | Pass | UI and repository block real originals and label synthetic data. |

WP2 security and privacy gates remain intentionally unverified.

## PACI bridge acceptance — 2026-10-26

The new bridge is a DOSSIVO preparation workflow, not a connected PACI implementation. Its 17 tests run against the generated SQLite schema and exercise authentication, tenant separation, idempotent retries and payload conflicts, fixed versions, atomic rollback, concurrent updates, challenge history, reopening persistent storage, digest tampering, and failure projection.

Ten additional proof-link checks execute the real route and Drizzle SQL against SQLite. They cover frozen versions, missing snapshots, access revocation/expiry races, view consumption and obsolete client requests. The existing 27 workflow/newsletter tests remain in the suite. Total: 54 checks.

Full TypeScript checking and the Worker build are required. Browser end-to-end acceptance is not claimed: the current local preview cannot complete the D1 migration because the runtime denies its loopback listener. This limitation does not establish a defect in the deployed database or a pass for browser interaction.

PACI core 0.1's original 22 passing tests and the separate known-issue probes are documented in `PACI_CORE_0_1_REVIEW.md`. Known-issue probe exit code 0 means the old defect was reproduced; those scripts are not product acceptance tests.
