Published Site v90 successfully: runtime a07b4b3b29b3272e11b91a95ba9c56855d16e104; deployment appgdep_6aee92fde85c8191af76fe941d38d588. Build PASS. Signed-in production file workflow remains NOT VERIFIED. GitHub unchanged.

## 2026-11-07 · Private file usage overview (round counter 6)

Implemented owner-authorized database usage summary: all-task account slot occupancy/remaining capacity plus selected-task stored, uploading and deletion-pending counts. Deleted rows release capacity; other accounts are excluded. New-upload closure does not hide existing usage. UI renders Chinese, English and Italian with a quota meter explicitly separate from evidence completion. Refresh-based snapshot, not measured R2 bytes or a quota guarantee during concurrent writes. No evidence-level, PACI, disclosure, pricing or schema changes. Engineering test cap remains 20 files, not commercial policy.

Validation: 366 automated tests PASS (3 added), 0 failed/skipped; TypeScript PASS. Evidence: docs/evidence/private-file-usage-tests.log. Previous 18 local runtime recovery checks were not rerun and are not cloud acceptance. Signed-in production verification remains outstanding; real customer intake and new file test admission remain closed. GitHub not synchronized. Deployment receipt follows.

## Current access rule · v88 (supersedes earlier blanket gate wording)

PRIVATE_FILE_TEST_ACTOR_IDS controls NEW UPLOADS only. Authenticated task owners retain list/history/download/delete/cleanup access to their own existing files when upload eligibility closes. All ownership and same-origin mutation checks remain mandatory. No grant to buyers or arbitrary authenticated accounts is introduced. List returns can_upload; a false value hides the upload form while keeping owner management visible. Bucket failure prevents byte operations, not metadata/history queries. Real-customer intake stays closed. Earlier release notes describing every operation as test-gated are historical.

# Private file staging — v83

## Purpose and gate
Prepare real binary storage code without accepting real customer documents yet. The production route is CLOSED unless a server operator explicitly configures PRIVATE_FILE_TEST_ACTOR_IDS as a JSON string array of existing Sites actor IDs. Empty, invalid or absent configuration denies access; do not use emails or guess an actor ID. The R2 binding is BUCKET and metadata lives in D1. No test actor was configured this round.

## API contract
All operations require hosted sign-in and ownership of the task in the task query parameter. All responses use no-store. A collapsed browser panel now appears inside each selected private task. Click Check file access / Refresh; only successful access exposes the upload form. A closed gate exposes no upload controls.
- GET /api/private-files?task=TASK: list up to 20 active files. No object keys or other owner IDs returned.
- POST same path: raw bytes; Content-Type application/pdf, image/png or image/jpeg; Idempotency-Key 1–128 ASCII letters/digits/underscore/hyphen; X-File-Name percent-encoded filename; X-Dossivo-File-Confirmation synthetic-test-only-v1; exact same Origin required. Upload only synthetic fixtures while testing. Filename disallows path separators/control characters. Maximum 2 MiB, maximum 20 nondeleted files per account across all tasks.
- GET same path plus &file=ID: integrity-checked attachment download for the owner only. No inline rendering or shareable signed URL.
- DELETE same path plus &file=ID: same Origin required; hides access then removes object; repeated deletion is safe. Failed removal remains DELETING and can be retried.

## Reliability
D1 reserves capacity before R2 put. Request keys cannot rewrite an earlier upload; pending retries get FILE_NOT_READY. A failed put attempts cleanup; an upload overtaken by delete cleans up its late put. A lost successful response is retried with the same key and bytes. A crashed request may leave UPLOADING or DELETING metadata; the owner can remove it. User-triggered per-task recovery is implemented in v86; scheduled reconciliation is not implemented. Successful object deletion does not promise erasure of previously downloaded copies or independent backups. Deleted metadata retains ID, owner/task linkage, size, type, digest and timestamps but clears the filename; production metadata-retention policy remains to be set.

## Boundaries before real intake
Signature screening is NOT antivirus, a full parser, PDF sanitization, OCR, document authenticity or regulatory approval. STORED_UNREVIEWED never becomes an evidence material automatically. Downloads must not enter buyer projections, AI calls, immutable evidence or PACI until explicit reviewed integration is implemented. This staging bucket is platform cloud storage; sovereign/external-storage users must not be silently redirected into it.

Remaining: real R2 + two-account browser acceptance using synthetic fixtures, scanning/quarantine and approved parser, scheduled reconciliation if required, operational retention/deletion and restore verification, source linkage into task material versions. Keep production customer intake closed until these gates are accepted. No runtime secrets, filenames from customers, or real samples are in source/tests.

