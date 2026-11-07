# File restore runbook — local rehearsal, not production automation

Implemented rehearsal: `node scripts/verify-private-file-runtime.mjs`.
Current result: 18/18 PASS, docs/evidence/private-file-restore-runtime.log.

The script uses synthetic identities and PDF-shaped bytes. All storage is in a unique temporary directory; the runtime is stopped before copying local D1 and R2 directories together. A second independent directory restores the copy. All directories are removed after runtime disposal. No customer or cloud data is backed up by this script.

## Observed boundaries
- D1 alone is not a file backup: R2 bytes must be captured consistently with metadata.
- Restored events match the snapshot time, not events that happened later.
- A stale snapshot can restore a subsequently deleted file. The test explicitly proves this risk.
- The rehearsal keeps current deletion metadata in memory, then replays it against the restored test store before permitting release. This is NOT an independent durable production deletion ledger.
- Authentication is injected for testing. No actual login, host migration or cloud storage recovery is verified.

## Production prerequisites before enabling restore
1. Stop or consistently coordinate writes; take versioned, access-controlled database and object snapshots with verified manifests.
2. Retain the current deletion/revocation information separately from the rollback target. Define retention and access policy; do not promise deleted originals are instantly erased from all backups.
3. Restore into an isolated environment closed to customers. Verify file hashes, owner IDs, grants and snapshot coverage.
4. Reconcile post-snapshot deletions and revocations before exposing any restored data. If current deletion information is unavailable, do not open the restored file service.
5. Verify the required event history; do not invent or overwrite missing events. Record gaps and recovery decisions separately.
6. Complete owner/non-owner and upload-admission tests, then explicitly release the recovered service.

No production provider, credentials, scheduled backups or automatic restore jobs were configured. This checklist does not establish legal retention periods or an uptime guarantee.
