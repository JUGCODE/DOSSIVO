# Round 46 — anti-phishing acceptance and activation boundary

Foundation stage only. The uploaded confidential specification itself is not committed. No live verification records or keys were seeded. Environment settings must not be activated until actual share issuance/revocation and authorization integration is complete.

| Requirement | Current evidence / remaining work |
|---|---|
| P1 | Internal registry creates code/fingerprint/token; not connected to actual share modal/page/downloads. |
| P2 | Metadata-only lookup and UI implemented; local tests pass. Production domain/keys absent. |
| P3 | Revoked/expired projection returns status/date only; local tests pass. Link lifecycle synchronization still required. |
| P4 | NOT_FOUND for unknown codes tested; configuration failure is separately UNAVAILABLE. |
| P5 | Response omits all names, relationship, evidence and internal share IDs. Owner-approved supplier display name not implemented. |
| P6 | New signing primitive rejects every single-character token change in tests. Legacy share routes NOT migrated. |
| P7 | Persisted limiter denies eleventh IP/minute and thirty-first code/hour; local tests. Trusted production CF header provenance must be verified before activation. |
| P8 | New verification UI has no password input; legacy proof notice added. Browser HTML acceptance not run. |
| P9 | Login frame-ancestors/HSTS policy not added or verified; hosted identity path needs platform-compatible review. |
| P10 | SPF/DKIM/DMARC, sender domain, email templates and abuse mailbox not configured/verified. |
| P11 | No messaging changes this round; system/user notification marker protection not re-audited. |
| P12 | Independent registry records/codes preserve old snapshots in tests; actual share-update linkage pending. |
| P13 | Key-ID/region signature verification retains old-key compatibility in tests; no production key rotation performed. |
| P14 | No report queue or screenshot intake yet. UI accurately states channel pending; no fake successful reports. |
| P15 | PACI anchoring remains disabled; no on-chain writes made. Salted commitment integration pending separately. |

## Required decisions and next implementation

Founder must confirm official primary domain and abuse mailbox; neither is guessed. Monitoring provider/manual approach and passkey/TOTP timing remain undecided. No monitoring automation was created.

Next implementation must atomically bind registry issuance to an authorized immutable disclosure, propagate revocation/expiry (and consumption semantics where applicable), migrate signed rendering without silently relabeling old links, add verification metadata to exports, and test all disclosure layers. Internal `register` is an integration primitive, not proof of permission or a public API. Revocation currently has database constraints but no public/admin mutation endpoint. Retain old verification keys for outstanding link lifetimes; never expose keys to client code or repository. New record IDs/signatures alone must not grant evidence access.

Configuration names: DOSSIVO_OFFICIAL_DOMAIN, DOSSIVO_VERIFY_REGION, DOSSIVO_VERIFY_ACTIVE_KEY, DOSSIVO_VERIFY_KEYS (map of key IDs to 32-byte hex secrets), DOSSIVO_VERIFY_RATE_KEY (separate 32-byte hex secret). None were configured in production. Tests use example.org and synthetic keys only. Raw IPs are not stored; rate-bucket hashes are ephemeral. Limit behavior at fixed window boundaries and denial-of-service tradeoffs require deployment review.

An active registry record is not proof that a page displaying its code is genuine. Users must navigate independently to the confirmed official channel; authorized content/file verification requires more than visually matching a copied short fingerprint. Do not market this feature as impossible to forge, proof of factual truth, legal compliance, or absence of forced labour.

## Round 47 delta

Founder deferred official domain and abuse email; keep pending without prompting again. P3 source revocation/expiry and exhaustion now derive from the bound legacy proof source. P6 signed proof API resolution is connected behind domain/key configuration, followed by original access/view-consumption checks. P12 bound snapshots are protected by database triggers. Internal binding is owner-checked and atomic; public lookup requires a bound source. These are tested with synthetic fixtures, not live issuance. P1 public issuance/modal/export integration, recoverable issuance retries, domain activation and other open P-items remain unfinished. No production settings changed.


Round 49 update: P1/P12/P13 internal issuance recovery now preserves the same registry, code and token across concurrent retries/restarts, retaining the original key ID. Missing original keys/configuration or inactive sources deny recovery. Migration 0043 stores immutable non-secret derivation metadata; no plaintext code storage. 564 unit/integration and 13 local workerd/D1 checks passed. Share UI/export rollout, official-domain activation and browser acceptance remain pending.

Round 50 update: P1/P6/P8 signed proof responses and the viewer now carry genuine registered verification metadata; legacy links do not acquire a signed label. Metadata-only JSON download includes no bearer, evidence body or buyer identity and asserts no current ACTIVE status. P1 full card export/share-modal integration remains pending. 568 unit/integration and 15 local workerd/D1 checks passed. No production configuration or browser acceptance claimed.