## Test evidence
v83: 334 tests pass (10 new), docs/evidence/private-file-tests.log. v84: 341 tests pass (7 new), docs/evidence/private-file-ui-tests.log. SQLite is real local SQLite; R2 is an in-memory test double. Production deployment success does not establish a successful R2 upload.

## v84 client retry boundary
The current mounted panel retains the upload request key after uncertain responses; reselecting a file, changing task/language or reloading creates a new attempt. Before retrying after a reload, refresh and inspect stored files to avoid creating a deliberate duplicate. No file bytes, access tokens or request identifiers are persisted in browser storage. Unmount aborts client requests; abort does not prove the server did not save the file. Refresh checks the result.

Online environment inspection confirmed no PRIVATE_FILE_TEST_ACTOR_IDS is configured. For authenticated acceptance, first identify a real signed-in tester actor ID and explicitly configure only that actor; never guess an ID or enable all users. Do not supply real customer files. Actual R2 and browser acceptance remain pending.

## v85 test-account handoff
The signed-in /account page now displays the current site's actor ID with a copy button and the same test-access decision as the upload API. Anonymous users see neither the ID nor the test panel. The owner must first sign in and provide this displayed ID for a narrow synthetic test configuration. No secret or password is required. Do not confuse a public contact ID, email, or project-editor account ID with the site's actor ID. Cloud-browser verification on 2026-11-07 observed a signed-out account page; authenticated R2 acceptance remains blocked.

## v86 interrupted-upload recovery
POST /api/private-files?task=TASK&action=cleanup, same Origin and current authenticated test account required. No file body or upload key is needed. The UI asks for confirmation. It retries DELETING objects and removes UPLOADING objects whose server timestamp is at least 15 minutes old; up to 20 candidates. A conditional state update prevents deleting an upload that became STORED_UNREVIEWED after discovery. Counts returned: examined, deleted, pending, skipped. Pending is not a successful deletion; repeat the action when storage recovers. Missing objects may be deleted idempotently. Delayed puts after a cleanup are cleaned by the uploader failure path.

This is a manual recovery action, not an unattended job, production retention policy, scan or evidence assessment. Stored files are not bulk-deleted. 351 total tests pass, including six new recovery/client tests; log docs/evidence/private-file-recovery-tests.log. Actual hosted storage acceptance still awaits a confirmed test actor ID.

## v87 state history
Migration 0024 adds dossivo_private_file_events and insert/state-change triggers. They run in the same SQLite statement transaction as the file change. Update/delete of event rows is denied by triggers; privileged administrators can still alter schema, so do not call this chain immutability. No old events are backfilled. No event is emitted for same-state retries; this is state history, not an attempt log or download-access log.

GET /api/private-files?task=TASK&history=1&before=CURSOR is authenticated, gated and owner-only. Empty cursor loads newest; later cursors are positive safe integers from next_before. Page size is 50. A new collapsed viewer in the file panel reads and paginates history. Deleted originals leave state history with only opaque file IDs, from/to state, database time and sequence; no file names, object keys or content. This metadata still requires a production retention policy; no infinite-retention promise is made. Human/AI execution and PACI attribution remain separate unfinished work.

358 tests pass; new history tests execute the actual SQLite trigger migration and use the existing R2 double. No production originals or test account grants were created.

## v88 validation
360 tests pass; log docs/evidence/file-owner-access-tests.log. Real production identity/storage acceptance still pending. No runtime access configuration or schema migration in this release.

## Reproducible local runtime acceptance
Run `node scripts/verify-private-file-runtime.mjs` from this checkout. Uses Wrangler's installed Miniflare dependency, not an extra package or cloud account. Creates isolated temporary D1/R2 storage, applies all SQL migrations, then runs nine checks against the actual service function and runtime-provided storage objects. Synthetic actor IDs are passed explicitly; authentication headers and hosted sessions are not validated. Final disposal removes only the created temporary directory.

Actual result 2026-11-07: 9/9 PASS; docs/evidence/private-file-runtime.log. Production R2 and two authenticated browser accounts remain pending.

## Persistence after runtime restart
The same local runtime script now disposes/recreates Miniflare twice against the same test-only disk persistence paths, first with a stored file and then with that file deleted. No migration or seed is repeated. Five additional checks confirm retained bytes/metadata, owner/admission boundaries, idempotency, deletion and exact immutable events. Result: 14/14 PASS in docs/evidence/private-file-restart-runtime.log. This is graceful local runtime restart only; abrupt failure and production backup/restore remain unverified. Temporary test storage is removed after completion.

## Isolated snapshot restore rehearsal
Local script now runs 18 checks including paired-store offline snapshots and restore to a different temporary directory. It confirms stale snapshots retain later-deleted files and tests deletion-manifest replay before release. See FILE_RESTORE_RUNBOOK.md. Production backup coordination and independent deletion records are not implemented; latest audit history is not reconstructed by the local rehearsal.
