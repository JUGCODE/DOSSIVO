# Enterprise-controlled storage — scoped design, 2026-11-06

## Delivered
Account-scoped deployment preference in the existing private material workbench, in Chinese, English and Italian. Collapsed by default. Authenticated GET/POST /api/storage-preferences; only NONE, LOCAL_ORIGINALS and PRIVATE_DEPLOYMENT. Version-checked writes prevent stale overwrite. NONE withdraws interest; it does not erase evidence or existing sharing history. No company-representative verification is implied. No host address, secrets, documents or free-text business data are collected. Migration 0015 is additive.

This is a preference, not an active deployment configuration. No change to storage location, grants, evidence levels, real-original upload, region policy or PACI execution. No email or sales outreach is triggered.

## Preferred future architecture (not implemented)
1. Enterprise custodian node: encrypted originals, enterprise-held keys, local OCR/AI, version retention and tested backup recovery. External AI calls must not be described as in-domain processing.
2. DOSSIVO control plane: explicit enterprise approval of minimal summaries and publication manifests. Existing buyer grants govern published snapshots; no new entitlement arises from a connector.
3. Separate connector health, evidence period, freshness assessment, integrity assessment and original inspection availability. Never collapse them into a green compliance badge. Unknown is explicit; freshness policy depends on material type and applicable rules, not invented universal expiry.
4. Offline connector: authorised published snapshots remain readable under existing grant rules, labelled with their publication date and original inspection unavailability. A snapshot is not live status. Revocation remains effective for future access; downloaded copies cannot be recalled.
5. Outage is not a non-compliance determination. Already disclosed findings/remediation history are not selectively erased by disconnection. Retention and legal obligations require separate policy before real data launch.
6. Original inspection requires separate authorisation, least privilege and auditable access. Remote viewing is external disclosure even when originals are not persistently copied to DOSSIVO.
7. Future PACI scan adapter records human/AI provenance and version commitments using the actual upstream interface. No new PACI core. Hash matching supports byte integrity, not factual truth or legal certification. Sensitive raw originals do not go on chain.

## Activation gate (future work)
Enterprise authority verification; outbound connector enrollment and credential rotation; granular grants; verified local processing boundary; health/freshness UI; integrity checks; backup/restore drills; outage and revoke tests; authorised original inspection; monitoring and operational ownership. Full private deployment remains a separate later offering. No fee, SLA, expiry threshold or compliance assurance has been adopted.

## Verification
205 tests pass, 0 fail; three new service tests cover persistence/isolation, stale writes/withdrawal, strict input/authentication. TypeScript and whitespace checks pass. Local browser preview unavailable: managed launcher reports another vinext server, then stopped status. Browser and authenticated end-to-end acceptance are unverified. See docs/evidence/storage-preferences-tests.log. Build/publication result is recorded separately in release evidence.


## 2026-11-06 · Storage preference retry recovery

Exact immediately preceding transitions can be retried after a lost response without creating another preference version. Old retries cannot overwrite withdrawal or later changes, including a later matching preference. This is transition-based recovery, not an indefinite idempotency-key ledger. UI retains selection on network/server uncertainty; version conflicts require explicit reload. Added language-correct sign-in return link and last-saved timestamp. Timestamp describes preference saving, never evidence freshness.

Validation: 207 PASS / 0 FAIL, two new retry/withdrawal regressions; TypeScript and diff checks passed. Log: evidence/storage-preference-retry-tests.log. No migration or PACI/permission change. Browser authenticated acceptance remains pending; previous managed-preview blocker remains unresolved. Publication receipt: RELEASE_EVIDENCE.json.
