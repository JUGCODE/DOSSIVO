## 2026-11-07 · Development 39: recover unbound TEST sessions before stopping

Release: v122 deployed successfully; build PASS. Runtime commit 8aec81ac2f438048be17e78fe68a8853955c5da2; deployment appgdep_6aef41af49548191a45e853d2acd41f4; environment revision 0 unchanged.

Implemented provider-read recovery for an existing test order with durable stop intent but no saved session ID. Cancellation now lists existing Checkout sessions within the order creation/expiry interval (300-second lower-bound clock margin), at most two pages of 100. It never replays session creation. A single matching server order reference must also match TEST mode, subscription mode, amount, currency, creation interval, expiry and supported status. Only after complete bounded enumeration is the session ID bound conditionally, then the existing retrieve/expire workflow runs. Checkout URLs and unrelated provider records are neither stored nor returned by recovery.

No match leaves REQUESTED with NOT_FOUND_YET; a later explicit retry can recover. Multiple matches, malformed pages, repeated IDs, inconsistent details or incomplete pagination refuse binding. An already-expired session becomes EXPIRED_CONFIRMED after retrieval; an already-completed one becomes COMPLETED_REVIEW. Database/network failures and concurrent retries preserve stop intent and converge on the saved binding. Browser input cannot select a provider ID. Chinese/English/Italian status copy explains that stop retry searches existing sessions.

Validation: 511 automated tests PASS / 0 failed / 0 skipped (7 added); TypeScript PASS. 15 local HTTP Miniflare/workerd/WebCrypto + D1 checks PASS (2 added: unbound recovery/expiry with no URL disclosure and restart persistence). Providers in tests are synthetic; no real Stripe credentials configured, no outbound Stripe request or charge. Browser and real-provider integration NOT VERIFIED. Logs: docs/evidence/round39-tests.log, round39-types.log, round39-runtime.log. Build/publication receipt recorded after completion.

Compatibility: no database migration this round; existing 0037 cancellation columns and session uniqueness reused. No changes to PACI, evidence authorization, draft history, subscription entitlements, live payment gate or hosted configuration. Real sensitive intake CLOSED. No public GitHub synchronization.

Boundaries: recovery is explicit on a stop retry, not a background scheduler. List results are not a provider-wide transaction; an in-flight creation may become visible later, so an empty result never confirms absence or cancellation. The two-page/200-session cap is a technical safety bound, not a commercial quota; larger intervals stay pending for further review/tooling. Paid subscription activation, renewals/refunds, full historical order controls and real Stripe TEST merchant validation remain unfinished. Missing binding recovery is now implemented under these boundaries; historical notes below describe earlier states.

Next: securely connect a designated Stripe TEST merchant and verify hosted end-to-end behavior; add bounded background retry orchestration and operator review for incomplete scans before any live-payment lifecycle.

## 2026-11-07 · Development 38: durable TEST checkout stop requests

Release: v121 deployed successfully; build PASS. Runtime commit acf69341aa7e56f0e76854aec2a9effc3fc354c4; deployment appgdep_6aef4005c58881919bc63deda1c6f324; environment revision 0 unchanged.

Implemented owner-only `cancel_test_checkout` command on `/api/payments/test-checkout`. Input accepts organization, saved draft version and explicit confirmation; the provider session ID and URL come only from the server order. Stop intent is persisted before remote work. The adapter retrieves the bound TEST session, validates ID/reference/mode/amount/currency, expires open sessions using a fixed provider endpoint and deterministic idempotency key, then records only confirmed outcomes. Already-expired sessions converge without another POST; already-completed sessions become COMPLETED_REVIEW, never refund/cancellation success. Network/provider/database failures retain REQUESTED for retry.

Migration 0037_amused_archangel adds nullable requested/resolved timestamps and outcome. Draft withdrawal and corresponding stop intent commit in the same transaction. The withdrawal API attempts remote expiry after committing; failure does not roll back the withdrawal or falsely confirm expiry. Creation checks durable stop intent before sending/returning a URL. When withdrawal races with a successful in-flight creation, the session is bound for reconciliation and expiry is attempted without returning the URL. Stop retries do not re-create checkout or overwrite the original request time.

Three-language account status now distinguishes REQUESTED, EXPIRED_CONFIRMED and COMPLETED_REVIEW; explicit confirmation precedes a new stop. Pending requests for older draft versions remain visible and retryable, bounded to 20 per read with a more-results notice. Payment receipt results remain separate and unchanged; stopping a link does not reverse payments, refund, cancel subscriptions or grant evidence access.

Validation: 504 automated tests PASS / 0 failed / 0 skipped (10 added); TypeScript PASS. 13 local HTTP Miniflare/workerd/WebCrypto + D1 checks PASS, including two new synthetic-provider expiry/persistence checks. The first new runtime check correctly stayed REQUESTED because its synthetic key failed the configuration gate; fixed the test fixture, reran successfully. No real credentials configured, Stripe calls or charges. Browser/real-provider verification NOT PERFORMED. Logs: docs/evidence/round38-tests.log, round38-types.log, round38-runtime.log. Build/publication receipt follows.

Boundaries: no automatic background retry worker yet; retry is explicit, and pending does NOT mean the remote link is unusable. If session creation succeeded remotely but its response was lost and no session ID was bound, stop remains pending; recovery of that missing provider binding is not implemented this round. An already handed-out link remains potentially usable until provider confirmation. Saving a replacement draft alone does not automatically expire older sessions; explicit stop remains available for the latest order and queued stop requests. Full historical order management, live financial settlement, refunds/renewals and paid entitlement lifecycle are still pending.

Compatibility: additive migration, unchanged draft history, actor ownership, PACI core and evidence authorization. Checkout configuration moved to a shared module while retaining its prior export. Real sensitive intake CLOSED; live billing unsupported; hosted configuration unchanged. No public GitHub synchronization.

Next: recover uncertain/unbound provider sessions and add automated bounded retries; validate real Stripe TEST account and hosted webhook delivery before live-payment lifecycle work.

## 2026-11-07 · Development 37: owner-visible TEST receipt reconciliation

Release: v120 deployed successfully; build PASS. Runtime commit d1cc604ed3f03829d5621e26a085364a50b1c8a7; deployment appgdep_6aef3dddef088191b2e30619711442d6; environment revision 0 unchanged.

Implemented signed checkout receipt snapshots containing only reference, amount, currency, mode and payment status. Authentication, untouched-byte signature verification, live/Connect rejection, event deduplication and minimal data retention remain in place. Migrations 0035_overrated_malcolm_colcord (nullable snapshot, backward compatible) and 0036_flat_la_nuit (session lookup index) included.

`TestPaymentStatus.status` compares the latest server-bound order with matching checkout-session receipts and its frozen quote. Owner-only GET `/api/payments/test-checkout?organization=...` returns status, draft version/currentness, local expiry and bounded receipt count; no URL, session ID, customer information, request body or secret. Account UI displays Chinese/English/Italian status with a manual refresh. Withdrawn/superseded drafts remain labeled historical test results. Browser return parameters never establish payment status.

Read-only outcomes: NO_TEST_ORDER, SESSION_NOT_BOUND, WAITING_RECEIPT, PAYMENT_PENDING, TEST_PAYMENT_MATCHED, TEST_PAYMENT_FAILED, DETAILS_MISMATCH, CONFLICTING_RECEIPTS, REVIEW_REQUIRED. Missing legacy snapshots require review. A completed/unpaid event is pending; matched paid snapshots do not regress when older unpaid completion arrives. Contradictory success/failure or mismatching details require review. Receipt-before-binding catches up on the next read without webhook replay. More than 200 matching receipts returns REVIEW_REQUIRED with a capped count, never a conclusion from a truncated subset. Invoice/subscription events and unrelated session IDs cannot stand in for checkout matches.

This is TEST snapshot reconciliation, not production financial settlement or subscription activation. No Stripe API retrieval of current sessions/line items, real-provider delivery test, tax/invoice policy, cancellation, refunds, renewals, founder eligibility or entitlement lifecycle was completed. No configuration or secrets changed; test checkout and webhook intake remain disabled in hosted environment revision 0. No real Stripe request, charge or sensitive-data intake. A prior remote checkout URL is not invalidated by withdrawing its draft.

Validation: 494 automated tests PASS / 0 failed / 0 skipped (8 added); TypeScript PASS. 11 local HTTP Miniflare/workerd WebCrypto + D1 checks PASS (4 added: signed snapshot matching, unrelated actor denial in the local service fixture, restart persistence, conflicting receipts). Local fixtures are synthetic and do not verify the hosted sign-in route or real Stripe account. Browser/real-provider verification NOT PERFORMED. Evidence: docs/evidence/round37-tests.log, round37-types.log, round37-runtime.log. Build/publication receipt appended after completion.

Compatibility: additive nullable receipt field/index; old receipts remain readable but are not backfilled or upgraded into proof of payment. PACI core unchanged. No new evidence access, membership authority, proof level or paid entitlement. No public GitHub synchronization this round.

Next: connect the designated Stripe TEST account securely; validate hosted checkout and real test webhook delivery, retrieve current provider session/line items and reconcile cancellation/renewals before implementing live entitlement transitions.

## 2026-11-07 · Development 36: server-bound TEST checkout adapter

Release: v119 deployed successfully; build PASS. Runtime commit 6797ae42e6c398c27d72ea7103c41b754a5d6e4a; deployment appgdep_6aef3c5515c08191ab02ec5073bb2ff1; environment revision 0 unchanged. Test checkout remains disabled.

Implemented authenticated owner-only `/api/payments/test-checkout`, with same-origin command validation, strict input allowlist, explicit test confirmation and server-recomputed Starter/Business prices. Migration 0034 persists an immutable request snapshot and unique organization/draft-to-session mapping. Each draft has one test order; provider retries use the same frozen request and idempotency key, including recovery after provider success / database failure. Live credentials/sessions, unsafe redirect URLs, changed amounts, stale or withdrawn drafts and expired orders are refused. Checkout return URLs never activate subscriptions or evidence access.

Account preparation UI adds a localized test-only panel for eligible saved drafts. Default configuration is CLOSED; no secrets were configured and no real provider request or charge occurred. Existing webhook receipt inbox remains separate: automatic order/receipt reconciliation, taxes, founder discounts, invoices, cancellation, entitlement lifecycle and independent identity verification are NOT completed. Withdrawal prevents returning a URL, but cannot retract a previously delivered remote test URL; live use remains blocked until provider cancellation/reconciliation is implemented. Test orders expire after one hour; a new confirmed draft is required after expiry.

Validation: 486 automated tests PASS / 0 failed / 0 skipped, including 8 new checkout tests with synthetic provider responses and SQLite migrations. TypeScript PASS. Seven existing local HTTP workerd/WebCrypto/D1 webhook regression checks PASS with all migrations including 0034. Checkout provider integration and browser interaction NOT VERIFIED; build/publication result recorded separately. Logs: docs/evidence/round36-tests.log, round36-types.log, round36-runtime.log. No public GitHub sync. Real sensitive intake remains CLOSED.

Compatibility: PACI core unchanged; no replacement kernel, no new evidence permission, no payment-derived proof level. Organization membership and payment remain independent from evidence authorization. Existing draft/history/access protocols unchanged; additive database migration and endpoint only.

Next: securely configure a test Stripe account and webhook destination, validate real test sessions/delivery, then implement receipt reconciliation and cancellation before considering live payments.

## 2026-11-07 · Development 35: disabled-by-default test payment receipt intake

Release: v118 deployed successfully; build PASS. Runtime commit 63b4b00a590c71a59ba64e08d9994851a6a9fb72; deployment appgdep_6aef398340e88191b8e56a47cc398d09; environment revision 0 unchanged.

Implemented Stripe snapshot webhook POST /api/payments/stripe-webhook with untouched-byte WebCrypto HMAC-SHA256 verification, 300-second past/future freshness window, bounded streaming body/header, strict test-mode gate, live/Connect rejection, event allowlist and durable event-ID deduplication. Stores minimal receipt metadata and digest, not raw payload, contacts, billing address, amount, signature or secrets. Database write failure is retryable; same ID with different signed bytes returns conflict. Out-of-order events remain receipts and do not mutate subscription state.

Migration 0033_melodic_stepford_cuckoos and schema metadata included. No checkout, payment, invoice-paid state, founder reservation, entitlement or evidence grant occurs. Production environment revision 0 inspected: no payment configuration keys. No secrets created/configured, no Stripe account or destination modified. Endpoint remains disabled (503) without explicit TEST_RECEIPT_ONLY configuration. It cannot be switched to live by a configuration value.

Validation: 478 tests PASS / 0 failed / 0 skipped (7 added), TypeScript PASS. Seven local HTTP Miniflare/workerd WebCrypto + D1 checks PASS for migrations, forged signature denial, verified receipt, deduplication, live denial, data minimization/no activation, and restart. Logs docs/evidence/round35-tests.log, round35-types.log, round35-runtime.log. This is synthetic local testing, not real Stripe merchant/provider integration. Production HTTP/browser not verified.

Next concrete payment work and required setup: docs/PAYMENT_WEBHOOK_HANDOFF.md. Select intended merchant/account, securely configure TEST destination secret and complete hosted real-provider delivery tests; separately implement trusted checkout-order mapping, tax/invoice/discount terms, event reconciliation and transactional entitlement lifecycle before live payments. Independent identity/verified legal entities remain blockers. Real sensitive intake CLOSED. No public GitHub sync. PACI core and existing access rules unchanged.

## 2026-11-07 · Developments 33–34: withdrawal, commercial history and membership audit

Release: v117 deployed successfully, build PASS. Runtime commit 8a4e2af86de0cecac9669ca82598bed058bf5fa9; deployment appgdep_6aef379784208191ab451d8346d4fde4.

Round 33: subscription preparations now support explicit owner-only withdrawal, appending WITHDRAWN while preserving the quoted amount, catalog and previous version. Withdrawal is idempotent and version-checked, never a payment refund or cancellation of an external signed subscription. A later confirmed save creates a fresh preparation. Owner-only paginated history shows versions, plan/cycle, original catalog amount, status and server UTC time. No founder slot, charge or entitlement is created.

Round 34: owner-only membership audit is connected to the organisation management UI/API, with actor, subject, action and UTC time. Invitations, acceptance, rejection, revocation and voluntary exit remain visible to the creator after membership ends. Other members/organisations cannot read this roster/history. Stable (timestamp,id) pagination handles ties; output has no evidence bodies, account-directory contacts or billing details. Account ID still does not verify enterprise identity.

Migration 0032_neat_sandman adds organisation-history lookup index and ordinary SQL UPDATE/DELETE/REPLACE guards for organisation events and subscription versions. Subscription replacement is blocked through both primary version key and unique actor/request key. Earlier rows are preserved. No protection is claimed against privileged schema/database replacement; these are not blockchain proofs, permanent retention promises or completed support audit. Approved erasure/retention will require an explicit controlled implementation, not ordinary row deletion bypass.

Validation: 471 tests PASS / 0 failed / 0 skipped (4 added), TypeScript PASS. Seven local Miniflare/workerd D1 checks PASS including upgrade preservation, overwrite paths, withdrawal, tenant isolation and restart/retry. Logs docs/evidence/round33-34-tests.log, round33-34-types.log, round33-34-runtime.log. Browser/two-live-account QA NOT_VERIFIED; production DB not directly inspected. Both requested rounds delivered together in one release.

Unchanged blockers: independent production signup, verified legal entities, merchant/payment/webhooks, actual paid entitlement/quotas, support access approval, comprehensive audit/export/retention, product dossiers and approved real-data deployment. Real sensitive intake CLOSED. Public GitHub not synced. Do not report these history improvements as production payment readiness.

## 2026-11-07 · Development 32: creator-owned subscription preparation

Release: v116 deployed successfully; build PASS. Runtime commit bc0f24044e622b25c512fadae086ad6d1260f332; deployment appgdep_6aef361956ac81918858972ef9533329.

Added /api/subscription-drafts and an account organisation panel for choosing a plan and billing cycle, confirming preparation-only status, and saving server-priced versioned drafts. lib/subscription-catalog.json remains the source of prices; lib/subscription-drafts.js rejects client amount, paid, entitlement and discount fields, unsupported cycles (including Enterprise monthly), stale catalogs and unconfirmed input. Amounts use EUR integer minor units. Export/Enterprise retain manual quote requirements; taxes and founder eligibility are not assessed, no founder place reserved.

Migration 0031_colossal_living_mummy and schema metadata persist draft versions, server-calculated quote snapshots and per-actor idempotency keys. Only the organisation creator may read/write; members, invitees and other owners cannot. Compare-and-insert version guards prevent lost updates, failure rolls back the whole save, repeated keys replay without creating duplicate versions. Previous saved versions are preserved by this API. This is not a blockchain/privileged-database immutability guarantee.

No merchant/payment session, charge, subscription activation, entitlement increase, evidence grant, verification or email is created. Organisation membership and billing remain separate from evidence authorisation. Existing synthetic workflows and original owners are unchanged; no commercial quota is falsely enforced against unverified organisations. Preparing or choosing Free does not cancel an external signed subscription. No private attachments or contract drafts published to public assets/GitHub.

Validation: 467 tests PASS / 0 failed / 0 skipped (4 added), TypeScript PASS. Six local Miniflare/workerd D1 checks PASS for migrations, server amounts, owner isolation, stale rejection, previous snapshot preservation, restart/idempotency. Logs: docs/evidence/round32-tests.log, round32-types.log, round32-runtime.log. Browser/two-live-account QA NOT_VERIFIED, production database not directly inspected.

Remaining blockers: independent production registration, verified legal entities, merchant/payment credentials and verified webhooks, tax/invoice setup, paid entitlement lifecycle and concurrent organisation metering. Support approvals/full audit/export/retention and product dossiers remain pending. Real sensitive intake CLOSED. Public GitHub unchanged. Next payment integration must create a new confirmed checkout quote from the applicable catalog and payment provider; never activate from a browser redirect or this saved preparation record.

## 2026-11-07 · Development 31: self-declared organisations and consented membership

Release: v115 deployed successfully, build PASS. Runtime commit a36536f8f7f706b709953f1be4e11fcb6df5a312; deployment appgdep_6aef3342298c819189406b7c07afc78b.

Account page now includes an organisation workspace backed by authenticated /api/organizations and migration 0030_lazy_hex (schema and generated metadata included). Current development scope allows one created workspace per account plus membership in other workspaces; this is not a commercial factory/organisation quota or proof that two accounts represent different legal entities. Name and two-letter country code are self-declared, not company/authority/ISO-country verification, and do not change regional restrictions.

Creator can invite an exact site account ID (supplied by the recipient), view their own member roster, revoke invitations/membership and re-invite. Recipient explicitly accepts/declines and can leave. No account-directory lookup, email sending, ownership transfer or verification API. No automatic join, mailbox-based merging or role escalation. Members cannot list the private roster. A recipient sees only their own invitations/memberships; revocation removes organisation visibility. Existing evidence stays owned by its original actor; membership grants no task/file/card/log access, no buyer authority, no paid subscription and no PACI identity claim.

Mutations use version comparisons, per-actor idempotency keys and transactional event/operation writes. A revocation wins against stale acceptance; re-invitation needs a new recipient decision. Failure rolls back state and events together. Membership events are operational audit rows, not chain proofs or a complete append-only platform audit. Tests retain existing consent/sharing boundaries. No existing actor migration or private task reassignment.

Validation: 463 tests PASS / 0 failed / 0 skipped (5 added); TypeScript PASS; 6 local Miniflare/workerd D1 checks PASS for migrations, acceptance, roster isolation, stale rejection, rollback audit and restart persistence. Evidence: docs/evidence/round31-tests.log, round31-types.log, round31-runtime.log. Browser/two-live-account QA NOT_VERIFIED; production DB not directly inspected.

Next: verified organisation identity/duplicate-entity handling, production signup path, commercial entitlement metering, merchant and payment lifecycle remain blocked/not connected. Customer support approvals, full audit/export/retention and product dossiers remain pending. No public GitHub sync; real sensitive intake remains CLOSED. Do not sell membership preparation as complete enterprise collaboration or billing.

## 2026-11-07 · Development 30: versioned pricing and owner-visible access events

Release: v114 deployed successfully. Runtime commit 5774cea03de685b53c74a50031733e032e2dc88f; deployment appgdep_6aef30b653ac8191949b028383ca37ff. Build PASS.

Decisions: docs/ROUND30_COMMERCIAL_PRIVACY_DECISION.md freezes v1.1 + supplied v1.2 with access-log viewing as a baseline privacy protection. Old prototype prices and language-tier restrictions removed. Public catalog 2026-11-07.1 drives trilingual subscription cards; purchase/automatic payment disabled. Enterprise workspace combines buyer and lead exporter roles; no fabricated quota/fair-use terms.

Implemented: owner-authenticated, task-isolated paginated access-log API and UI (account identifier, UTC time, card, grant, event). No evidence bodies, codes, directory joins or unrelated relationships. Historical events remain after revoke/expiry. Account is NOT verified company/person; download event is NOT confirmed saving. Current logging covers basic-card workflow, not all platform or support activity. Existing access-event database guards remain; no new migration, PACI kernel change or old snapshot rewrite.

Open blockers: organisation identity, independent signup, concurrent commercial quotas, merchant/payment webhooks, support approvals, audit export/retention, real-data region approval and product dossier. Existing synthetic test capabilities stay enabled, not claimed paid entitlements. Confidential attachments not placed in static assets or public GitHub. GitHub not synced.

Validation: 458 tests PASS, 0 fail, 0 skipped; TypeScript PASS. Three tests added: owner log isolation/redaction/revocation, timestamp-tie pagination, and trilingual catalog rendering/pricing invariants. Existing reminder test updated to remove obsolete language-tier restriction while preserving human-reviewed sending. Evidence: docs/evidence/round30-tests.log and round30-types.log. Browser QA not verified. No claim of production billing readiness.

## 2026-11-07 · Development 29: scope-bound numeric disclosure

New basic projections require selected field code, finite confirmed numeric value, exact valid monthly task scope on the field, and matching source-material scope. Missing source/scope fails closed; zero is retained. Shared evidence-scope helpers keep coverage and parameter projection aligned. Fields from other facilities/months remain in private source records and assessments, but are not included in new buyer numeric projections. Filtering never clears ambiguity/insufficiency or selects a favourable candidate. Continuous summaries still disallow precise fields.

Compatibility: new grants/projections use the corrected filter; existing stored grant/publication snapshots and historical hashes are not rewritten. Earlier synthetic grants containing cross-scope parameters may require owner review and revocation/reissue; this release does not retroactively redact already stored or downloaded snapshots. No production customer records inspected. No schema migration, PACI core, formal pricing or policy change.

Validation: 455 tests PASS / 0 failed / 0 skipped (3 added), TypeScript PASS. Actual SQLite-backed task import/confirm/assess/freeze/grant/redeem/read flow verifies excluded values never reach new buyer snapshot or ZH/EN/IT HTML, insufficient status remains, another buyer is denied, continuous summaries contain no precise fields, earlier fixed card unchanged. Unit checks cover missing source/scope, invalid month, non-finite values and valid zero. Evidence docs/evidence/disclosure-scope-tests.log. Authenticated browser NOT_VERIFIED. Signup/payment/real-intake blockers unchanged. GitHub unchanged. Build PASS; site v113 published successfully. Runtime commit 0e6e5489a2f4d39d667ec6daa32bd1072d3a585a; deployment appgdep_6aef15cba05c819182ec2225d0b927b2.

## 2026-11-07 · Development 28: scoped coverage and isolated frozen snapshots

Unified coverageFor with the task facility/month: other-scope and missing-scope materials no longer inflate new checklist/card coverage or company-confirmed counts. Missing/invalid task scope fails closed. Matching readable material and field scope are required for field-based confirmation; zero remains a valid confirmed value. Coverage schema is now 0.2 with scope/status/excluded-count metadata; denominator remains 11, no scoring or PACI policy changes.

New fixed card bodies are deep-cloned before hashing so in-memory subsequent transitions cannot mutate them via shared material/field references. New cards retain the chosen preparation categories. Existing stored cards and buyer projections with recorded coverage retain their original snapshot; no historical rewrite or migration. First test run exposed the shared-reference issue; fixed before final passing run.

Validation: 452 tests PASS / 0 failed / 0 skipped (3 added); TypeScript PASS. Tests cover facility/month exclusion, missing scope, valid zero, overview consistency, real core assess/freeze transitions, subsequent materials, preserved old hashes, new buyer projections and legacy coverage preservation. Evidence: docs/evidence/coverage-scope-tests.log. Authenticated browser NOT_VERIFIED; prior managed preview conflict unresolved. Signup/payment/real intake blockers unchanged. GitHub unchanged. Build PASS; site v112 published successfully. Runtime commit 73ea49e747dc7557206ee61e24aae0bcf7c9cb7e; deployment appgdep_6aef14e21088819183a9d8c18d0d1b61.

## 2026-11-07 · Development 27: safe text import and source review visibility

Synthetic TXT draft imports now use a latest-selection reader: earlier success/failure cannot overwrite a later selection or a cancelled/unmounted task. Save is disabled while reading or after an import failure; users can explicitly cancel to preserve the prior draft. Successful imports reset the synthetic-material declaration. Empty text, invalid UTF-8, oversized bytes and unsupported filenames are rejected with localized Chinese/English/Italian messages; no file contents are uploaded by this reader.

Preparation overview now recomputes source parsing diagnostics and keeps affected material categories in review even after company/field confirmation. Diagnostics are limited to current facility/month and relevant category metrics; stale stored location reports do not suppress warnings. Source links remain available. Coverage percentages, evidence levels, PACI kernel and assessment rules are unchanged; no AI/OCR or real intake enabled.

Validation: 449 tests PASS / 0 failed / 0 skipped (5 added); TypeScript PASS. Tests cover reversed completion, cancellation, invalid replacement selection, decoding and size errors, stale source reports and scope/category isolation. Evidence: docs/evidence/material-import-review-tests.log. Browser QA NOT_VERIFIED: managed preview failed with an existing Vinext dev server conflict; status reports stopped. No auth bypass attempted. Independent signup/payment and real intake blockers remain. GitHub unchanged. Build PASS; site v111 published successfully. Runtime commit 7bf65440e5d0c7a584486d66df6b67b03bd22f5e; deployment appgdep_6aef1139cb548191b2faa943c19a1e82.

## 2026-11-07 · Development 26: private file history replacement guard

Closed an ordinary SQL replacement-write gap in private-file audit history. Migration 0029 adds a BEFORE INSERT collision guard on event sequence; INSERT OR REPLACE and REPLACE cannot overwrite earlier events even when recursive triggers are disabled. Existing events are preserved; normal upload, deletion, retry and cleanup remain supported. No PACI kernel, evidence scoring, disclosure policy or user-facing language changed. This is database DML protection, not blockchain immutability or protection against privileged schema replacement.

Validation: 444 tests PASS / 0 failed / 0 skipped (2 added); TypeScript PASS. Five local Miniflare/workerd D1 checks PASS, including migration preservation, both recursive-trigger settings, new appends and restart persistence. Logs: docs/evidence/file-history-replace-tests.log and docs/evidence/file-history-replace-runtime.log. Production authenticated browser and direct production trigger inspection NOT_VERIFIED. Real customer intake remains closed; independent email signup and payments remain BLOCKED/not connected. GitHub unchanged. Build PASS; site v110 published successfully. Runtime commit cbf64a0881629a13224df58feba1789ef5c4eb97; deployment appgdep_6aef0b54adc08191bae3d89a65d29b51.

## 2026-11-07 · Developments 24–25: identity capability re-audit and offline migration preflight

Round 24 rechecked the current identity adapter, hosting identity documentation and tool capabilities. Independent email signup remains BLOCKED; no supported external identity configuration was found in the inspected surface. Existing platform sign-in remains unchanged. Updated paid-pilot gates to record the audit result and require a concrete supported hosting/identity path.

Round 25 added lib/identity-migration-plan.js and scripts/check-identity-migration-plan.mjs. Offline structural checking preserves legacy actor IDs, uses exact allowlisted issuer+subject pairs, rejects missing/duplicate/unknown/merged mappings and ignores email as an identity key. CLI emits only counts/error codes. No login-token verification, dual-control proof, linking, data mutation or activation is performed; activation_allowed is always false. Full inventory completeness still requires a separate audit. See IDENTITY_PREFLIGHT.md.

Validation: 442 automated tests PASS / 0 failed / 0 skipped (5 added), TypeScript PASS. Tests cover stable identities despite equal emails, mapping conflicts, exact issuer/subject matching, malformed and oversized plans, CLI exit codes/output minimization and unchanged input files. Evidence docs/evidence/identity-migration-preflight-tests.log. No new live registration UI or provider is enabled. Authenticated browser NOT_VERIFIED. GitHub unchanged. Build PASS; published site v109, runtime commit 4c740f9a5859b4ca3f3323dfd78204341c0fffbe; deployment appgdep_6aef0a34f2008191a2e8acf85106ec0a SUCCEEDED.

## 2026-11-07 · Development 23: final revocation and fixed redemption binding

Appended migration 0028_grant_lifecycle_guards and generated metadata after publishing round 22 as v107. Existing grants retain their data. Once revoked_at is non-null, it cannot be cleared or changed by UPDATE. Once redeemed_by is non-null, buyer identity and redemption timestamp cannot be changed/reset. A revoked unclaimed grant cannot later receive a buyer binding. Changes that produce a partial or empty redemption pair are rejected; unchanged legacy rows are not rewritten. New grants remain available for renewed sharing. Normal first redemption, revocation, no-op retries and publication workflow remain compatible.

These are database backstops for existing application rules, not new regulatory policy or proof of identity. They do not validate arbitrary privileged INSERTs, prevent schema/database replacement or provide on-chain immutability. Original-snapshot and replacement guards from 0026 still apply; API ownership/access checks remain essential. No new UI, PACI or disclosure contents.

Validation: 437 automated tests PASS / 0 failed / 0 skipped (3 added), TypeScript PASS. Tests cover buyer rebinding/reset/retimestamp attempts, partial redemption, irrevocable revoke, same-key replay, denied reads and successful fresh-grant sharing. Local Miniflare/workerd D1: 7 checks PASS for upgrade, partial/first redemption, rebinding, revoked-state enforcement, idempotent revocation and restart. Logs docs/evidence/grant-lifecycle-tests.log and grant-lifecycle-runtime.log. Production DB direct inspection and authenticated browser NOT_VERIFIED. GitHub unchanged. Published Site v108 successfully with migration 0028; build PASS. Runtime commit f5b17775b0407eac0aeef5c0fa53975614cc0fb8; deployment appgdep_6aef089170888191b6b2a0e157cb1a93. Production triggers not directly inspected.

## 2026-11-07 · Development 22: append-only evidence access audit

Appended migration 0027_access_events_append_only and generated metadata. BEFORE UPDATE/DELETE triggers protect dossivo_access_events; conflicting INSERT/REPLACE is rejected before implicit deletion, including when recursive triggers are disabled. New access events remain insertable and existing events remain unchanged. No backfill, changed event fields, UI behavior, retention policy, authorization or PACI changes.

Read/download/redeem/revoke history now has ordinary database DML protection alongside task and publication history. This does not prove every real-world action was logged, validate malicious inserted data, prevent privileged schema/database replacement or provide on-chain immutability. Formal retention/purge administration still needs an explicit future design. Denied reads do not produce a successful download event; repeated same-key revocation remains idempotent.

Validation: 434 automated tests PASS / 0 failed / 0 skipped (2 added), TypeScript PASS. Tests exercise update/delete/replace/upsert with recursive triggers on/off, unchanged saved events, continued read logging, revoked download refusal and no duplicate revoke event. Local Miniflare/workerd D1: 6 checks PASS for upgrade preservation, write guards, new append and restart. Logs docs/evidence/access-history-tests.log and access-history-runtime.log. Production DB direct inspection and authenticated browser NOT_VERIFIED. GitHub unchanged. Published Site v107 successfully with migration 0027; build PASS. Runtime commit 77a53f75b74cbd3c235d60ba88804f6beee0eba9; deployment appgdep_6aef07df3a008191b8cf70eebd818d5b. Production triggers not directly inspected.

## 2026-11-07 · Development 21: immutable published disclosure snapshots

Appended migration 0026_publication_history_append_only with generated metadata; no edits to applied migrations. Published summary rows now reject UPDATE/DELETE and conflicting INSERT/REPLACE by either primary ID or grant+sequence. Original grant identity, owner/task/card, code hash, snapshot/digest, disclosure choice, creation/expiry and mode/purpose/version policy are fixed after insert. Grant DELETE/REPLACE is blocked. Redemption, revocation and publication-sequence lifecycle columns remain writable by existing authorized workflows. Existing rows are preserved; no data rewrite or backfill.

This extends database DML protection to buyer-disclosed history, without treating revoked access as deletion of historical evidence. Backend access checks, revocation and publication-chain read verification remain unchanged. Privileged schema changes/database replacement remain outside these trigger guarantees; this is not blockchain immutability. Retention/purge administration still requires a separate explicit design. The preexisting corrupt-history test deliberately drops its isolated update trigger to preserve read-integrity coverage.

Validation: 432 automated tests PASS / 0 failed / 0 skipped (2 added; 1 corruption fixture adapted), TypeScript PASS. Tests cover both publication replacement conflict paths with recursive triggers on/off, protected grant columns, unchanged originals, real redeem/publish/replay/historical read/revoke flow. Local Miniflare/workerd D1: 9 checks PASS covering upgrade preservation, DML guards, lifecycle/appends and restart. Evidence docs/evidence/publication-history-tests.log and publication-history-runtime.log. Production DB direct inspection and authenticated browser NOT_VERIFIED. GitHub unchanged. Published Site v106 successfully with migration 0026; production build PASS. Runtime commit 28e1b904fbe1a74a399eef15e51125bc675de3a7; deployment appgdep_6aef06caf7008191aa7bc241f3697574. Hosting applies pending migrations before Worker publication; production triggers not directly inspected.

## 2026-11-07 · Development 20: database append-only task versions

Audit found task-version digests detected corrupted reads but no database write guards existed for saved versions. Appended migration 0025_task_history_append_only (generated custom migration and metadata; prior migrations unchanged). BEFORE UPDATE and BEFORE DELETE triggers reject changes with TASK_HISTORY_APPEND_ONLY. A BEFORE INSERT conflict guard also blocks INSERT OR REPLACE from silently deleting an existing task/version, including when SQLite recursive triggers are off. Fresh version inserts remain allowed. Existing rows are preserved; no backfill or cleanup. No authentication, assessment or disclosure policy change.

This protects normal database DML against rewriting/deleting saved task snapshots, not against privileged schema changes or database replacement, and is not a blockchain immutability claim. Current head rows remain mutable by the normal optimistic-concurrency workflow. Retention/deletion administration needs an explicit future design; no deletion path was added. Existing read-time hash guards remain active. Corruption tests now explicitly drop the update trigger in their isolated fixtures to continue verifying read guards after privileged bypass; application code never does this.

Validation: 430 automated tests PASS / 0 failed / 0 skipped (2 added; existing corruption fixtures adapted), TypeScript PASS. New tests cover update/delete/replace/upsert, recursive triggers on/off, idempotent replay, normal append and preserving existing records during upgrade. Local Miniflare/workerd D1: 7 checks PASS (upgrade, update/delete/replace rejection, replay, append, restart persistence). Logs docs/evidence/task-history-append-only-tests.log and task-history-append-only-runtime.log. This is local runtime verification, not a direct production DB inspection. Authenticated production browser NOT_VERIFIED. GitHub unchanged. Published Site v105 successfully with migration 0025; production build PASS. Runtime commit 4a83523b1557f27eab9e9f8bb68a558b3b0f5ec4; deployment appgdep_6aef05b20a588191b86f1d6bb4b9d55b. Hosting applies pending migrations before Worker publication; direct production trigger inspection was not performed.

## 2026-11-07 · Development 19: identifiable card download filenames

User clarified continuation counter as 19; no rollback or repeated round-18 implementation. Added shared safe download naming for owner HTML, buyer HTML and private JSON. Filenames identify the saved card and task version, with HTML language and buyer publication sequence when available. Private JSON has its own prefix and no misleading language suffix. Customer names, email, grant IDs and authorization codes are excluded. Missing/unsafe historical card identity uses legacy; invalid version uses unknown. Only bounded ASCII IDs are accepted, preventing header/path injection. Legacy names are not guaranteed unique, and repeated downloads of the same snapshot retain the same name.

No snapshot contents, authorization, download logging, route parameters, cache/CSP headers, schema or PACI changes. Buyer snapshot identity never falls back to the grant ID. Evidence contents continue to identify their own saved version; names are convenience labels, not proof of authenticity or current validity.

Validation: 428 automated tests PASS / 0 failed / 0 skipped (5 added), TypeScript PASS. Tests cover identity/version/locale/publication naming, zero publication sequence, unsafe/missing metadata, data minimization, real owner route auth and header output, and buyer route authorized card naming. Evidence docs/evidence/card-download-name-tests.log. Authenticated production browser download UX NOT_VERIFIED. GitHub unchanged. Published Site v104 successfully; production build PASS. Runtime commit 0b2391893a8028accd8968946746b0521b8758de; deployment appgdep_6aef044ae01c819187746de47b2d8c9c.

## 2026-11-07 · Development 18: localized downloadable cards

Audit confirmed that HTML downloads already include card identity, task version, snapshot/download time and offline revocation/update limitations. Fixed an actual gap: lang=it previously rendered English. Added Italian system copy for parameters, material catalog, issue stages, publication history, expiry and snapshot notices. Chinese insufficient status now uses 是/否/未提供 instead of raw boolean/ambiguous values; English/Italian localize 人/件 display units. Unsupported locale retains English fallback. Known financial/energy unit codes remain unchanged. User-provided evidence/company strings are preserved and HTML-escaped, not translated.

Rendering only: no snapshot format, authorization, selected disclosure, stored quantities, publication history, expiry, logging, PACI or AI changes. Both owner and buyer HTML routes already pass lang to the shared renderer. Expiry does not make a saved historical copy unreadable; offline copies cannot check newer revocations/updates. Those boundaries remain in all three languages.

Validation: 423 automated tests PASS / 0 failed / 0 skipped (4 added), TypeScript PASS. Tests cover Italian full parameter/category/unit rendering, boolean unknown/zero handling, publication history/stages, original data preservation, HTML escaping and real SQLite buyer disclosure/download event. Evidence docs/evidence/card-download-language-tests.log. Authenticated production browser and visual print layout NOT_VERIFIED. GitHub unchanged. Published Site v103 successfully; production build PASS. Runtime commit 61c0c54a63176c2761abd0635520cae9f84015cd; deployment appgdep_6aeefdf47f548191b5d7b482ae23f608.

## 2026-11-07 · Development 17: shared assessment readiness

Verified that the backend already rejects stale assessment freezing. Extracted that existing condition without changing policy into assessmentReadiness, shared by transitionTask and the UI. Frontend now disables freeze until the backend condition is met, replacing the previous clickable error path. Four localized states: missing, ready, frozen, needs_check. Frozen classification requires the last event, card task version and assessment ID to match; it does not imply material changes. Shows current task version and latest card input task version, and explains immutable snapshot semantics. Removed the earlier event-only freshness message.

Insufficient/unresolved checks may still produce a clearly limited private preparation card, exactly as before; readiness is not compliance approval. Later material/field changes require new checks, while existing cards retain their snapshot. No schema, assessment math, disclosure, PACI or AI changes. Existing backend error code and command semantics remain compatible.

Validation: 419 automated tests PASS / 0 failed / 0 skipped (4 added), TypeScript PASS. Tests cover readiness predicates and inconsistent metadata, real assess/freeze/update/reassess sequence, rejected premature/repeated/stale freeze, preserved old cards and three-language disabled controls. Evidence docs/evidence/assessment-readiness-tests.log. Authenticated production browser NOT_VERIFIED. GitHub unchanged. Published Site v102 successfully; production build PASS. Runtime commit dec69113647f2a5c0accb914aeeb040852e6ba8e; deployment appgdep_6aeef8026fcc8191975688d2372e93cc.

## 2026-11-07 · Development 16: adjacent-version field comparison

Added an owner-only read endpoint using task + field_changes=<version>, comparing saved version N to N-1 (N >= 2). Both snapshots pass existing actor authorization and body digest verification; absent or corrupted snapshots fail instead of silently comparing against current data. Comparison is by field ID, so duplicate metric codes remain separate. Projects code, material ID, unit, extracted value, confirmed value and confirmation count only; no material text, locators or reasons are exposed by this new projection. Values are private to the owner, not added to public/basic cards.

History rows now provide three-language on-demand compare controls. Displays additions/removals/projected changes, previous/new values and confirmation counts. Null remains unconfirmed, zero remains zero. Same-value repeated confirmations appear through the count change. Closing/unmounting ignores late results; parent authenticated request handling clears task views on session loss. Shows at most 100 changes with complete total/truncation notice. No rollback, training, disclosure, schema or PACI behavior change. This is not a complete document/assessment diff, reason-text diff or independent verification.

Validation: 415 automated tests PASS, 0 failed/skipped (5 added); TypeScript PASS. Tests cover duplicate-code identity, zero/null, repeated confirmation, removal, truncation, real saved snapshots, ownership, invalid/missing versions, corrupted previous snapshot, unchanged current data and multilingual escaping. Evidence docs/evidence/task-field-change-tests.log. Authenticated production browser NOT_VERIFIED. GitHub unchanged. Published Site v101 successfully; production build PASS. Runtime commit 7205123c61d68a17f08b921aad9c7478f7e14639; deployment appgdep_6aeef5a1af34819185dfaa83ad996ddc.

## 2026-11-07 · Development 15: private version history overview

Added authenticated GET task history with descending version pagination (20/page). Each returned version is read through the existing owner check and saved-body digest verification before projecting saved time, purpose, period and counts of materials, fields, confirmed fields, assessments, frozen cards and flag records. No raw material text, field values or assessment details are returned by this endpoint. Counts describe that snapshot, not verification or event deltas. Existing task/current version remains unchanged.

Three-language read-only history overview in an opened task, collapsed initially and fetched on demand. Close/unmount invalidates pending responses; parent task/version key resets history when task changes or saves. Requests reuse parent session handling, so authentication loss clears private task views. Supports older pages and retry, no rollback or redisclosure actions. No schema, PACI, policy or AI changes. Full snapshot browsing and field-by-field version comparison are NOT implemented in this round.

Validation: 410 automated tests PASS, 0 failed/skipped (4 added), TypeScript PASS. SQLite checks 24 versions over two pages, historical counts, unchanged current state, account isolation, invalid cursors and corrupted digest refusal; API login/no-store checks; localized escaped UI rendering. Evidence docs/evidence/task-history-tests.log. Authenticated browser NOT_VERIFIED. GitHub unchanged. Published Site v100 successfully; production build PASS. Runtime commit e8db52a1e4b7747b691d9515fa2f858312465e15; deployment appgdep_6aeef1338244819180d92bc48075843f.

## 2026-11-07 · Development 14: private task name search

Added owner-scoped server-side literal substring search across saved task names, including records beyond the first 50. GET /api/private-tasks accepts optional q (max 100 characters; trimmed), with existing tuple pagination and actor-bound integrity reads preserved. SQL uses bound parameters and instr, so percent/underscore/quotes are literal. ASCII case-insensitive matching follows SQLite lower(); no Unicode case-folding, fuzzy or material-content search is claimed. Empty query preserves the previous list API.

Three-language search/clear controls reset pagination; load-more and refresh retain the applied query. Existing request-generation guard rejects stale list responses. Session loss clears search text and results. No schema, evidence, disclosure, PACI or AI behavior changes.

Validation: 406 automated tests PASS, 0 failures/skips (3 added), TypeScript PASS. Tests cover 55 matching tasks over two pages, actor isolation, literal special characters, empty/invalid/bounded inputs and localized accessible controls. Evidence: docs/evidence/task-search-tests.log. Authenticated production browser NOT_VERIFIED. GitHub unchanged. Published Site v99 successfully; production build PASS. Runtime commit 73a9e428ead312c374d1a5c0b26490963621e923; deployment appgdep_6aeeed2bef94819195c42d883b17bb5b.

## 2026-11-07 · Saved-task pagination after v97

Published v98 successfully on 2026-11-07. Runtime commit c5d1e932c6efe5270d5c55ccc985dddca4d17d3c; deployment appgdep_6aeeec0579d8819194f261ded5de16ef. Production build PASS. Authenticated browser acceptance remains NOT_VERIFIED; GitHub not synchronized this round.

Continuing development after the completed round-12 source-diagnostic integration; the user's repeated counter does not undo or rerun that implementation. Fixed the existing saved-task list's inaccessible older-than-50 entries. PrivateTaskStore.listPage returns 50 projected tasks plus next_before, ordered by updated_at DESC and id DESC with a validated tuple cursor. Existing list(actor) remains a first-page array for compatibility. API's default list response retains tasks and adds next_before; matching-by-month remains unchanged. Every page keeps the actor-bound SQL filter and stored-version/digest checks. Cursor is a navigation hint, not an authorization credential.

UI adds localized older-task loading, loaded count and loading state. Appends deduplicate IDs, explicit refresh replaces pages, list generations reject stale responses and session loss clears rows/cursor. Same-timestamp ties are deterministic. This is NOT a frozen snapshot: edits during browsing can move tasks, so the UI instructs refresh for the newest list. No total-count claim, new schema, evidence or PACI changes.

Validation: 403 automated tests PASS / 0 failed / 0 skipped (5 added); TypeScript/diff checks PASS. Evidence docs/evidence/task-list-pagination-tests.log. Real SQLite verifies 105 own tasks across 50/50/5 pages, ties, actor isolation including reused foreign cursor, compatibility list, and new inserts with stable older-page boundaries. Also validates cursor shape/bounds, client deduplication and three-language controls. Authenticated hosted browser NOT VERIFIED. GitHub unchanged. Build/publication receipt follows.

Published Site v97 after round-11 recheck and round-12 implementation: runtime e1c85c4e7f9a7eb3f36a446da1d19d1fa7ab3332; deployment appgdep_6aeee411ebc8819198d8c328b2b1d074 succeeded. TypeScript and build PASS. Authenticated browser NOT VERIFIED; GitHub unchanged.

## 2026-11-07 · Round 11 verified before round 12 source-check integration

Sequence requested by user: first rechecked the completed v96 round-11 implementation (73 targeted tests PASS, 0 failed/skipped; docs/evidence/round11-recheck.log). This is a rerun of existing tests, not 73 new tests. Then implemented round 12 below.

Preparation checker 0.6 performs a fresh deterministic source-diagnostic pass on all current synthetic text materials, including unlocated and legacy materials. It does not rewrite their stored location reports or add fields. Known metrics with parsing issues are excluded from ratio inputs with SOURCE_PARSE_ISSUE; affected ratios remain INCONCLUSIVE/null. Other independent ratios may still calculate, but overall insufficient is true. New fixed cards and the existing limited basic-card projection retain insufficient; historical assessments/cards are unchanged. No claim of finding all unknown labels or independently verifying content.

Synthetic parser 1.2 now records per-code counts over ALL recognized issues, separate from its 100-detail display cap. Thus issues after truncation still block affected ratios. Private assessment diagnostic summary exposes only material IDs, codes and counts, not excerpts/values/reasons. Three-language UI explains the issue and links to source materials. Existing disclosure selection remains unchanged; basic-card output does not acquire raw source diagnostics. Existing confirmed parameters remain company assertions, not verified figures. No candidate exclusion, automatic remediation, PACI kernel, schema, model or real-data intake change.

Validation: 398 automated tests PASS / 0 failed / 0 skipped (4 added); TypeScript and diff checks PASS. Evidence: docs/evidence/source-diagnostic-assessment-tests.log. Real SQLite test confirms a bad alternate source blocks R6a/R6b despite confirmed readable values, allows unaffected R1, preserves original reports/versions and propagates insufficient through frozen/basic cards. Other tests cover full counts beyond truncation, unlocated source checks, no raw diagnostic leakage and multilingual rendering. Authenticated hosted browser NOT VERIFIED. GitHub unchanged. Publication receipt follows.

Published Site v96: runtime 5a6393bf7866f416eb8040d60742645dd3833815; deployment appgdep_6aeedd652b508191af298c933f3b88b3 succeeded. TypeScript and build PASS. Authenticated browser NOT VERIFIED; real AI/OCR unconnected; GitHub unchanged.

## 2026-11-07 · Persisted field-location diagnostics (round counter 11)

Synthetic parser 1.1 adds inspection of recognized labels not successfully located: unsupported structure/number, missing or unsupported unit, and out-of-range value. Reports preserve exact original excerpts and UTF-16 positions/line numbers for private owner review. Full issue count is retained with at most 100 detailed issues and an explicit truncation flag. No supported labels is distinguished from valid recognized labels; neither outcome claims full recognition or authenticity.

locate_fields now persists location_report alongside fields in the existing versioned task transaction, including zero-field outcomes. Repeated attempts on the same already-located material are rejected, and historical versions/source text are unchanged. Format fixes require separate material with provenance; candidates are never silently replaced or auto-confirmed. Existing historical materials have no fabricated backfill. Current preparation checker and PACI kernel unchanged; no database migration or external model call. UI shows Chinese/English/Italian results and escaped source text within the existing owner-only task view. Reports remain private; no new sharing or training flow.

Validation: 394 automated tests PASS / 0 failed / 0 skipped (4 added), TypeScript and diff checks PASS. Tests cover reason classification/exact excerpts, no-label/valid/truncated cases, actual SQLite zero-result report persistence and replay denial, historic version preservation, multilingual rendering and source escaping. Evidence: docs/evidence/field-location-diagnostics-tests.log. Hosted authenticated browser remains NOT VERIFIED, real AI/OCR and real document intake remain unavailable. GitHub unchanged. Build/publication receipt follows.

Published Site v95: runtime f8e16bc3efad9a5d292ac7ecef097ac42e797f3c; deployment appgdep_6aeedbdbe66c8191b77133afb259e842 succeeded. TypeScript and build PASS. Authenticated browser NOT VERIFIED; AI/OCR unconnected; GitHub unchanged.

## 2026-11-07 · Multilingual deterministic synthetic field location (round counter 10)

Replaced Chinese-label-only location with versioned dossivo-synthetic-parser/1.0, supporting explicit Chinese, English and Italian labels for the existing seven metrics. Preserves exact quote, UTF-16 offsets, line, raw number/unit and explicit yuan scale conversion; normalized units remain compatible with current assessments. Model remains null and confirmation remains manual. Mixed-language duplicates remain separate candidates and retain existing ambiguity handling. Existing saved fields/versions are unchanged; new parses record the parser version separately from the unchanged preparation checker.

Accepted grammar: explicit colon, non-negative dot-decimal number, supported suffix unit; line/whitespace/semicolon boundaries. Units are metric-specific. No comma decimals/thousands, EUR/USD conversion, unspecified units, OCR, translated-document inference or real-data intake. Unsupported/mismatched/over-range entries are not guessed. UI adds native-language examples and limits, plus localized textarea examples. The existing 500-candidate cap and 1e12 numeric ceiling are engineering limits, not commercial or legal policy.

Validation: 390 automated tests PASS / 0 failed / 0 skipped (5 added); TypeScript PASS. Tests cover exact Unicode offsets, normalization, unsupported syntax/units, multilingual duplicates, real SQLite persisted source-linked unconfirmed fields and three-language guide rendering. Evidence: docs/evidence/multilingual-parser-tests.log. No AI/API credentials or model calls, no PACI kernel change, no schema migration, no independent verification claims. Authenticated production browser remains NOT VERIFIED; paid-launch blockers remain open. GitHub unchanged. Publication receipt follows.

Published Site v94: runtime 2685ea9d2245c740962c07ced6dd487a033e6c4b; deployment appgdep_6aeeda4e4a548191a0f322c5a14ecf1c succeeded. TypeScript and build PASS. Authenticated browser NOT VERIFIED; no model training; GitHub unchanged.

## 2026-11-07 · Actionable private field review queue

Completed the review-overview interaction: clickable count filters open the review queue; eight explicit filters cover all, pending, current matching/different, historically changed, confirmation-history issues, unlinked source and scope mismatch. A restored original value remains discoverable under historical changes. Each result shows source/scope issues and links to a focusable existing field-review article. Display is bounded to 20 rows with Show more; selecting a filter resets its row limit, switching tasks resets filter state. No evidence is removed, confirmed or adjudicated by filtering.

Validation: 385 automated tests PASS, 0 failed/skipped (3 added), TypeScript PASS, diff check PASS. Evidence: docs/evidence/field-review-queue-tests.log. Tests cover overlapping classifications, unchanged input/state, invalid filters, empty results, three-language markup, links and initial row bounds. Real authenticated browser clicks are NOT VERIFIED. This completes this bounded feedback-review UI, not AI extraction, dataset authorization, model training or overall paid-launch acceptance. No schema, API permissions, PACI or disclosure changes. GitHub unchanged. Publication receipt follows.

Published Site v93: runtime b88d22f1291c0697d5b63de9321617e8bce4cfd1; deployment appgdep_6aee9c647a588191b81467b66d14a555 succeeded. TypeScript and build PASS. Authenticated browser NOT VERIFIED; no model training; GitHub unchanged.

## 2026-11-07 · Private field review feedback overview (round counter 9)

Added fieldReviewSummary shared projection and a Chinese/English/Italian task panel showing pending, latest-value matching/differing, and historically changed fields. Reconfirming an unchanged value does not inflate value-change events; restoring the extracted value does not erase previous changes. Flags missing/mismatched confirmation history, unlinked source offsets/material versions and facility/month mismatch. Counts are per field candidate, not independent sources, model accuracy, verified labels or evidence level. Current implementation parses synthetic text deterministically; no AI model is connected or trained.

Owner-only GET /api/private-tasks?task=<id>&review=1 returns a private/no-store projection after existing authentication, ownership and stored-digest checks. Includes task/version, field IDs/codes, review states and counts only; excludes original text, quoted text, exact values, reasons and actor IDs. No export to model services, cross-tenant aggregation, training consent or model-training pipeline added. Existing originals and company confirmations are not independently verified ground truth. Any future improvement loop must distinguish workflow feedback, evaluation datasets and authorized model training; this feature only establishes inspectable feedback diagnostics.

Validation: 382 automated tests PASS / 0 failed / 0 skipped (6 added), TypeScript PASS. Tests cover zero versus missing, restore/reconfirmation history, source/scope mismatches, minimal projection, real SQLite correction history, actual route authentication/ownership/no-store and three-language rendering. Evidence: docs/evidence/field-review-summary-tests.log. Authenticated production browser remains NOT VERIFIED. No migration, PACI, sharing or real-intake changes. GitHub unchanged. Publication receipt follows.

Published Site v92: runtime 2c37c520f9cc627fade9c4cc47a2d1f0bf55a65b; deployment appgdep_6aee972adbc481919866260a40651057 succeeded. TypeScript and build PASS. Authenticated browser recovery NOT VERIFIED; GitHub unchanged.

## 2026-11-07 · Uncertain task save and version-conflict recovery (round counter 8)

Task mutations now retain a detached command snapshot and the same idempotency key after uncertain transport/server outcomes. A three-language recovery panel retries the ORIGINAL request; new task mutations and switching are blocked until resolved. Later form edits are excluded. Acknowledged writes are cleared before follow-up reads so refresh failures do not reclassify a saved write as pending. Structured API error codes and HTTP status take precedence over explanatory prose. Definitive validation failures release the pending command; VERSION_CONFLICT presents an explicit latest-version reload with warning that unsent field-review drafts will be cleared. No auto-merge or automatic resubmit against a newer version.

The pending request is memory-only: leaving/reloading or session loss removes it. UI instructs users to inspect saved tasks before recreating after reload. This does not provide cross-session durable offline recovery. Existing server-side version checks and idempotency remain authoritative. No schema, PACI, disclosure, identity or real-intake changes.

Validation: 376 tests PASS / 0 failed / 0 skipped, including 5 new tests. Real local SQLite lost-create-acknowledgement replay retains exactly one task and one operation. Also tested snapshot isolation, uncertain/definitive error classification, structured conflict error and Chinese/English/Italian recovery markup. Evidence: docs/evidence/task-save-recovery-tests.log. Authenticated production browser recovery remains NOT VERIFIED. Build and deployment receipt follows. GitHub unchanged.

Published Site v91: runtime 7d12fa37d585473ed165991b6a043fd97074dcf3; deployment appgdep_6aee94056b1c8191a134600312403d81 succeeded. Build PASS. Authenticated browser verification remains outstanding; GitHub unchanged.

## 2026-11-07 · Task request lifecycle isolation (round counter 7)

Private task UI now uses independent request generations for list, detail and download, plus a shared session epoch. Late reads, errors and completion handlers cannot overwrite a newer selection or clear its busy indicator. Same-task reloads are also distinguished. Session 401 is handled before JSON parsing, clears loaded task/list/outbox/review/form/request state and invalidates outstanding responses. Unmount/reactivation never revives old requests. Synchronous mutation guard blocks duplicate saves and task opening while saving; the existing server version checks and idempotency keys remain authoritative. New selection invalidates a pending JSON download; already downloaded copies cannot be recalled.

Validation: 371 automated tests PASS, 0 failed/skipped (5 added); TypeScript PASS. Log: docs/evidence/private-task-activity-tests.log. Tests use controlled delayed responses and check request generations, malformed/repeated 401, disposal/reactivation, error propagation and exact mutation request retention. Authenticated browser races are NOT VERIFIED. No database migration, PACI change, disclosure change, real-data intake or identity-provider change. This is UI lifecycle isolation, not server-side session revocation or a replacement for authorization. GitHub unchanged. Publication receipt follows.

Published Site v90 successfully: runtime a07b4b3b29b3272e11b91a95ba9c56855d16e104; deployment appgdep_6aee92fde85c8191af76fe941d38d588. Build PASS. Signed-in production file workflow remains NOT VERIFIED. GitHub unchanged.

## 2026-11-07 · Private file usage overview (round counter 6)

Implemented owner-authorized database usage summary: all-task account slot occupancy/remaining capacity plus selected-task stored, uploading and deletion-pending counts. Deleted rows release capacity; other accounts are excluded. New-upload closure does not hide existing usage. UI renders Chinese, English and Italian with a quota meter explicitly separate from evidence completion. Refresh-based snapshot, not measured R2 bytes or a quota guarantee during concurrent writes. No evidence-level, PACI, disclosure, pricing or schema changes. Engineering test cap remains 20 files, not commercial policy.

Validation: 366 automated tests PASS (3 added), 0 failed/skipped; TypeScript PASS. Evidence: docs/evidence/private-file-usage-tests.log. Previous 18 local runtime recovery checks were not rerun and are not cloud acceptance. Signed-in production verification remains outstanding; real customer intake and new file test admission remain closed. GitHub not synchronized. Deployment receipt follows.

## 2026-11-07 · paired-store backup restore rehearsal after v89

Extended the local integration script with an offline consistent copy of BOTH D1 and R2 persistence directories while workerd is disposed. Restores the snapshot into a separate test-only directory and validates exact file bytes, snapshot-time events, owner isolation and upload admission. Explicitly demonstrates stale backups contain files deleted after snapshot; test-only replay of current deletion metadata removes restored objects before release. Original latest event history is not merged/reconstructed: this is a bounded rehearsal, not a production migration utility.

Actual 18/18 runtime checks PASS: four new restore/deletion-reconciliation checks plus rerun of fourteen prior checks. Log docs/evidence/private-file-restore-runtime.log. No live data or production resources touched. No unit-suite rerun; earlier 363 PASS remains historical. Production snapshot coordination, independent durable deletion ledger, restore policy and authenticated hosted acceptance remain unimplemented/unverified. Online remains v89; GitHub remains v73.

## 2026-11-07 · persistent runtime restart acceptance after v89

Expanded scripts/verify-private-file-runtime.mjs to dispose/recreate the actual local Miniflare/workerd runtime against the same isolated D1/R2 persistence directories twice: after upload and after deletion. No schema reapplication or reseeding on restart. Checks retain file bytes/digest/metadata, owner isolation, closed upload admission, stable idempotency keys, exact historical events and append-only triggers. Deleted objects remain absent and the prior upload key cannot recreate them.

Actual result: 14/14 runtime checks PASS, including 5 new restart checks and rerun of the earlier 9 checks. Log docs/evidence/private-file-restart-runtime.log. This is graceful local runtime shutdown/restart, NOT abrupt process termination, power-loss resilience, cross-region restore, backup restoration or production authentication/R2 acceptance. Unit suite not rerun; earlier v89 363 PASS remains historical. No runtime application changes, database migration or configuration changes; online stays v89. GitHub remains v73.

## 2026-11-07 · local storage runtime acceptance after v89

Added scripts/verify-private-file-runtime.mjs using the installed pinned Wrangler Miniflare/workerd runtime, local D1 and local R2 persisted in an isolated temporary directory. Runs all tracked migrations (including file history triggers), exercises the actual privateFileRequest service, and disposes runtime/removes only its own temp directory. No credentials, production requests, customer data or uploaded files are involved. The PDF-shaped fixture tests bytes, not PDF parsing or malware inspection.

Actual new result: 9/9 runtime checks PASS. Upload/finalisation, retry deduplication, R2 stream/digest, ownership/origin denial, closed-upload owner management, deletion, event history and append-only triggers passed. Log docs/evidence/private-file-runtime.log. This is local runtime integration with injected synthetic actor identities, NOT a real hosted login or production R2 test. Previous unit suite remains 363 PASS (not rerun or counted as new this round). No application runtime change; reuse previously verified production build. GitHub remains v73.

## 上线回执 · v89

运行源码 `c9605a6b8d8f54af1d8fb8bd419ac907ab947212`；版本 `appgprj_6aadb2f67df081918266b82e3fc373fb~appgver_73b2570409308191afa8466de3338c14`；部署 `appgdep_6aee8ed024e08191bcf84b5d83687faf`，succeeded。363项测试、类型检查、生产构建通过。下载流实际大小限制已发布；线上R2与登录验收未完成，真实资料上传未开放。GitHub保持v73。

## 2026-11-07 · v89 bounded private download

Replaced unbounded object.arrayBuffer download with bounded stream reading. Actual bytes must equal the stored expected size and stay within the existing 2 MiB engineering cap; oversized streams are cancelled, truncated files rejected and reader locks released on failure. Existing digest and post-read deletion-state checks remain. No data schema, permissions, PACI, evidence-level or real intake changes.

363 tests PASS / 0 fail / 0 skip; TypeScript PASS. Three new tests cover chunked reads/truncation, cancellation despite misleading size metadata, invalid limits/storage errors. Existing end-to-end local file tests now use streaming R2 doubles. Hosted R2 and signed-in browser still NOT VERIFIED. Build/publication pending receipt. GitHub remains v73. User counter 2 does not set implementation scope.

## 上线回执 · v88

运行源码 `ed998c22d33b4da78743b94b48003a7fed9ca1fc`；版本 `appgprj_6aadb2f67df081918266b82e3fc373fb~appgver_7277250e375881919b4074d7c1bce42b`；部署 `appgdep_6aee8e0e07bc8191ac0e797d257ff5dd`，succeeded。360项测试、类型检查与生产构建通过。新增上传资格与已有文件管理分离；仍未配置测试账号、未开放真实资料、未完成线上R2和登录浏览器验收。GitHub保持v73。

## 2026-11-07 · v88 owner management after upload gate closure

Separated new-upload admission from management of existing owner files. Upload still requires configured test actor, storage binding and synthetic confirmation. Existing task ownership and authentication authorize list/history/download/delete/recovery even after the upload allowlist is removed or malformed. Same-origin mutation checks and cross-account denial are retained. Metadata/history can be read without a bucket; binary operations still fail safely if storage is unavailable. No buyer access or real customer intake enabled.

List response includes can_upload; UI uses this explicit server flag, hides upload form when closed, and retains existing file/history/deletion controls. Account labels now specify new-upload testing. A gate closure response during upload clears the pending selection without hiding already loaded owner files.

360 tests PASS, 0 fail, 0 skip; TypeScript passed. Two new tests cover owner management following revoked/malformed admission and retry cleanup after revoked upload rights; previous gate tests updated to distinguish intake from ownership. Actual hosted storage and authenticated UI remain unverified; no test IDs configured. Build/publication pending. User suffix “1” is only their round counter, not a task limit or product version. GitHub remains v73.

## 上线回执 · v87

运行源码 `6c98e80ee986167523291f6d33ac71b55b8357f1`；版本 `appgprj_6aadb2f67df081918266b82e3fc373fb~appgver_56a433b501688191a69a9b3763a33c62`；部署 `appgdep_6aee8cc2d6208191bfb5bd78042a4195`，succeeded。358项测试、类型检查和生产构建通过。0024文件状态记录迁移及三语言分页查询界面已发布。文件测试门禁仍关闭；线上R2及登录后操作未验收。GitHub保持v73。

## 2026-11-07 · v87 private file state history

Added migration 0024_sleepy_steel_serpent.sql with a private state-event table, owner/task/sequence index, and SQL triggers recording inserts/state changes atomically with the file metadata statement. Event UPDATE/DELETE is rejected by triggers. This is application/database append-only behavior, not protection against a privileged database operator, not blockchain immutability. No historical backfill or invented events.

Owner-only, test-gated GET history with validated monotonic cursor, 50-event pages and no-store responses. Projection includes sequence, opaque file ID, from/to state and recorded timestamp only; no filename, object key, document body, recipient or other account ID. New three-language collapsed history viewer offers refresh and older pages, including after object deletion. No human/AI attribution inferred: this is file state history, not access/download logging or PACI execution receipts.

358 tests PASS, 0 fail, 0 skip; TypeScript passed. Seven new tests cover persistence after deletion/minimal projection, append-only constraints and atomic rollback, no duplicate events on retries, ownership/gate/cursor validation, pagination with concurrent additions, client request and localized escaping. Real local SQLite executes the new trigger migration; R2 remains a test double. Actual hosted R2/authenticated browser remain unverified. No test account configured and no real intake enabled. Build/deployment pending receipt; GitHub remains v73.

## 上线回执 · v86

运行源码 `3fc32b9eef83ca0e4290f8a135e78b045b2dd62d`；版本 `appgprj_6aadb2f67df081918266b82e3fc373fb~appgver_bc7b52f2b8e8819186eedafe6f184e84`；部署 `appgdep_6aee8b82d8f481919faef094121d3845`，succeeded。351项测试、类型检查和生产构建通过。中断文件清理与失败删除重试已发布，仍受测试账号门禁保护；真实线上存储和登录浏览器未验收。GitHub保持v73。

## 2026-11-07 · v86 incomplete file recovery

Added explicit per-task cleanup POST action and three-language confirmation UI for interrupted uploads and failed deletes. Eligibility: DELETING immediately, or UPLOADING older than 15 minutes (engineering recovery delay, not evidence retention policy). Maximum 20 candidates; only current actor/task and configured test gate, same-origin mutation. Atomic conditional claim rechecks state/time before deletion, so an upload completed after discovery is skipped. Late object puts following cleanup are removed by existing upload cancellation handling. Per-item errors yield pending counts without exposing storage details; retry is safe. Existing stored-unreviewed files are excluded. No scheduling or automatic background cleanup is claimed.

351 tests PASS, 0 fail, 0 skip; TypeScript passed. Six new tests cover eligibility/repeated cleanup, retryable storage failure, completed-upload race, auth/tenant/origin/gate, late-put race, and client action without file bytes. Real SQLite plus existing in-memory R2 double; actual hosted storage and authenticated UI still unverified. No runtime config, database migration, buyer/PACI or evidence-coverage change. Build/deployment pending receipt. Test account ID still required; GitHub remains v73.

## 上线回执 · v85

运行源码 `a455cde6c28e9594671ca1e708bdeafa9acf69b0`；版本 `appgprj_6aadb2f67df081918266b82e3fc373fb~appgver_781e3b0062cc8191a7d02711141bca54`；部署 `appgdep_6aee8a70b43081919c53b6f0627e88a3`，succeeded。345项测试、类型检查及生产构建通过。账号编号复制和测试状态面板已发布；测试账号尚未配置。实际浏览器确认发布前账号页处于未登录状态；登录后面板及R2实测未验收。GitHub保持v73。

## 2026-11-07 · v85 account test-access handoff

Added signed-in account identity panel: read-only site actor ID with copy/manual fallback, explicit distinction from password/public contact ID, and per-actor file-test access status. Server computes only this user's eligibility; configured IDs, bindings and other users are never serialized. Shared privateFileAccess is used both by the account page and file API, preserving fail-closed behavior and synthetic-only restrictions. No auto-enrolment or grant mutation.

345 tests PASS / 0 fail / 0 skip; TypeScript passed. Four new tests cover missing/malformed access configuration, no real-data permission, escaped read-only ID and three languages, and absence of identity/test controls for anonymous visitors. Existing file API tests also passed using the shared gate. Build/publication pending receipt.

Actual cloud-browser visit to /account?lang=zh succeeded this round: signed-out account page, disabled contact fields, pending email/phone registration and localized footer observed. There is no authenticated browser session. No tester ID was inferred, no test gate configured, no R2 operation claimed. Browser outcome completion-summary tool failed schema validation (required code despite completion_summary contract); page observation itself succeeded. Next external prerequisite: user signs in and supplies the displayed site account ID so a narrowly configured synthetic test can proceed. GitHub remains v73.

## 上线回执 · v84

运行源码 `f22c7c418b80384f28b0ae9392f04d26e6d93511`；版本 `appgprj_6aadb2f67df081918266b82e3fc373fb~appgver_505674f5674c8191b6ee5f112b1b37ad`；部署 `appgdep_6aee88ed33288191aa9850a3741e7704`，succeeded。341项测试、类型检查、生产构建通过。私密任务内新增折叠文件测试界面；线上确认测试账号配置缺失，上传入口保持关闭。实际R2读写和登录浏览器验收未完成；未开放真实客户文件。GitHub保持v73。

## 2026-11-07 · v84 private file test interface

Added a collapsed PrivateFilePanel inside each selected private task. The panel explicitly states platform cloud storage, synthetic fixtures only, no scanning/extraction/evidence linkage and no evidence-level increase. Upload controls appear only after an authenticated list succeeds. Closed and expired-session states are localized in Chinese/English/Italian. A separate checkbox confirms synthetic-test cloud storage. File validation uses the shared backend policy; uploads retain the same request key and bytes on uncertain retries within the mounted panel. Downloads check the binary response before saving. Delete requires an inline confirmation, offers retries, and never implies recalling downloaded copies. Pending/deleting objects cannot be downloaded. Task/language remounts abort pending reads and prevent stale updates; file content is never stored in browser persistent storage.

341 tests PASS, 0 fail, 0 skip (7 new client/navigation/render tests). TypeScript passed after correcting the client helper JSDoc options contract; build/publication pending receipt. Tests include stable retry keys, raw filename encoding, size/type/confirmation policy, gate/error propagation, unexpected download content, cancellation propagation, collapsed state, language and filename escaping. No new migration or runtime configuration. Online configuration read confirmed PRIVATE_FILE_TEST_ACTOR_IDS absent. No authenticated browser or real R2 read/write acceptance; gate remains closed. GitHub remains v73.

## 上线回执 · v83

运行源码 `4a7855d3cfebde76f2ffad3c1b9a101a9acc6057`；版本 `appgprj_6aadb2f67df081918266b82e3fc373fb~appgver_a9be74fc5e44819195da7002614173d6`；部署 `appgdep_6aee87a0d1fc81918b37fc8c10774da1`，succeeded。334项测试、类型检查、生产构建通过。新增私密文件后端、R2绑定及0023迁移；测试账号未配置、入口默认关闭。实际线上R2读写、登录浏览器及真实文件处理未验收。GitHub保持v73。

## 2026-11-07 · v83 private file staging backend

Implemented authenticated /api/private-files GET/POST/DELETE with existing task ownership, same-origin mutations, bounded streaming input (2 MiB), PDF/PNG/JPEG signature screening, SHA-256, request-key idempotency and an atomic 20-active-file per-account reservation. These numeric caps are engineering test limits, not evidence or pricing policy. Binary data goes to private R2; D1 stores metadata and UPLOADING / STORED_UNREVIEWED / DELETING / DELETED states. Download is owner-only, attachment/octet-stream with no-store/nosniff/sandbox headers and hash verification. Object keys are not exposed. Delete hides access before removing bytes, supports retry, clears current filename, and handles in-flight upload/delete races.

New migration 0023_magenta_dexter_bennett.sql and generated metadata; R2 binding BUCKET declared. Endpoint defaults CLOSED: only IDs in PRIVATE_FILE_TEST_ACTOR_IDS may use it, with explicit synthetic-test-only-v1 upload confirmation. No IDs configured this round. This is not a real-customer upload launch, virus scanner, AI extraction, evidence verification or buyer sharing. Existing synthetic private-task workflow is unchanged and files do not count toward material progress.

Validation: 334 tests PASS / 0 fail / 0 skip; 10 new request/storage tests using real SQLite migrations and an in-memory R2 double. Covers cross-account denial, origin, closed gate, upload/download, idempotency, caps, format checks, digest failures, retryable deletion, failed put, concurrent retry and upload/delete race. TypeScript passed. Actual hosted R2 operations and signed-in browser NOT VERIFIED; publication receipt pending. GitHub remains v73.

## 上线回执 · v82

运行源码 `2208a4b5cb652e887fe39e01b3fa33e64a87bccb`；版本 `appgprj_6aadb2f67df081918266b82e3fc373fb~appgver_6ac27894218c8191bb4911867c6eac6e`；部署 `appgdep_6aee85d72bc48191a987aafa23ee3dce`，succeeded。324项测试、类型检查、生产构建通过。身份入口统一和首页姓名安全回退已发布；独立邮箱注册未开通，真实登录浏览器验收待完成。GitHub保持v73。

## 2026-11-07 · v82 application identity boundary

All business API routes and identity-dependent pages now use app/auth.ts (getCurrentUser / signInPath), which delegates exclusively to the existing hosted provider. Stable actor IDs remain byte-identical; no database keys are rewritten and no account is linked by email. No new session, OAuth stack or OTP provider is enabled. Hosted provider headers remain confined to app/chatgpt-auth.ts. Home no longer decodes raw name headers directly; malformed percent encoding safely falls back. Anonymous greeting is localized.

324 tests PASS, 0 fail, 0 skip; 6 new boundary tests cover anonymous/incomplete identity, untrusted hints, same-email distinct actors, stable IDs, hosted redirects, display-name fallback and dependency confinement. First run exposed the direct-header home path and a stale old-helper test assertion; both corrected before the passing rerun. TypeScript passed. Authenticated browser and external-provider acceptance NOT VERIFIED. Build/publication pending receipt. No GitHub sync.

## 上线回执 · v81

运行源码 `ef34d45cd6bbdf0fc6248099ce3205f5f0871315`；版本 `appgprj_6aadb2f67df081918266b82e3fc373fb~appgver_52cb12986f348191adc243f43b9efb3a`；部署 `appgdep_6aee843b179c8191b9a0574acb51a838`，succeeded。318项测试、类型检查、生产构建通过。登录返回衔接及隐私文案已发布；真实登录回调浏览器验收待完成。独立邮箱注册尚未实现。GitHub保持v73。

## 2026-11-07 · v81 account navigation / paid-pilot gate

Implemented validated internal return destinations through the account sign-in round trip, language switches and session-expiry recovery. Signed-in users get a prominent continuation action; contact entry remains optional. Reject external/protocol-relative URLs, backslashes/control characters, encoded path bypasses, auth/account loops and API destinations. Account privacy footer is localized in Chinese, English and Italian.

Validation: 318 tests PASS, 0 fail, 0 skip (4 new security/navigation/render tests); TypeScript passed. Full authenticated browser round trip has NOT been verified. Production build/publication receipt pending. No database migration, new identity provider, OTP, email delivery, payment or real-material enablement. GitHub remains v73.

Hosting audit: existing Sites integration owns visitor authentication and confirms ChatGPT sign-in. External email identity support has not been established. Do not build an unapproved parallel session stack or present contact fields as account creation. Independent email registration is a release blocker, not completed by this round.

## 上线回执 · v80

运行源码 `8b104743b59b0ec7659394eff69be5052fe93e7f`；保存版本 `appgprj_6aadb2f67df081918266b82e3fc373fb~appgver_cafe1f4470ec81919bb8f2099cac7a1a`；部署 `appgdep_6aee7fdd1d708191addc377685e88ffa`，succeeded。314项测试、类型检查、生产构建通过。字段空白保护与确认历史已上线；登录后的实际输入/展开尚未浏览器验收。GitHub保持v73。

## 2026-11-07 · 字段空值保护与确认历史

修复前端 Number('') 把清空输入转为0的问题：独立输入解析器拒绝空白、非法格式、负数、非有限及超出后端上限的值；明确输入0仍可提交。确认表单要求数值和非空依据，输入/提交在请求中禁用，提交处理再检查有效性。支持小数与合法科学计数法，拒绝十六进制和带分隔符字符串。后端既有numeric校验继续拒绝缺失/null/字符串/布尔值，没有放宽接受范围。

每个字段新增折叠的确认/更正历史，呈现原确认值、新值、理由和时间，保留0与未确认的区别。只读显示已有后端追加记录，不凭空补历史，不显示操作者账号、不向买方新增披露。中英意系统文案分开，用户说明转义。无数据库迁移、任务schema、PACI接口或检查政策变更。

实际314项测试通过、0失败、0跳过（新增5项）。首次测试夹具传了JSON不支持的undefined导致预期错误码不符；改为实际HTTP会出现的缺失字段后全套通过。覆盖空输入/异常数字、明确0、小数/边界、控件禁用、三语言历史转义、后端拒绝无效值及零值更正后旧版本保留。日志 docs/evidence/field-review-tests.log。TypeScript/diff通过，生产构建发布待回执；实际登录浏览器输入/展开未验收。GitHub保持v73。

## 上线回执 · v79

运行源码 `2e75c1566fdbb666be38e9acd6f35e16425a46c5`；版本 `appgprj_6aadb2f67df081918266b82e3fc373fb~appgver_e9f4b4aa8fa4819197d50c836c30d096`；部署 `appgdep_6aee7de3ca548191b98d993f59a26cfc`，succeeded。309项测试、类型检查、生产构建通过。概览补交待办及失效关联恢复已上线；登录后的滚动/聚焦尚未浏览器验收。GitHub保持v73。

## 2026-11-07 · 概览补交待办与失效关联恢复

证据准备概览新增独立的材料补交待办，按当前场所/月展示尚无可用已确认材料、已有材料待关联、企业确认补交、原关联需重开核对四种状态及未完成/已确认数量。材料覆盖百分比不变，明确100%覆盖不等于缺口已确认。点击去处理会展开补交面板，滚动并聚焦对应项，支持锚点和键盘。

状态使用与后端检查相同的gapReceiptConfirmed/eligibleGapMaterials规则，不仅凭保存的status判断。防御性修复：历史记录虽标已确认，但关联材料或版本失效时，界面仍能重新打开，避免只能重复确认而被后端拒绝。候选材料要求缺口具备非空类别、场所及月份，缺少范围不能凭空匹配。无新增业务权限、数据库、PACI接口或正式政策，旧版本不重写。

实际309项测试通过、0失败、0跳过；新增3项验证满覆盖仍待确认、确认/版本失效/重开后的状态变化、跨范围及空类别拒绝、三语言渲染与失效关联重开控件。日志 docs/evidence/gap-overview-tests.log。TypeScript/diff通过；真实登录浏览器滚动/聚焦未验收，构建发布待回执。GitHub保持v73。

## 上线回执 · v78

运行源码 `518d9cf85872f2b75dba477e6fcb1beb10e4ec58`；版本 `appgprj_6aadb2f67df081918266b82e3fc373fb~appgver_420f344020c08191a6c48061e5036b8e`；部署 `appgdep_6aee7b7bbde48191a53c83b637476744`，succeeded。306项测试、类型检查和生产构建通过。材料补交确认/重开均已实现，仍仅合成材料；登录浏览器完整流程未验收。无新增数据库迁移或PACI接口变更。GitHub保持v73。

## 2026-11-07 · 材料缺口补交确认与重开

新增 confirm_gap_receipt / reopen_material_gap 前后端动作。补交确认必须明确选择同任务、同类别、同场所和月份、可读且已企业确认内容的合成材料，填写依据并勾选核对；后端重新验证所有条件，不信任前端列表。关联保存材料编号/版本、操作者、时间和依据。重复确认要求先重开，重开必须说明原因。幂等重试不增加重复历史，仍沿用租户隔离、版本并发控制、原子写入。

gap.status 新增 RECEIPT_CONFIRMED，记录resolution和追加history；原缺口reason、登记人/日期、目录性质不变。重开清空当前resolution但保留历史事件和旧快照。基础检查器更新 dossivo-preparation/0.5：只有仍能验证对应材料/版本的已确认补交记录，才不再仅因旧目录项触发资料不足；未确认字段、数字冲突、其他目录继续阻止完整结论。旧冻结卡不重算，no_anomaly仍false。买方白名单不新增披露缺口依据。此为企业材料取得声明，不是独立核验、实质整改关闭或法律合规。

界面增加可折叠“材料缺口补交核对”，显示可选材料、确认条件、关联原文跳转、重开操作和历史。中英意提示独立；用户自填文本转义。无数据库迁移，任务schema仍0.2（可选gap附加字段），PACIscan/Protocol/正式卡条件不变。无真实文件、邮件或自动裁决。

实际306项测试通过、0失败、0跳过（本轮新增5项），包括确认/重开与旧卡不变、错范围/类别/目录/未确认拒绝、幂等及账号隔离、未确认字段仍阻断、三语言控件与转义。日志 docs/evidence/gap-receipt-tests.log；类型检查/diff通过。浏览器实际登录闭环未验收；构建与发布回执后补。GitHub本轮未同步。

## 上线回执 · v77

运行源码 `ff0e6e14fd2bbb90ebb94368402fbd175b9d69da`；保存版本 `appgprj_6aadb2f67df081918266b82e3fc373fb~appgver_18b792c6cc18819181ae6366374c6c1f`；部署 `appgdep_6aee79196840819194b7518171643b9c`，succeeded。301项测试、类型检查及生产构建通过。登录后的缺口保存浏览器闭环仍待验收；仅合成资料，无真实通知、无自动缺口关闭。GitHub保持v73，未重复同步。

## 2026-11-07 · 私密材料缺口登记

“待补充”新增登记未取得原因入口，预选对应材料类别，打开合成资料表单，填写材料名、保管/跟进人和原因/后续安排。新增 record_material_gap 后端动作：类别白名单、必填及长度校验，强制使用当前任务场所/月和真实登录操作者；复用版本存储、幂等键、并发检查、租户隔离及原子写入。

保存为 DIRECTORY，original_seen=false，附加 dossivo-material-gap/0.1 说明；不可据此定位字段或确认原件，不增加提交进度、不发送通知、不授权披露。概览显示私密缺口历史，所有自填文字转义，中英意分别渲染。之后补交同类同范围合成材料可恢复概览提交覆盖，旧缺口记录及版本继续保留；历史提示明确不代表当前仍缺。既有基础评估对目录的保守资料不足判断不在本轮改写，因此本轮不声称完成缺口关闭/裁定。待后续建立明确的关联与复核关闭流程，不能仅靠上传同类文件删除历史缺口。

测试301项通过、0失败、0跳过（新增4项）：持久化/来源隔离/私密投影，非法输入及幂等，补交后覆盖与历史保留，三语言及转义。日志 docs/evidence/material-gap-tests.log。TypeScript/diff通过。没有数据库迁移或PACI接口/Protocol变化，没有真实通知或真实原件开放。实际登录浏览器保存闭环尚未验收；生产构建与发布回执后补。GitHub本轮不重复同步。

## 上线回执 · v76

运行源码 `a9f16ba65d78ab08498a5c17926fbcf82e1a8bf5`；版本 `appgprj_6aadb2f67df081918266b82e3fc373fb~appgver_eca58e6551fc8191a795772cb6c04c40`；部署 `appgdep_6aee770070588191b92f94e8d695441e`，succeeded。297项测试、类型检查、生产构建通过。登录后实际锚点滚动未验收；未新增数据库迁移/PACI契约，GitHub保持v73。

## 2026-11-07 · 准备概览逐材料处理路径

已提交/待核对卡片增加可展开的材料明细与原材料锚点，逐份显示材料确认、字段缺失/未定位、字段确认、重复候选四类待办。材料区新增对应定位目标与高亮。修正同类一份材料已确认而另一份待确认不显著的问题；也不再把整份材料声明已确认等同于所需字段已定位。当前范围以场所和月份精确匹配，跨范围材料不混入来源列表。

当前概览的待核对规则更严格，但既有覆盖统计与冻结卡不重写。全部核对完成只表示准备待办已完成，不表示独立核验/法律合规。无新增授权、数据库迁移、PACI接口或正式政策。原材料标题安全转义，提示中英意分离；没有自动确认、删除候选或自动裁决。

实际297项测试通过、0失败、0跳过（新增3项）：多材料待办不被掩盖、字段与材料状态分别处理、三语言提示/安全链接渲染。日志 docs/evidence/material-review-actions-tests.log。类型检查、diff通过；构建发布待回执。登录后的实际锚点滚动仍未做浏览器验收。GitHub本轮未同步，保持v73。

## 上线回执 · v75

运行源码 `53d1ffb7dda0a15d2eef158f0b0674d98039f0d8`；保存版本 `appgprj_6aadb2f67df081918266b82e3fc373fb~appgver_fb55095dc738819191e5c520e59965f3`；部署 `appgdep_6aee7579f1448191b70ee1c8da932aa5`，succeeded。294项测试、类型检查、生产构建通过。准备概览位于打开后的私密任务材料区顶部；不是跨任务首页仪表盘。登录后跳转/手机端浏览器未验收。本轮无新数据库迁移，GitHub仍v73。

## 2026-11-07 · 证据准备概览（本轮）

在已打开的私密任务顶部增加四张概览卡：已提交、待补充、待核对、可进一步补强。读取当前任务已保存材料/字段与自选清单，无虚构经营数字。自选进度仅统计当前场所及月份的材料；跨范围材料单独提示，零项计划显示未选择而非100%。目录不计提交，企业确认不等于独立核验，重复指标即使已确认仍进入待核对。

电费/社保/工资/产量/外部报告提供补强用途说明。真实账单、PDF/图片路径标明尚未开放，按钮明确为合成资料准备；点击打开现有表单并选定类别，不自动保存或授权。待核对链接进入字段确认区；调整清单展开既有设置。完整参考覆盖与历史L1/L2/L3范围详情折叠，突出四卡概览。界面中/英/意分别提供文案；原材料/场所内容保持原样且转义。采用响应式双列/单列布局。

此概览只作为准备辅助，不改变原卡片覆盖算法、证据等级、披露权限、数据库、PACIscan或Protocol接口。待补充只是当前自选清单，不推定所有项目法定必交。未新增不适用裁定或真实文件处理。状态来自现有后端私密任务，未新增独立统计服务。

实际294项测试通过（本轮新增4项），0失败、0跳过；测试涵盖目录/未提交、月份场所隔离、零项计划、确认后冲突仍提示、状态不变与三语言渲染转义。日志 docs/evidence/preparation-overview-tests.log。类型检查与diff通过；构建发布待回执。真实登录后的点击、滚动及移动端浏览器交互尚未验收。GitHub本轮不重复同步，仍为v73。

## 上线回执 · v74

运行源码 `3dc1631a74c168c353a3818837f5f6c8274c8ba6`；保存版本 `appgprj_6aadb2f67df081918266b82e3fc373fb~appgver_34a6715db9148191989300d6423ed664`；部署 `appgdep_6aee73c8c9588191825b5cba669d7f50`，succeeded。290项测试、类型检查和生产构建通过。真实登录浏览器展开/定位尚未验收；上轮浏览器超时，本轮未重复尝试。GitHub保持v73，未再次同步。

用户新议题：需要突出“已提交、还缺什么、可补充的交叉核对材料”的证据准备概览。建议沿用真实材料覆盖状态，区分用户待补充与产品尚未支持，不能把电费等上传直接认定为更高证据等级或合规分数。此议题尚未作为新Dashboard实施；下一轮优先核查现有覆盖面板与材料目录再落地。

## 2026-11-07 · D1 候选冲突核对面板

私密任务新增按指标归组的候选核对面板，逐条呈现材料标题、场所/月、原文引句及页行、解析值与企业确认值，并链接到对应确认记录。系统提示中/英/意分离；材料标题和引句原样转义显示。没有重复候选时不显示面板，重复组默认折叠。该面板基于当前任务，不把旧检查结果与新数字混合呈现。

基础检查增加 candidate_conflicts，保留候选字段/材料编号、范围、引句位置、来源组及当时确认值；相关比率明确报告 AMBIGUOUS_INPUT 或 SCOPE_MISMATCH。检查器版本 dossivo-preparation/0.4，任务schema仍0.2；附加字段不改数据库/PACIscan/Protocol接口。冻结准备件保留当时冲突快照，后续更正不改旧卡。买方基本投影继续白名单，不披露新增冲突明细。没有排除候选、自动裁决或独立核验；用户仍须核对原文，不因多份材料增加独立佐证。

实际测试290项通过、0失败、0跳过；新增3项验证冲突快照/冻结后不变/买方不泄露、跨范围及空状态、三语言渲染转义与定位链接。日志 docs/evidence/candidate-review-tests.log；TypeScript与diff检查通过。生产构建/发布回执待补。真实登录后的展开、锚点跳转未进行浏览器验收。仅合成资料，真实OCR/模型解析和正式链上证明仍未开启。本轮未再次同步GitHub，GitHub保持上轮v73与79b9fb7回执。

## GitHub 同步回执 · v73 · 2026-11-07

公开仓库 JUGCODE/DOSSIVO 的 main 已核验包含源码提交 `8fee53cc6d5916bb9214c82b6838ec556a283954`，树 `3ada05f77cf9fe90505c702452da1e3a1f8f3a2c`，399个当前跟踪文件；此后仅追加本文档回执。不导入Sites历史，无保密合同正文、真实个人资料、运行数据库或密钥。运行版本v73及287项本地测试结果见下。源码同步不表示真实账号浏览器流程、正式PACI链上证明或真实数据处理已经验收。

## 上线回执 · v73

运行源码 `1aea6e58f06eb6d139bf3cb93c6d44cc2a954342`；版本 `appgprj_6aadb2f67df081918266b82e3fc373fb~appgver_34e6c42a27e4819199ea40b1aff956a3`；部署 `appgdep_6aee6c5c91bc8191b19e15e5d90ea307`，succeeded。287项测试、类型检查、生产构建通过；真实登录浏览器闭环未验收。GitHub当前快照已同步；不包含Sites历史提交。

## 2026-11-07 · D1 重复字段候选保留（本轮）

合成文字解析由仅取首个匹配改为保留全部匹配，每条保留原文引句、行号、UTF-16位置、单位换算和同源编号。重复相同数字也不被当作独立佐证。同一指标只要存在多个候选，即使仅确认其中一个，也不进入确定计算；不自动选择有利数字。界面解释此边界，中文、英文、意大利语提示分开。

解析器标识更新为 dossivo-preparation/0.3；任务 schema 0.2、数据库迁移至0022、PACIscan/Protocol接口均不变。已有快照/冻结卡不重写；历史已定位材料不自动重跑，需要新建合成任务重新导入。达到500个字段上限时整次解析拒绝，原任务不发生部分写入。尚无候选排除/裁定功能，歧义不能通过隐藏候选消除；真实OCR、AI解析、正式链上证明仍未启用。

实际验证：287项测试通过、0失败、0跳过（本轮新增3项：冲突与部分确认、相同重复值、容量溢出回滚）；日志 docs/evidence/repeated-field-tests.log。TypeScript通过；生产构建/发布回执后补。真实登录浏览器流程未验收。本轮用户要求GitHub同步，采用当前源码快照追加至GitHub现有历史，不导入包含保密草案的Sites历史。

## 上线回执 · v72

运行源码 `4f5210ced609caadd9ae5a5054b10f53847e6614`；保存版本 `appgprj_6aadb2f67df081918266b82e3fc373fb~appgver_6d3eb332b4148191842d6ff40767ac2b`；部署 `appgdep_6aee6a23f990819199b005624cefbb93`，succeeded。284 项测试通过，类型检查与生产构建通过。真实登录浏览器闭环未验收；本轮仅完成同任务合成文字来源关联。GitHub 未同步。此回执不改变 v72 运行代码。

## 2026-11-07 · D1 / DS07 材料来源追溯基础（本轮）

根据主指令第19章回到D1私密证据任务，补DS07同源关联基础，而不是继续扩展合作伙伴外围功能。核查原实现每次导入/加入样本都会产生独立root_id；虽然 independent_source_count 一直为null，没有实际计入独立佐证，但缺少原文/副本/译文/摘要的对应关系。

新导入的合成文字可选择同一任务内可读原文，并声明译文、摘要或相同文字副本，必须填写依据。新材料保存父材料编号、来源组root_id、关系类型、声明/匹配方法、操作者、时间及未独立核验状态。译文和摘要继续沿父材料的根编号追溯；同任务、同场所、同月份且全文完全相同的导入/内置样本自动归组。相同文字匹配仅用于保守去重，不证明来源真实或独立性。不同场所/月份不自动合并；显式跨范围关联拒绝。目录、其他任务、其他账号材料不能充当此处原文。相同文字副本必须确实保留相同文字。

界面新增材料来源与副本关系面板，以及导入时选择原文、关系、依据。原文标题/依据原样显示并转义；系统提示中英意分开。新文字导入保留首尾空白，避免为去重修改原文；原字段位置仍绑定保存的文字。原有历史任务、卡片及摘要不回填、不重算hash。当前只对新导入建立关系，不能声称历史已完成去重。

检查结果新增 source_lineage 可读材料数/来源组数摘要，但 independent_source_count 仍为null，所有来源仍 SELF_REPORTED / 未独立核验。多个已确认同码字段继续判AMBIGUOUS_INPUT，不自动选出有利数值或把多个指标当独立佐证。私密冻结卡保留来源关系；买方基本投影仍采用原白名单，不新增原文、来源组编号或关联说明披露。材料覆盖率、正式卡门槛、PACI链上状态均不改变。

实际验证：284 项测试通过，0失败、0跳过。新增6项后端DS07/02/10/15测试和1项中英文/转义渲染测试。覆盖重复同根、译文摘要链、跨范围隔离、目录/跨任务拒绝、关系依据校验、原文空白保留、重复字段歧义、冻结卡关系与旧版不变。日志 `docs/evidence/material-lineage-tests.log`。TypeScript/diff通过；构建与发布回执随后补入。真实登录浏览器闭环未验收。

兼容边界：沿用任务schema 0.2的可选附加字段，material.lineage 自带 dossivo-material-lineage/0.1 标记；无数据库迁移，PACIscan内核/HTTP契约/Protocol版本不变，无新外发接口。D3正式证明依赖仍未完成。DS07仅完成合成文字、同任务路径；真实PDF/OCR、模型副本自动识别、跨任务来源复用、稳定企业/工厂ID与历史关系回填均待继续，不把本轮当作56场景整体验收。

GitHub未同步；未接收真实劳工原件、配置管理员或发放真实合同。

## 上线回执 · v71

运行源码 `94cf0c443758d968e07da5971902d819b61634c6`；版本 `appgprj_6aadb2f67df081918266b82e3fc373fb~appgver_dc95792e8c148191b17237f42f5d4edf`；部署 `appgdep_6aee66fbebe48191b082634b8b92a7d2`，succeeded。277 项测试通过，类型检查与生产构建通过。线上匿名合作伙伴页已打开，未呈现私密历史记录。真实登录后的展开/翻页及双账号流程未做浏览器验收；管理员配置及真实申请收集状态未改变。此文档回执不改变 v71 运行代码。

## 2026-11-07 · 合作申请审核时间线（本轮）

申请页和管理员队列新增可展开的审核进度/历史记录。展示修订号、提交/资格审核/撤回、处理后的状态、固定类别的补充提示和时间。中文/英文/意大利语系统文案分离；时间按浏览器当地显示。申请人只看到申请人/审核员角色，不返回审核员账号、操作编号或申请/合同正文；管理员专用接口才可核对实际操作账号。

复用既有申请事件表，GET `partner-applications?history=<type>` 始终从真实登录身份确定所有者，忽略用户伪造 recipientId。管理员 GET `partner-applications/admin?history=<type>&recipientId=<account>` 仍需精确管理员白名单。每页25条，以修订号游标读取更早记录，新增事件不挤乱旧页。展开才读取，可刷新最新/加载更早；新请求取消并替代旧请求，卸载/身份目标切换取消未完成读取，401/403清空已显示记录。

明确边界：历史批准不是当前访问权；每次合同读取仍走现有资格及版本授权校验。此处没有邮件/推送、自动核验、合同变更历史或链上证明。当前管理员未配置、真实申请收集关闭；本轮不创建测试生产资料、不扩大权限。无新数据库迁移，沿用0022事件表和索引，PACI Protocol/PACIscan接口、证据分享和存储边界不变。

实际测试：277 项通过、0失败、0跳过。新增5项历史API测试（身份与管理员门禁、账号隔离/投影、管理员操作账号、游标稳定性、输入校验与审核员移除后的本人读取）及1项语言/转义渲染测试。日志 `docs/evidence/partner-history-tests.log`。类型检查通过；生产构建/发布回执随后记录。真实双账号浏览器验收仍待管理员配置，不以本地测试代替。GitHub 未同步。

## 上线回执 · v70

运行源码 `3818df3b61f1e36af6e4f4cae7c6c7ea1cd801e4`；版本 `appgprj_6aadb2f67df081918266b82e3fc373fb~appgver_b0f0af03c5c481918edbb156e8dee87e`；部署 `appgdep_6aee657a0690819194af6808bae74e87`，succeeded。271 项测试通过，类型检查与生产构建通过。线上匿名实测指定版本链接：英文切中文后保留版本，登录返回链接保留版本，未显示合同内容或获批版本列表。真实管理员/收件人多版本流程未验收；管理员配置、真实合同和申请开放均未改变。此文档回执不改变 v70 运行代码。

## 2026-11-07 · 合同多版本隔离（本轮）

合同不再限定单个硬编码草案版本。上传、审批、撤销、读取与下载均带明确版本编号；文件内容必须匹配请求指定的类别/版本/语言。版本标识限定为 `partners-draft/主版本.次版本[.修订]-YYYY-MM-DD`，它只是草案标识，不代表已签署、发布时间或法律效力。相同类别/版本/语言仍禁止覆盖；新版本不会继承旧授权，旧版仍保留。

管理员界面支持填写版本、从已上传文件选择版本、查看带版本的授权和审计记录、按单个版本撤销。上传文件自动读取其版本标识并检查选定合作类别。切换类别或版本后清除已勾选的发放确认。收件人只看到自己当前有效、已获批且该语言文件存在的版本入口；语言切换、登录返回、下载链接保留明确版本。未提供版本参数的历史链接仍指向初始草案版本，不自动跳转最新版。下载文件名包含版本，防止不同草案互相覆盖。

合同正文直接显示审定原文，不经过界面词典翻译；按钮/状态仍按页面语言。缺少审定语言时不回退到其他语言。合作资格撤回/退回/拒绝继续撤销该类别全部版本；版本授权仍依赖资格批准。列表当前最多100条，超出后需凭明确版本编号操作；批量撤回、完整分页和签约尚未实现。

实际验证：271 项测试通过、0失败、0跳过；本轮新增6项多版本后端测试和1项版本导航渲染测试。日志 `docs/evidence/partner-contract-version-tests.log`。覆盖新版本无继承、禁止覆盖、按版本撤销、全类别撤回、账号/语言/过期过滤、下载内容与文件名、历史默认链接及登录/切换语言保留版本。类型检查通过，生产构建与发布回执随后记录。真实管理员/收件人多版本浏览器流程未验收。

无新数据库迁移：沿用既有类别/版本/语言复合键及逐账号版本授权表（迁移至0022）。PACIscan桥接、链上协议、证据披露和存储边界不变；本轮合同版本号不属于PACI Protocol版本号。没有上传真实合同、批准真实账号或同步GitHub。管理员配置仍待核对本站登录账户编号，申请收集仍默认关闭。

## 上线回执 · v69

运行源码 `8bf23d44ebcda20563ff2273db491f89ac23c1a3`；版本 `appgprj_6aadb2f67df081918266b82e3fc373fb~appgver_0891f5fc3b648191bbe5e7b8664c75d6`；部署 `appgdep_6aee6300cc4881918e18578fa04d4ea6`，succeeded。264 项测试通过，类型检查与生产构建通过。线上匿名中英文合作伙伴页及英文隐私说明已核查，未呈现合同或申请资料。审核管理员仍未配置，申请收集关闭；真实申请人/审核员双账号验收待完成。此回执提交不改变 v69 运行代码。

## 2026-11-07 · 合作申请与资格审核（本轮）

新增登录后的按类别合作申请：机构/业务名称、业务联系人、业务邮箱、国家地区、服务范围与经验、专业资格说明；律师及专业咨询类别必须填写资格说明。仅必要业务文本，无附件、身份证或员工/客户材料上传。资料按登录账号隔离；提交者不能指定其他账号或自授状态。申请不公开，仅本人及配置的审核管理员可读取。未配置审核员时，页面明确暂未开放，POST 拒绝新申请（503），不收集资料。

管理员分页审核队列（每页25条）支持待审核、待补充、已批准、暂未通过和已撤回；人工确认身份/业务/所需资格后才能批准，禁止自审。退回/拒绝使用固定说明类别，用户看到对应语言提示，可修改重提。每次提交/审核/撤回增加修订号并写入不含申请正文的操作记录；唯一操作编号与账号/类别/修订号防止重放和并发覆盖。撤回不是删除，界面和隐私说明已明确，完整保留/删除制度仍待正式运营准备。

合同发放现在必须已有该账号/类别的有效资格批准，并继续要求独立合同版本授权。资格批准本身不发放合同。申请撤回、退回或拒绝，原子撤销该类别所有合同版本访问；重新申请及重新批准不会恢复旧授权。发放操作在事务提交时再次检查资格修订号，下载每次检查资格状态，覆盖撤回与发放并发的边界。历史已下载副本不能收回。不自动发邮件、不自动核实执业资格、不产生签署或佣金承诺。

数据库迁移 `0022_worthless_firestar.sql` 新增申请和修订事件表及索引；迁移不含用户资料。生产无审核管理员配置，未创建实际申请/审批/合同。未把草案或比例放回源码、公开页面、迁移或夹具，GitHub 不同步。

本轮实际验证：264 项测试通过，0失败、0跳过；新增10项申请权限/状态/并发/分页测试、1项中英文渲染测试；已有合同测试补入资格前置条件。日志 `docs/evidence/partner-application-tests.log`。TypeScript 与 diff 检查通过。管理员/申请人双账号线上端到端浏览器验收尚未完成；不能以本地测试代替真实验收。

PACI 兼容矩阵：本轮仅DOSSIVO合作伙伴业务流程；PACIscan桥接、协议/链上承诺、证据分级披露、存储边界均无变动。本站申请与审核日志不是链上证明。旧数据库中的合同授权若没有对应已批准申请将拒绝读取，不能自动把历史账号迁移为合格。当前生产未发放实际合同，不受数据回填影响。

下一步：核对本站实际管理员账号并配置后，用两名非同账号操作者完成申请→退回→重提→批准→独立发放→撤回实测；完成正式运营隐私与保留安排后再接收真实申请。多合同版本管理、电子签约和通知仍未实现。发布回执随后记录。

## 上线回执 · v68

运行源码 `d01c14f8173bce4db98a35e472054eac84fb74e5`；版本 `appgprj_6aadb2f67df081918266b82e3fc373fb~appgver_7276468ff9c481919b77f09a31039517`；部署 `appgdep_6aee5fcc52008191a23f0fd965dda128`，succeeded。253 项测试通过，类型检查与生产构建通过。线上匿名访问中英文管理页，均显示对应语言的管理员门禁，未呈现文件或授权记录。管理员仍未配置；真实获批交付的浏览器流程待验收。此文档回执不改变 v68 运行代码。

## 2026-11-07 · 合同审核与发放后台（本轮）

已实现 `/partners/admin?lang=zh|en` 管理界面与 `/api/partner-contracts/admin` 后台。以运行时 `PARTNER_CONTRACT_ADMIN_IDS` JSON 字符串数组配置本站真实登录账户编号；未配置、无效配置、匿名或普通用户均拒绝。本站编号不同于邮箱及其他站点编号，不能从项目所有者身份推定。仅已配置管理员在合作伙伴页看到入口；登录用户可看到自己的账户编号供核对。

管理员可上传单份已审定 JSON 草案（256 KB 上限、类别/语言/版本校验、必须确认审阅），按收件账号逐一批准并设有效期、撤销访问。相同类别/版本/语言禁止覆盖。当前仅支持既定草案版本；新增合同版本管理和正式签署仍待开发。授权覆盖所选类别和版本的全部审定语言文件，界面明确说明。账户归属和合作资格由管理员人工核实，系统不声称自动资格认证。

所有写请求校验真实登录身份、管理员名单、同源 Origin 与 JSON 类型。D1 原子批次同时提交操作记录与变更，操作编号唯一，重复请求回滚，旧授权重放不会恢复已撤销权限。操作记录及列表只含元数据，不含合同正文/分成；不发送邮件。正文仍只在运行时数据库，未加入源码、测试夹具或迁移。撤销不收回已下载副本。

本轮实际验证：253 项测试通过，0 失败；新增 6 项权限/数据库回归和 1 项中英文渲染测试。日志 `docs/evidence/partner-admin-tests.log`；TypeScript 和 diff 检查通过。迁移 `0021_keen_steve_rogers.sql` 仅新增审计表。已确认生产环境没有管理员配置；不添加猜测账户、不上传真实合同、不批准真实收件人。真实管理员登录与收件人双账号浏览器流程未验收。

PACI 兼容性：无内核、证明格式、证据授权、链上协议或计费策略变化。合同操作记录是本站数据库记录，不是 PACI 链上证明。GitHub 不同步；禁止将含历史保密草案的 Git 历史推至公开仓库。生产发布回执随后记录。

## 最终上线回执 · v67

- 线上地址：https://dossivo-outcome-workbench.xugv.chatgpt.site
- 运行源码：`28f2ea93ddd44830a98a64f87d7eb0d9b4ac1dc2`。
- 版本：`appgprj_6aadb2f67df081918266b82e3fc373fb~appgver_338063c348088191a83bb242cc1b2a31`。
- 部署：`appgdep_6aee57f3cc348191997cbd6540de8af3`，succeeded。
- 246 项测试通过；类型检查及构建通过。对 19 段完整保密条款扫描当前跟踪源码与构建产物，命中 0。
- 实际生产数据库已确认存在合同审批表及运行时文档表；未批准收件人，未上传生产合同。
- 线上浏览器实测：英文首页→通信→协议→关闭返回；英文合作伙伴标题、简报；中文欧盟入口与合作伙伴页。真实获批账号交付及双账号登录场景未做浏览器验收。
- 合同保密原件已独立保存供负责人审阅，不在可复制的当前发布源码内。此回执后的文档提交不改变 v67 运行代码。

## 最终保密边界补强（v67）

发现站点允许源码复制（remix）。合同正文写在服务端源码里仍不满足保密要求，因此已从当前发布源码、内部状态摘录及测试样本移走真实草案和分成，另存负责人保密审阅包。没有把草案同步公开 GitHub。

- 新增 0020 合同正文运行时表，按类型、版本、语言存放；源码和迁移均不包含正文或条款种子。复制项目不会复制运行时数据库内容。
- 网页及下载必须同时具备有效的逐人审批记录和对应的审定语言文件。缺文件、语言不匹配、无效文档均不交付。读取文档前先验审批。
- 当前未向生产库上传合同正文，也未批准任何合作方，因此所有合同默认不发放。管理员审核、上传、通知和电子签约操作台尚未开通。
- 不得直接把此源仓库及其历史提交推到公开 GitHub；旧提交仍含历史草案。任何未来公开源码交付须使用经审查的干净导出。不得直接回滚 v61–v66，否则可能重新暴露打包草案。
- 旧版本已被他人获取的独立副本无法远程收回；本轮没有证据证明是否已有复制或下载。
- 最终全套实测 246 项通过、0 失败；语言测试 8 项，合同模式/权限/运行时文件测试 7 项。此前 245 项和 v66 均为本轮中间结果。

## 当前优先状态：合同保密与中英界面修复（2026-11-06，发布收尾 v66）

本节覆盖下方历史记录中的旧权限及语言描述。

- 合同默认拒绝。普通登录不授权；后台审批记录必须绑定接收账号、合作类型、指定合同版本、审批人、有效期，未撤销且未过期才可读取。网页和下载接口同时检查。新表默认无授权，没有用户自行批准的接口。
- 管理员审批操作台、资格审核、电子签约、自动通知尚未实现；本轮没有批准任何实际合作方。不能把本次访问控制当作完整签约系统。
- 中英界面统一使用明确语言 URL、共用翻译目录与渲染边界；内部导航、登录返回、联系人分享、证据卡及请求记录下载保持所选语言。用户消息和证据原文不自动翻译，结构化系统消息按当前语言呈现。
- 共用页面实际渲染测试覆盖：首页、通信、欧盟用户入口、协议、隐私、合作伙伴、账号，以及材料、授权、联系人、请求待办等面板。新增语言测试 8 项；新增保密权限测试 2 项。全套实跑 245 项通过、0 失败；类型检查及生产构建通过。
- 意大利语已有翻译继续保留；新增共用文案缺少意大利语译文时显示英文，不声称本轮完成意大利语全译。原始 JSON 导出保持机器字段及用户原文，不篡改历史数据。
- 合同内容、分成及包含这些内容的内部文档禁止同步公开 GitHub。v61 后的合同草案未同步公开 JUGCODE/DOSSIVO；公开仓库仍是 v57。今后公开导出须先排除并审查保密材料，不能沿用过去“完整源码公开”的授权来覆盖新保密要求。
- 尚未做双账号真实登录、实际批准收件人下载及全量浏览器交互验收；自动化验证不等于这些人工场景已验收。

测试原始记录：`docs/evidence/contract-privacy-language-final-tests.log`。

# HANDOFF_DOSSIVO · continuation-0.2 · 2026-11-05

先读 DOSSIVO_STATUS.md、PACI_COMPATIBILITY.md、ACCEPTANCE_REPORT.md、RELEASE_EVIDENCE.json，再读本目录下接口、规则和数据流文件。完整主输入在 continuation-2026-11-05/inputs。当前源工程延续现有Site；不另建公共演示站，不改用户GitHub可见性。

## 本轮实际完成

1. 恢复第19版真实源码（基线c5831b667a1da88a4024063d26e4639f23b4f5e1），核查全部附件校验；公开GitHub只有入口README。
2. 私密任务D1持久化、合成材料/目录、字段原值/单位/引用、逐字段确认和追加更正、8指标准备性计算、未解决事项与历史、固定私密准备卡、CAS/幂等/原子Outbox。
3. 既有登记适配器默认对齐paci-http/0.4，显式保留旧0.3；新任务登记/恢复通过真正本地HTTP调用现有core，核心未修改/复制。
4. `/protocol`文字应用规范草案，标题旁并列PACI Protocol与PACI-DOSSIVO-FL链上入口状态；无权威部署时不填假地址，正式发布关闭。
5. 三语旧价格显著标记未采纳原型示例；新增任务当前中文/英文，意大利语原站保留但新模块英文fallback，尚非意语能力验收。

## 给Protocol窗口

- 提供唯一权威通用文本（版本/摘要）、合约源码/commit、ABI、编译参数、网络/chain_id、合约/实现地址、部署交易、源码验证与升级权限、最终性/重组策略。
- 冻结PACI-DOSSIVO-FL和PACI-FLR的对应关系；文本条款—代码—测试—部署映射，签核/批次/挑战/版本状态的验证器。
- 提供可独立信任的签署密钥/企业身份/CA桥接路径，不能让导出包替换自己的信任锚。
- 当前DOSSIVO应用文字不能冒充权威通用Protocol已定稿；收到材料后固定精确引用并做语义及执行验证，才显示真正链上链接与正式卡。

## 给PACIscan窗口

- 先确认承接core0.4.2-alpha.1 `/v1`还是Standalone1.2 `/api`；这是不同分支，不能混接或按版本数字降级。
- 提供实际可访问的服务origin、服务身份/tenant认证绑定、受控配置方式；不要把密钥放在交接正文。
- 增加可核验tenant/actor绑定回执或身份端点；当前0.4回执本身无法发现初始token配置到错误租户的问题。
- 逐项开放六组接口、上游权限/固定版本检查、导出独立验证与真实Protocol路径。0.4没有Standalone ACK，不伪造ACK调用。
- 运行 `node --experimental-strip-types --disable-warning=ExperimentalWarning scripts/paci-http-04-integration.mjs /path/to/existing/core`；当前脚本固定core0.4.2-alpha.1，版本变化需先审查再更新，禁止为绿灯替换新核心。

## 下一轮DOSSIVO顺序

- 完成真实登录后的生产浏览器任务闭环、两个账号隔离、恢复；未完成项仍按验收矩阵标记。
- D1补授权环境内的真实导入/OCR/AI字段草稿、未知/否定/附件等真实评估、完整OutcomeSpec和角色、多语言。
- D2补六组能力、队列自动退避、收件确认分支、固定版本更正/挑战/导出。
- D3收到Protocol实际交付后集成签核/链凭证/独立核验，不能另写不兼容内核凑完成。
- D4 Link2、多买家；D5支付/JUG；D6校准。现阶段不得接受真实敏感劳工材料或称56场景全通过。

本轮证据、具体保存提交/部署版本以 RELEASE_EVIDENCE.json 为准。共享源码文件有后续修改时先对照远端HEAD，使用普通push并保留并发冲突；不得强推覆盖另窗口。

## 本轮运行版本

Site第20版已部署；runtime commit `ded2beb207be95ad980fa5734f76c4ebea548044`。后续documentation commit保存本轮上线/未验收状态，未改变runtime。公开页已浏览器核对；登录认证需要用户选择方法/凭据，登录后操作与多账号验收尚未完成。

## 最新界面续接 · 首屏简化

本轮按用户截图修改首页：三张主要入口卡（快速自检/准备证据/回应买方），其余内容默认折叠；侧栏默认收起。revealElement/revealSection负责打开目标所有details祖先，保持菜单、搜索、FAQ及hash导航可用。不要在后续业务开发中再次把所有技术面板和长表单无条件铺到首页。后端与协议状态沿用前述边界；首页调整不代表原未验收功能通过。

侧栏顶部现有“为何选择多希沃”文字入口（含收窄态）；通过dossivo:open-benefits事件打开主区域独立面板，支持#why-dossivo直达，保留原优势文案及规划标签。

眉标文案调整：中文采用用户最新确认的“让 DOSSIVO 的 AI 工具协助你，把材料变成有据可查的回应”，英文和意大利文同步明确 DOSSIVO 的 AI 工具。仅文案，无接口或协议能力变化；构建校验随本次发布执行。

## 最新：材料覆盖与基本参数访问码

先读BASIC_BUYER_ACCESS_0_1.md，追加迁移0006_left_toro。欧盟入口/eu-buyer使用正常注册登录；一次兑换绑定账号，48/72小时从生成起算；所有读/下载重验，已下载历史卡不会过期自毁。覆盖条不作为可信评分；真实文件/PDF/AI、独立同行基准及正式链上卡仍阻断。下一轮优先完成登录后出口企业/两买方真实浏览器验收，再逐项放行真实材料区域/模型路径。不要把基本码授权误当Link2原件权限，不把用户入口当国籍或公司代表资格验证。


## 最新界面修复：Protocol 返回与关闭

app/protocol/navigation.tsx 为独立客户端导航；页面外层及顶部吸附样式在 app/globals.css。返回/×使用同源 document.referrer 推导入口，有同源历史时 history.back()，否则使用真实链接回入口；无可信来源则 /zh/。不要改用 window.close()：当前所有 Protocol 入口都在同一标签页。本地首页/欧盟入口往返与滚动可见、TypeScript、Worker构建通过；协议正文与PACI兼容状态未改。当前源码及部署版本以Site最新保存/部署记录和远端HEAD为准。


## 最新续接：共享状态与复用测量

先读SHARED_STATE_SUPPLEMENT_2026_11_05.md：对照三份附件、官方来源与宪章，纠正“竞品都是孤岛”、手填0即实测、开源即去中心控制等推断。新增EvidenceReusePanel位于私密任务→基本参数授权码→证据复用记录，默认折叠，打开/刷新才向GET basic-access?task=...&usage=1读取ownerUsage。服务端全量SQL聚合，权限沿用read(owner,task)，只向所有者返回数字/卡ID，不泄露其他买方身份，不因统计读写新事件。合成计数不能充当真实商业数据，verified_buyer_companies/purchase_acceptances/real_commercial_usage保持null。

新基本投影可选source_card_id与HTML/买方在线页显示同一固定卡身份；不暴露私有全文，不更改历史投影，不自动给新内容授权。108项测试/TS/Worker构建通过；登录后统计UI与双账号线上验收尚未完成。下一步优先完成该验收，然后按原阶段补企业/工厂稳定ID、来源去重与跨任务引用、变更影响关系；买方明确反馈为新增建议未实现。真实原件、同行基准、CA签核与正式链上历史仍按各自原门槛，不能为网络叙事跳过。


## 最新优先交付：两组界定第1批（2026-11-05）

先读 CONTINUOUS_ACCESS_BATCH_1.md。用户已授权分批实现披露授权与合规对话；本批完成持续固定摘要授权基础，其他功能按该文档清单接续。追加迁移0007_aberrant_freak，旧授权保持TEMPORARY，不自动延长。新CONTINUOUS_SUMMARY：兑换窗口48/72小时，成功绑定后持续至撤销；禁止精确数值，版本仅FIXED，用途COMPLIANCE_REVIEW。新API expires_at=null表示无固定访问到期日，redemption_expires_at单独表示兑换截止。任务变化提示复核，不自动披露未发布新材料。

本轮重新运行114项测试全通过（新增6项），TypeScript通过，日志evidence/continuous-access-tests.log。持续授权不等于完整三级披露：公开概览、专项原件、后续摘要发布订阅、企业成员和合规对话均尚待实现；真实数据和正式PACI链路径仍阻断。生产多账号浏览器验收尚未完成。以上最新说明优先于本文件之前旧版48/72小时整体到期描述。

本批Worker构建通过；托管预览健康检查超时，status显示stopped，未做浏览器交互验收。部署结果以Sites保存版本/部署返回为准。


## 最新优先交付：两组界定第2批（2026-11-05）

先读PUBLISHED_SUMMARY_BATCH_2.md。新增FOLLOW_PUBLISHED，必须在创建持续授权时明确选择，旧授权默认FIXED。所有者预览后按单一已绑定授权发布同任务/主体/场所/期间的新摘要；冻结历史和事项轨迹保留，原类别/用途不扩大，精确数值仍禁止。GET sequence支持获准历史查看与下载；每次含历史请求均重验，撤销不删除既有交付事实。

迁移0008_omniscient_the_call及新表dossivo_summary_publications；访问事件card_id用于统计真正被读取的版本。预览hash/expected_sequence、D1事务、CAS和幂等约束已覆盖。122项测试全通过，TypeScript复检通过；日志evidence/published-summary-tests.log。浏览器交互与生产双账号仍未验收。PACI路径/正式链上卡/真实材料门槛不变；哈希链不冒称链上执行。合规对话与组织成员尚未实现，是下一批优先工作。

第2批Worker完整构建通过；生产发布状态以本批Sites保存版本及部署结果为准。

## 第3批进行中：会话权限边界与联系人推荐

新增collaboration-permissions.js纯策略模块及测试，尚未接入数据库/API/UI，不能称聊天功能已上线。必须由服务端读取可信成员列表，禁止直接采用请求JSON作为成员事实；只允许指定会话的ACTIVE成员，企业管理员身份本身不授予所有会话权限；其他买方和退出成员拒绝，READER不可发送，关闭会话仅可按成员权限读取。证据读取仍必须独立走BuyerAccessStore，不由会话角色授予。

用户新增已定方向：推荐/分享联系人，接收方可看到谁推荐。后续实现推荐人、被推荐联系人、指定接收方、时间及处理状态；推荐不自动建立会话、不自动授予证据权限、不公开关系图。首期展示推荐来源和经允许的名称，不默认分享私人邮箱/电话；拒绝、屏蔽、防滥用与联系人共享同意需接入实际流程。当前仅有白名单投影策略，不存在发送推荐接口或外发行为。


## 第3批实际接通：双边文字请求与回复（2026-11-05）

迁移0009_sturdy_black_panther增加conversations/messages。ConversationStore仅从可信的已兑换grant读取owner/buyer双方，不接受客户端成员列表；每条会话绑定一个grant，不自动合并其他买方或企业。POST /api/conversations使用正常登录与readDemoCommand防护，显式synthetic_only，2000字符上限，幂等键、原子写入、关联回复仅限同会话。GET返回消息侧别，不输出原始账号ID、其他关系或证据正文。

入口位于所有者已兑换授权条目和买方已打开卡片内。请求、普通消息、回复、确认收到分别显示；均不改变flag、不授予证据权限。材料撤权不删除聊天历史；材料读取仍由BuyerAccessStore鉴权。当前买方在授权撤销后尚无独立会话列表入口，后续必须补齐，不能声称完整消息中心已交付。

本批只有原授权双方账号，尚非企业多成员体系。之前collaboration-permissions策略尚未作为可配置成员管理接入；目前无成员增删UI/API，无卡片引用、未读通知、发送邮件、自动翻译、联系人推荐或真实资料放行。推荐人可见的联系人分享仍在交接待办，不忘记也不伪称已实现。普通文字也只限合成测试，未建立正式保留/删除政策前不开放真实业务聊天。

本轮127项测试通过（新增2项服务层集成测试，涵盖隔离、幂等、关联回复、真实数据阻断、撤权后证据仍拒绝、失败回滚、关闭状态拒绝发送）；TypeScript通过。测试日志evidence/conversation-tests.log。此前托管预览超时，本批浏览器与生产双账号验收仍未完成。原协议/正式链上卡及真实材料门槛保持不变。


## 最新续接：第4批独立会话、未读与卡片引用（2026-11-05）

先读CONVERSATION_INBOX_BATCH_4.md。/conversations提供正常登录后的独立列表，授权到期/撤销后仍能找回已开始的会话。站内未读按sequence和本人read cursor持久计算，显式标至已加载消息，新消息不被并发标读吞掉。线程最新100条并可加载更早内容；迁移0010_right_puck对已有消息回填顺序。

同授权已发布固定卡可作为消息引用，发送只保存版本身份，不复制正文，不计买方已查看；打开/下载重验授权，所有者也只看获准投影。引用发送与序号分配在同一事务，撤权竞争回滚。旧引用不跟新版本变化。API与细节见第4批文档。137项测试/TypeScript通过，日志evidence/conversation-inbox-tests.log；生产双账号浏览器仍未验收。主体/成员、请求完成状态、联系人推荐、外部通知与真实数据仍按各自待办，不把已实现的双账号对话称完整企业通讯系统。

第4批Worker完整构建通过；部署记录以Sites保存版本和部署返回为准。

第4批实际发布：Site第30版，runtime commit 514c69ef57025799da5fb83cefd5271479da559a；部署appgdep_6aec8d67af24819199f666dad35a829b成功。生产浏览器已从侧栏点击/conversations并确认匿名登录保护；未开始认证，登录后双账号收发/未读/撤权UI仍待验收。RELEASE_EVIDENCE.json的latest_release为当前结果，其他顶层旧记录仅为历史。


## 界面修订：直接通信与添加联系人方向（2026-11-05）

用户反馈截图：买卖双方共用的/conversations不应显示居中的“欧盟用户入口”。已移除该导航，将主标题/页面标题/内嵌入口/侧栏统一为“直接通信”（EN Direct messaging / IT Messaggi diretti）；欧盟入口自身保留，并将指向共享页的链接改名。

添加联系人方向：由邮件、微信等外部渠道交换DOSSIVO ID → 输入ID发送联系申请 → 对方接受后通信；外部渠道用于传递ID，私人邮箱/手机号不默认作为公开可搜索ID。接收联系不授予材料权限。联系请求、拒绝/屏蔽、推荐人可见的联系人推荐仍待接入；当前没有ID搜索或添加联系人API，本次未制作误导性的可用搜索框。页面折叠帮助和空状态明确现有能力与后续方向，当前仍从既有已兑换材料授权关系发起通信。

本次仅文案/导航与折叠帮助，无数据库/API/授权规则变化。本次TypeScript noEmit和Worker完整构建通过，git diff --check通过；文案修改未新增或重跑服务层测试，不把第4批137项测试当作本轮新运行结果。Protocol/PACI兼容、真实数据门槛保持原状态。

本次已发布Site第31版，runtime commit cdd4d44f3ef80baf0aa0dcbaacdaaa82c0ef4034，部署appgdep_6aec99e54f1c819190eb15a7ab850493成功。生产浏览器核对“直接通信”标题、移除共享页欧盟入口、展开添加联系人说明均通过；ID/申请接口仍未实现。


## 最新优先状态：第5批联系链接及后台（2026-11-05）

先读CONTACT_LINKS_BACKEND_BATCH_5.md。本批已接通ContactStore+D1+API+页面：随机稳定DS-ID、主动开放显示名称、精确查询、复制联系链接/本地二维码、/connect/ID登录安全回跳、申请/接受/拒绝、独立联系人通信与双方屏蔽。服务端推荐token可显示真实推荐人，不采信自报名字；生成/使用推荐均重验屏蔽和公开设置。

迁移0011_famous_ego保留老会话并追加contact_id，与grant_id恰好一项非空。接受联系人不会写basic_grants，dm_会话不能取得证据；通信屏蔽原子阻断同一双方的联系人/旧授权会话发信，但材料授权单独管理。仅限原登录双方，不等于组织代表资格或多成员企业权限。

本批154项测试全部通过（新contact测试16项及跨旧会话屏蔽1项），TypeScript通过；日志evidence/contact-links-tests.log。生产双账号、扫码、实际登录回跳仍待浏览器验收。侧栏直接通信图标已改UsersRound，欧盟入口保持单人图标。以上替代之前“ID/申请/推荐尚未接入”状态；其他真实数据/PACI门槛不变。

第5批Worker完整构建通过，二维码本地生成PNG检查通过。生产发布结果以Sites保存版本与部署记录为准。

第5批实际发布：Site第32版，runtime commit 21c31efe33fd806892b110386976dfeac0f85932，部署appgdep_6aeca20eaae48191a05623ced79a3c22成功。线上浏览器已验证直接通信登录保护、未知ID落地页、侧栏lucide-users-round双人图标。当前浏览器未登录，双账号申请/接受/屏蔽/收发、实际登录回跳和扫码未实测；服务层154项测试不能代替这些浏览器验收。RELEASE_EVIDENCE.json latest_release为最新记录，后续文档回执提交不改变运行代码。


## 最新优先状态：国际通信测试版与中国大陆暂缓（2026-11-05）

先读COMMUNICATION_REGIONAL_AVAILABILITY_0_1.md。按用户最新决定，暂缓腾讯/阿里付费SDK及中国大陆通信开放；不是审批申请已经提交。侧栏保留UsersRound直接通信及悬停/键盘提示“中国大陆用户暂未开通，待完成相关手续。国际测试版已开放。”

新增0012和CommunicationPolicyStore：正常登录后本人声明通信服务地区，UNKNOWN默认关闭，CN_MAINLAND暂不开放，双方当前INTERNATIONAL才可申请/接受/推荐/发信。资料公开解析、第三方推荐和旧grant会话也受约束；事务重验防止并发声明变更后落入新消息。地区仅本人声明、未核验，不按中文/国籍推断，不能声称地理封锁或企业身份认证。旧账号不自动迁移为国际。

历史消息、已读/拒绝/屏蔽仍按原身份可处理；证据授权独立。当前仍只支持合成测试资料。本轮完整169项测试通过，新增地区测试15项，日志evidence/communication-regional-tests.log；不沿用上轮154项作为本轮结果。原PACI/真实数据门槛不变。

本轮TypeScript noEmit、git diff --check及Worker完整构建通过。发布结果另记实际保存版本与部署回执。

本轮实际发布：Site第33版，runtime commit 0f2b4bc4104abd37e45fcea966dccecdd05362af，部署appgdep_6aecae08ed64819183780dbbbc2428fa成功。生产匿名页显示国际测试版及大陆暂未开通说明；侧栏键盘聚焦Tooltip已观察到visible/opacity=1及完整准确文案。未登录，双账号地区设置/收发/扫码/实际回跳仍未验收，不能由169项服务测试代替。后续文档回执提交不更改运行代码。

Claude最新附件已复核，见COMMUNICATION_REGIONAL_AVAILABILITY_0_1.md末节。下一批建议优先独立固定字段证据请求/一键回复/授权卡引用，不把现有自由body的REQUEST当结构化完成；邮件、音图仍未接通。原v33开放边界不因建议自动放宽，企业注册国建议未替换为已核验地理身份。


## 最新覆盖：开发期间默认不拦截地区（2026-11-05）

按用户最新指令，COMMUNICATION_REGION_ENFORCEMENT=false；当前开发测试不拦截CN_MAINLAND或UNKNOWN，无需先选择地区，中文可正常使用。后台与事务SQL同步关闭地区条件，保留未来正式启用的地区规则。Sidebar及入口提示同步；不因production构建/本次增量部署自动开启限制。不将账号悄悄改成国际地区。

先读COMMUNICATION_DEVELOPMENT_OPEN_0_1.md。此状态覆盖第33版地区默认关闭的运行描述；历史材料/授权/身份/屏蔽/合成测试门槛保留，PACI未改。本轮测试与发布结果另记实际回执。

本轮实际完整回归175 PASS / 0 FAIL / 0 SKIP / 0 TODO；地区策略测试21项（原15项显式严格模式、新增6项默认开发开放），日志evidence/communication-dev-open-tests.log。覆盖大陆/未知账号中文联系与收发、旧大陆声明解禁、默认不回填国际地区、旧grant会话、严格开关保留、同意/屏蔽/隐私/合成资料及材料权限独立。TypeScript noEmit、git diff --check、Worker完整构建均通过。生产浏览器验收与部署结果另记回执，不由服务测试代替。

本轮已实际发布Site第34版：runtime commit ad9c44e11a9f0e558789f0de934bc3f2d150ffe3，部署appgdep_6aecb0b500508191adf3362a2c7951a5成功。线上匿名/conversations显示“开发期间暂不按地区限制，中文可正常使用”及无需先选地区；侧栏键盘聚焦Tooltip可见且为开发开放文案。当前浏览器未登录，双账号收发/扫码未实测；175项服务测试不代替该验收。文档回执提交不改变运行代码。


## 最新界面调整：侧栏订阅与价格（2026-11-05）

按用户要求删除Sidebar重复的欧盟用户入口，顶部入口保留。在“为何选择多希沃”下方新增突出显示的“订阅与价格”（EN Plans & pricing / IT Abbonamenti e prezzi），窄侧栏保留图标和短标签。

入口复用现有价格区，新增subscription-pricing锚点。点击沿用revealSection展开价格本身和home-information父级，再滚动定位；关闭移动侧栏。保留现有语言、月付/年付和套餐选择状态，不新建第二份价格内容。

仅app/workbench.tsx、app/compliance-home.tsx、app/globals.css的导航与定位样式变化。金额、配额、原型价格提示、购买状态、API/数据库、地区开发开放模式与PACI均未改变。

本轮TypeScript noEmit、git diff --check及Worker完整构建通过。纯导航变化未新增或重跑服务层测试，不把上轮175项当本轮结果。生产点击定位及发布结果另记实际回执。

本次已发布Site第35版：runtime commit 81d34f5fd56183bc8997e41c3723374c0f84ded9，部署appgdep_6aecb291d42481919767e8f573ca4d9d成功。生产浏览器已确认顶部欧盟入口1个、Sidebar为0个；窄侧栏显示“订阅/价格”，点击后subscription-pricing及其home-information父级均open，平滑滚动结束后顶部96px且处于视口内，月付/年付与套餐内容可见。未改价格政策或服务端，本轮未重跑服务层测试。文档回执提交不改变运行代码。


## 最新界面调整：顶部导航精简与侧栏底部外观（2026-11-05）

用户继续要求：合并登录与注册、外观选择移到Sidebar下部、Protocol并入Sidebar。顶部现为单一“登录 / 注册”（EN Sign in / Sign up / IT Accedi / Registrati），沿用同一Sites认证地址；移除顶部主题按钮及Protocol链接。

Sidebar在直接通信下新增ScrollText图标Protocol入口。外观切换置于底部固定区域，显示当前浅色/深色，沿用原toggleTheme和dossivo-theme偏好；窄侧栏也可操作。主要入口保持可见，中间任务导航和进度允许滚动，避免底部控制被长列表挤出；通信Tooltip留在非滚动区域。之前新增订阅与价格、删除侧栏欧盟重复入口的调整保留。

本次仅导航/布局与状态传递，无认证后端、协议正文、收费政策、数据库或地区规则变化。真实资料/PACI及开发地区开放边界保持原状态。

本轮TypeScript noEmit、git diff --check、Worker完整构建通过；独立只读复核未发现侧栏闭合、Tooltip裁切或原认证/主题持久化回归。纯界面调整未新增或重跑服务层测试，175项为历史记录。本轮浏览器及部署结果另记回执。

本轮已发布Site第36版：runtime commit d70885743d07e57ebd76651774168843e3b92658，部署appgdep_6aecb44637d08191878d34ff71a86fd9成功。线上中文桌面验收：顶部仅一个“登录 / 注册”，无主题按钮/Protocol导航；侧栏Protocol实际打开且可用×返回；窄/宽侧栏外观按钮底部均距视口16px；切换深色刷新并完成hydration后仍保留深色，已恢复原浅色。小屏触摸与实际认证未新增实测；原认证地址未变。纯UI轮次没有把历史175项测试算作本轮结果。文档回执提交不改变运行代码。


## 登录后默认展开对话窗口（2026-11-05）

本轮实现：已登录 /conversations 进入后自动选择服务端按时间排序的最近会话，展开并主动加载消息；刷新保留手动选择。通信区在联系人管理前；无会话显示窗口空态和展开的联系人入口。联系人“打开通信”复用主窗口，避免重复线程。未登录仍正常登录回跳；不自动发送、不自动标记已读、不改变材料授权或开发期间地区开放规则。

验证：本轮 TypeScript、git diff --check、Worker 构建成功；重新运行全部现有测试 175 PASS / 0 FAIL，日志 docs/evidence/conversation-auto-open-tests.log。当前未做真实已登录双账号浏览器验收，自动展开交互尚需该验收；测试通过不等于浏览器交互实测。

后续：固定字段证据请求、一键回应及授权卡闭环仍待实现。现有自由 body REQUEST 不计作结构化功能，邮件通知仍未接通。PACI 内核/接口、D1 schema、价格及授权协议无变化；原宪章未改。

发布回执：Site v37，runtime commit 013fc2c3d68eb1e4162b6de25454adfa60a00a14，部署 appgdep_6aece55f4c9081919b9096a8767883ed 已成功。


## 固定字段证据请求：首批全栈实现（2026-11-05）

已实现：对话内选择用电凭证/社保缴纳凭证/人员汇总/审核报告/证据卡片摘要及月份，后端白名单验证并生成固定文字；结构字段独立持久化。对方一键回应 PREPARING / UNAVAILABLE / CARD_SHARED，并关联原请求；不能回应自己的请求或普通消息冒充结构化请求。重复发送幂等，改变内容复用键返回冲突。

卡片回应要求已有有效授权、明确选择固定版本，发送事务再次核对撤销/到期/屏蔽。仅联系人会话不能附卡；需在材料工作台单独授权并进入对应授权会话。读取/下载沿用权限复核、固定版本及访问事件。请求/回应不等于验证通过、材料真实性确认或整改关闭，不自动创建授权、标读或邮件。

兼容：新增可空 structured_json 列，0013_conscious_trish_tilby.sql 由 drizzle-kit 生成；旧消息为 null，普通文字功能保留。PACI 内核/协议接口/证据等级/价格无改动，开发期间地区默认开放，仍仅合成测试。

本轮验证：182 PASS / 0 FAIL（新增 7 项），TypeScript、git diff --check、Worker 构建通过。日志 docs/evidence/structured-evidence-tests.log。尚未完成真实登录双账号浏览器端验收；不把服务层测试当作该验收。

后续边界：本批是现有授权会话内的请求/回应/固定卡引用闭环。跨联系人直接选择并新建材料授权、请求状态汇总、邮件通知、真实资料开放均未实现；不得宣称已经完成。原宪章未修订。

发布回执：Site v38，runtime commit 08d0c361686ea732ffdbf27fa574d798720915fd，部署 appgdep_6aece7fb289c8191859fe29e2ab10670 成功。线上匿名浏览器已验证 /conversations 正常显示登录保护与开发开放提示；双账号登录交互未验收。


## 证据请求跟进列表（2026-11-05）

已实现：会话内可展开独立请求列表，显示项目、月份、发起方向、时间及最新结构化回应（待回应/正在准备/暂无法提供/已回应授权卡片）。从全会话按 sequence 查询，每页50条，与聊天最近100条分页独立；回复相同时间按 sequence 排序。对方请求可直接回应准备中/暂无法提供；卡片沿现有授权和固定版本读取。手动刷新状态，不自动标读或发邮件。

权限与兼容：参与者限定，不返回账号标识或证据正文；撤权保留历史状态但禁止读取卡片。CARD_SHARED 仅表示历史发送事件，不表示授权当前有效/已查看/验证通过/整改完成。普通文字回复不改变结构化状态。无需数据库迁移，兼容现有消息与PACI接口。

验证：本轮185项测试通过（新增3项：状态与顺序、隔离及撤权、跨消息分页）；日志 docs/evidence/request-tracker-tests.log。TypeScript/Worker构建结果见发布回执；双账号登录浏览器验收仍未完成。状态列表按需展开；跨联系人新建授权和邮件通知仍未实现。

发布回执：Site v39，runtime c9651bf43b8ee118cc7bc44ec96cc31d7e7df278，部署 appgdep_6aecea5fc9088191914ea520733205f3 成功。TypeScript、git diff --check及Worker构建通过；本轮无已登录浏览器交互验证。


## 联系人对话关联已有材料授权（2026-11-05）

新增只读接口 related_grants 与对话内“双方已有的材料授权”入口：按双方账号精确匹配已兑换授权，每页50条，只返回原授权摘要的企业/设施/月份及当前授权状态。排除未兑换授权和其他买家，验证摘要hash；不返回原始资料、账号ID或兑换码。

可以进入对应授权会话并返回原联系人对话。没有已兑换授权时引导到现有材料工作台及授权码兑换页。此操作不生成/扩大授权，不创建消息、不标已读、不产生卡片访问事件。撤权后历史入口保留，卡片读取继续重新鉴权。此批不是“聊天内一键新建授权”，尚未实现该能力及跨会话关联原请求。

兼容：无数据库迁移，PACI协议、授权类型和开发地区开放规则不变。验证：188 PASS / 0 FAIL，本轮新增3项；日志 docs/evidence/related-grants-tests.log。分页测试使用推进测试时钟避开真实的兑换限流，没有放宽产品限流。双账号登录浏览器交互尚未验收。

发布回执：Site v40，runtime d8d9b700875d6cdb083f9a627f052e080138b899，部署 appgdep_6aeceb9535988191acd13e7b917d5022 成功。TypeScript、git diff --check及Worker构建通过。


## 工作台请求待办及 HR 智能体入口（2026-11-05）

已实现：收到的结构化证据请求自动投影至材料工作台待办，分页50条。授权会话自动关联供应方原任务；联系人请求由接收人显式关联自己的同月份任务，持久保存关联时间，重复绑定同一任务幂等，改绑拒绝。可打开任务或原请求会话回应；最新结构化回应同步显示，不自动认定完成/核验通过。内部关联不对请求人暴露任务、不授予证据权限，不创建重复任务。

新增schema-only迁移0014_gigantic_thor_girl.sql（drizzle-kit生成）。四项新增测试覆盖自动关联、私密绑定和权限、月份/改绑、分页；本轮192 PASS / 0 FAIL，见docs/evidence/workbench-requests-tests.log。双账号登录浏览器验收仍未完成。

HR智能体：已增加材料工作台内可展开“筹备中”提示和禁用待接入按钮，正确名称 PACI scan。设计预留见 HR_AGENT_INTERFACE_PLAN.md；没有实现AI自动上传、真实Agent API或PACI scan记账，不将预留当作可用功能，不修改原宪章。

仍待：联系人请求与新授权卡片的跨会话自动关联、买家供应商总看板、尽调报告导出、真实资料/AI运行及邮件通知。

发布回执：Site v41，runtime 880f960a41b7148a223a1b82d7cb088a2783233a，部署 appgdep_6aecf1bede2081918114b04186077e80 成功。TypeScript、git diff --check及Worker构建通过。


## 工作台请求状态筛选（2026-11-05）
已实现后台全量请求按最新结构化回应筛选，分页前过滤；切换条件重置分页。状态：全部/待回应/准备中/暂无法提供/已回应卡片。无数据库迁移或授权变更。193项测试通过，新增1项；TypeScript、构建和diff检查通过。登录浏览器验收未完成。日志 evidence/workbench-filter-tests.log。


## 工作台请求全量统计（2026-11-06）
后台按最新回应汇总全部收到的请求，独立于筛选与分页，仅限当前账号。UI展示全部/待回应/准备中/暂无法提供/已回应卡片数量，刷新更新，不宣称实时推送或合规通过。无迁移、无权限变更。194项测试通过（新增1项），TypeScript、构建及diff检查通过。登录交互未实测。日志 evidence/workbench-count-tests.log。


## 2026-11-06 · 证据类型组合筛选
工作台请求 GET 新增 topic（默认 ALL），与 status、before 组合；固定 topic 白名单来自 structured-evidence-request.js。统计不随筛选变化。GitHub 按用户要求暂不同步。后续继续请求与证据任务协作闭环；AI Agent 与 PACI scan 实际执行/记账仍未接入。

发布回执：v44 已部署成功；运行提交 `b81824ce10356a3af001f0cb5e34898735880994`；部署 `appgdep_6aed25aba2d08191bd09dfefe729bb58`。Worker 构建及 diff 检查通过。GitHub 未同步。


## 2026-11-06 · 材料月份筛选
请求队列新增 period（默认 ALL），月份格式限 2000–2099 年有效月份；与类型和状态组合，在数据库分页前筛选。界面可清除月份，切换回到第一页；统计仍为全部请求。无迁移、授权或 PACI 内核变化。196 项实际测试通过，TypeScript 和 diff 检查通过；日志 docs/evidence/workbench-month-tests.log。双账号浏览器验收未完成；GitHub 暂不同步。


## 2026-11-06 · 请求关联同月份任务
私密任务列表新增完整性校验后的 period；请求关联下拉只显示已加载的同月份任务，确认按钮同步校验选择。后台原归属、月份和不可改绑约束保留。最近 50 个任务限制已明示；无迁移、材料授权或 PACI 内核变更。实际 197 项测试全部通过，类型检查及 diff 检查通过；日志 docs/evidence/task-match-tests.log。双账号浏览器验收未完成，GitHub 暂不同步。


## 2026-11-06 · 同月份任务分页查找
关联任务新增按需后台查找、刷新与加载更多；按月份先筛选再分页，不再受全局最近 50 个任务限制。每页 50 个，按 ID 游标；仅当前用户且校验任务摘要。无迁移或授权/PACI 内核变化。198 项测试通过，TypeScript 通过；日志 matching-task-pagination-tests.log。双账号浏览器未验收；GitHub 暂不同步。


## 2026-11-06 · 请求到任务准备及原会话返回
请求待办新增准备新任务入口，带入主题与月份，用户确认企业/场所后沿原后台保存；保留请求上下文和返回原会话入口。保存不自动关联或披露，用户返回待办明确关联。未增加迁移或 PACI 内核。198 项现有测试重新运行通过，类型检查和 diff 检查通过；新界面尚未完成双账号验收。GitHub 暂不同步。


## 2026-11-06 · 通信协作边界集中回归
新增三项跨功能服务测试：撤销后请求历史/响应保留而卡片访问与再次发送拒绝；联系人屏蔽不能通过已有授权会话绕过；内部任务关联不新增授权、访问记录或对方任务读取权限。201 项实际测试全部通过。未修改运行代码，线上保持 v48；双账号真实登录浏览器验收仍未完成。GitHub 不同步。


## 2026-11-06 · 待办选择生命周期修复
刷新/筛选/分页立即清除旧任务选择，避免下拉卸载但确认按钮仍启用。重新查找立即清空选择和结果；卸载取消未完成请求，忽略已取消结果。无后台权限或 PACI 修改。201 项现有测试重新通过，类型检查和 diff 检查通过；日志 selection-reset-tests.log。该 UI 修复未完成已登录浏览器验证，安全登录与接管工具不可用的阻塞仍存在。GitHub 暂不同步。


## 2026-11-06 · 通信界面可靠性
会话组件按 grantId 隔离状态，切换会话清除未发送草稿/回复对象，旧异步结果不会写入新会话。发送中禁用文字编辑以防成功响应清除新输入；无已加载会话时禁用发送。快捷请求依据后台 buyer 标识显示。失败保留文字，同 payload 重试沿用幂等标识；切换会话不保留草稿，此边界需用户注意。201 项现有测试重新通过，类型检查/diff 通过，日志 conversation-reliability-tests.log。无后台权限或 PACI 改动，登录 UI 实测仍阻塞；GitHub 暂不同步。


## 2026-11-06 · 通信操作互斥与草稿提示
会话内发送、快捷回应、刷新及已读操作增加同步 ref 锁，避免按钮状态渲染前的重复操作；完成或失败释放锁。操作中禁止改变合成确认和卡片附加选择，草稿离开清除提示加入输入区。后端幂等机制保持。201 项现有测试重新通过，TypeScript/diff 通过；日志 send-lock-tests.log。没有新增浏览器测试结果，双账号及连点实测仍阻塞。GitHub 不同步。


## 2026-11-06 · 完整联系人协作流程回归
新增请求→新建任务→月份查找→明确关联→回应→幂等重试→已读的服务流程测试，验证未向买方披露私密任务。202 项实际测试通过；日志 complete-contact-flow-tests.log。首次失败为测试夹具缺少联系人资料，补齐后通过。运行代码未改，线上 v51。双账号步骤见 COMMUNICATION_BROWSER_ACCEPTANCE.md，全部待验收。GitHub 不同步。


## 2026-11-06 · Enterprise storage preference

Implemented account-scoped, trilingual deployment-interest card in the private material workbench, with persistent save/read/withdraw and optimistic concurrency. Additive migration 0015; no change to existing grants, disclosure, evidence grading or PACI interfaces. Local originals with authorised summary sharing is the planned priority; full private deployment is a separate preference. Neither enables a connector, original upload, local AI or PACI scan recording. Architecture and future activation gates: ENTERPRISE_STORAGE_DESIGN.md.

Validation: 205 PASS / 0 FAIL, including 3 new persistence/isolation/concurrency/input tests; TypeScript and diff checks passed. Exact log: evidence/storage-preferences-tests.log. Browser QA unverified because managed preview could not start (existing vinext server); no authenticated browser acceptance claimed. Build/deployment receipt follows in RELEASE_EVIDENCE.json.

Release receipt: Site v52 deployed successfully; runtime 75e98c3e1e7c32439f949398bf3a974a9c5662b5; deployment appgdep_6aedfb5a75c8819186aefb9cdf39ff3f. Worker build passed. Latest details: RELEASE_EVIDENCE.json. GitHub remains at prior v51 synchronization unless separately updated.


## 2026-11-06 · Storage preference retry recovery

Exact immediately preceding transitions can be retried after a lost response without creating another preference version. Old retries cannot overwrite withdrawal or later changes, including a later matching preference. This is transition-based recovery, not an indefinite idempotency-key ledger. UI retains selection on network/server uncertainty; version conflicts require explicit reload. Added language-correct sign-in return link and last-saved timestamp. Timestamp describes preference saving, never evidence freshness.

Validation: 207 PASS / 0 FAIL, two new retry/withdrawal regressions; TypeScript and diff checks passed. Log: evidence/storage-preference-retry-tests.log. No migration or PACI/permission change. Browser authenticated acceptance remains pending; previous managed-preview blocker remains unresolved. Publication receipt: RELEASE_EVIDENCE.json.

Published Site v53 successfully: runtime 2b30b9464a3001d449e65b97d3f644e920e64866; deployment appgdep_6aee0440aae081918215de3ecd830f80. Worker build passed. GitHub remains at the separately synchronized v51.


## 2026-11-06 · Buyer access overview

EU buyer portal now displays all redeemed grant records with ACTIVE / EXPIRED / REVOKED filters, full-account totals and 50-row ID-cursor pagination. Counts are grants, not verified companies, suppliers or compliance scores. Revocation takes precedence over expiry; continuous-summary redemption deadlines do not become access expiry. Unredeemed and other-account grants are excluded. Inactive rows expose only minimal grant metadata, never organization or evidence contents. Overview browsing creates no VIEWED/DOWNLOADED evidence event. Existing evidence read/download authorization remains authoritative.

API: GET /api/basic-access?overview=1&status=ACTIVE&before=...; legacy buyerList is retained for compatibility. UI clears selected evidence when filtering/refreshing and aborts superseded list requests. Status is measured on refresh, not realtime push. No new migration, no PACI core or sharing-policy changes.

Validation: 210 PASS / 0 FAIL; three new tests cover time boundary/continuous/revocation/redaction, 55-record pagination and ownership, invalid input. Initial test fixture improperly requested precise values in a continuous summary and was corrected without weakening disclosure rules. TypeScript/diff checks passed; log evidence/buyer-overview-tests.log. Authenticated browser acceptance remains unverified; build/deployment receipt follows in RELEASE_EVIDENCE.json.

Still pending: verified supplier grouping, notifications, cross-conversation request/card association and due-diligence report exports. This overview does not claim to implement those features.

Published Site v54 successfully: runtime 26d57f6bc54887f03464288a4fe8290d419e2c19; deployment appgdep_6aee060ffb248191a7dda29bdf0c662e. Worker build passed. No GitHub synchronization in this round.


## 2026-11-06 · Account entry and unverified contact forms

Added /account?lang=zh|en|it with current ChatGPT sign-in plus visibly pending email/phone registration choices. Main header sign-in/register now opens it, including mobile. Optional company-preferred email and international +country-code phone fields persist after hosted sign-in in an account-isolated table (migration 0016). Fields support update/clear, version conflicts and exact-transition response-loss recovery. Domain case normalized, international phone format checked; this is not verification of ownership, existence, mobile capability, delivery or company authority. No country/Chinese language blocking. Contact fields cannot change authenticated identity or existing public contact ID. No OTP, email/SMS sending, password system or independent account creation is implemented. No shared search or buyer disclosure. Privacy notice updated; clear removes current values, not a guarantee of immediate backup erasure.

Validation: 214 PASS / 0 FAIL (4 new format/isolation/retry/clear tests), TypeScript and diff checks passed. Test data uses reserved example.com and synthetic numbers. Log: evidence/account-contacts-tests.log. Authenticated browser acceptance remains pending. Build/publication receipt follows in RELEASE_EVIDENCE.json.

Remaining prerequisite for genuine email/SMS sign-in: confirm hosted identity-provider capability, select and configure provider, verified callback/session integration, OTP hashing/expiry/single-use, resend and attempt limits, enumeration resistance, account linking/recovery, supported delivery countries and production privacy terms. Do not represent current contact forms as working email/SMS registration. No PACI interface change.

Published Site v55 successfully: runtime daaed275eed4178dee0318ac56faaea8c77fb79c; deployment appgdep_6aee0d99b83081919a3fa30da9d806ea. Worker build passed. GitHub not synchronized this round.


## 2026-11-06 · Account contact confirmation and recovery UX

Server now requires the current explicit storage-confirmation version for any nonempty contact save. Additive nullable migration 0017 stores confirmation version/time with the contact row. Legacy rows retain null confirmation; no retrospective assertion. Clearing requires no new consent and clears the current confirmation fields. Exact-transition recovery preserves the original confirmation timestamp. Confirmation never verifies mailbox, phone or company authority. Privacy notice now describes these metadata.

UI distinguishes invalid email/phone, missing confirmation, stale version, expired session and uncertain network result; retains inputs on failure, provides sign-in recovery, shows unsaved changes and last-save/confirmation times. Does not add OTP/provider integration.

Validation: 216 PASS / 0 FAIL (2 new confirmation/legacy tests); TypeScript and diff checks passed; log evidence/account-confirmation-tests.log. Signed-in browser acceptance remains pending. Build/publication receipt follows in RELEASE_EVIDENCE.json.

Published Site v56 successfully: runtime cce588de8e19de5f4c5cd34d1c682fedefb8bd45; deployment appgdep_6aee2032498881918b0f739566aacb2d. Worker build passed. GitHub unchanged this round.

## Next delivery scope
Estimate from the start of this round: 6–8 rounds for a bounded synthetic-data trial milestone, including this account-form closure, 2–3 rounds on communication/evidence association, 1–2 on buyer record export and 2 on acceptance/fixes. This is an estimate, not a production-readiness guarantee; acceptance blockers may extend it. Stop incremental account-form polish unless a defect is found. Actual email/SMS authentication requires supported hosted identity integration and configured provider. Real evidence processing, AI, PACI scan and enterprise connectors remain separately gated external work.


## 2026-11-06 · Cross-contact authorised card response

Implemented explicit CARD_SHARED responses in the original contact request thread using a separately created, redeemed grant. Sender must own that grant; redeemed buyer must be the request author; selected fixed publication month must equal the request month. Only structured responses allow an external evidence_grant_id; ordinary notes/requests cannot attach arbitrary grants. No grant is created, widened, redeemed or automatically bound by sending. Card response is not a claim that the requested material is present, independently verified or sufficient.

Migration 0018 adds nullable evidence_grant_id on messages. Existing grant-thread references retain their projection shape; external references include grant_id. Messages and request tracker preserve original request linkage and fixed card/version. Supplier workbench latest response becomes CARD_SHARED through existing projection. Reads/downloads re-authorise via original grant; revoke/expiry denies evidence while preserving message history. Send transaction rechecks active grant, sender/requester binding and contact/region restrictions; a concurrent revoke rolls back message and sequence.

UI: direct contact conversation → evidence request tracker → incoming request → use separately authorised card → select active same-month grant already redeemed by this contact → select fixed version → explicitly send. Candidate lookup supports pagination, reset and cancellation. Existing grant conversations continue unchanged. No original upload, AI execution, PACI core modification, email notification or automatic disclosure.

Validation: 221 PASS / 0 FAIL, including five cross-contact workflow/security tests. Initial legacy reference-shape regression was fixed by preserving optional-field compatibility. TypeScript/diff checks passed; log evidence/cross-contact-card-tests.log. Authenticated browser acceptance remains pending. Build/deployment receipt follows in RELEASE_EVIDENCE.json.

Published Site v57 successfully: runtime 36ea9c4579e0f715bdc4b7fc0ac32c8e050e8a3d; deployment appgdep_6aee2181a8688191bc44afed768fe3c3. Worker build passed. No GitHub synchronization this round. Next: buyer-side request record export and consolidated browser acceptance.


## 2026-11-06 · Single-request record export

Implemented authenticated GET /api/conversations?grant=...&view=request_export&request=...&format=html|json (optional lang=zh|en|it for HTML). Each request tracker entry now offers printable HTML and JSON downloads. Both conversation participants may export their own conversation's request record. Export includes the request, complete ordered structured response history, latest response status, fixed card/version identifiers and reference grant access status at export. No free-text messages, raw materials, card bodies, private contact details or tokens are included. Request identifiers from other conversations and non-request messages are rejected. A single response-history query reads grant status; more than 500 responses fails explicitly with HTTP 413 rather than silently truncating. This implementation limit is not evidence policy.

Export is a historical record, not a compliance assessment, signature, integrity proof or PACI chain receipt. Existing downloads cannot be recalled. Expiry/revocation retains historical references but does not restore evidence access. ACTIVE describes the grant at export, not card verification or content sufficiency. No evidence VIEWED/DOWNLOADED event or read marker is generated by exporting metadata. HTML uses escaped text, no external resources/scripts and a sandbox CSP; users may print it to PDF. JSON uses schema dossivo/request-record/1 with explicit limitations. No new database migration or PACI interface change.

Validation: 226 PASS / 0 FAIL / 0 SKIP, including five new export tests; TypeScript and diff checks passed. Log: evidence/request-record-export-tests.log. Managed preview failed because an existing vinext server PID 14 in /site occupies the environment; status reports stopped. Authenticated dual-account browser acceptance remains NOT VERIFIED. Build/publication receipt follows in RELEASE_EVIDENCE.json.

GitHub synchronization immediately before this round: v57 at 39e355bc821858a983909204b50389a2529f7c55 (main). This round is not yet synchronized to GitHub. Next: consolidated acceptance of contact request → fixed card response → export → revocation, including signed-in dual-account browser checks when infrastructure permits. Multi-request portfolio export, signed reports and real-data processing remain outside this delivery.

Published Site v58 successfully: runtime a625440053025762a628db8c66c883e32d909839; deployment appgdep_6aee2e5b5f8881919169a82a6eb3ead7. Worker build passed. GitHub remains at the preceding v57 sync.


## 2026-11-06 · Collaboration workflow acceptance and download recovery

Added a real backend integration test covering contact request → PREPARING → fixed card 0 download → explicit publication/card 1 response → complete record export → revoke → both referenced downloads denied while history and prior copies remain. This is a store/database integration test using synthetic actors, not a signed-in browser test.

Download UI now fetches authenticated attachments without leaving the conversation, rejects auth redirects and wrong/missing attachment responses, shows in-flight state, prevents duplicate clicks, and provides retry/login guidance for 401/403/404/413/network/server errors. Abort on component disposal prevents late downloads from a previous view. Browser handoff wording does not assert that the user saved a file. Printable export language is selectable Chinese/English/Italian with localized topic/status labels; JSON remains stable machine codes. API now rejects an export without a conversation instead of falling back to the inbox. Card preview in request tracker is keyed by response ID, so a new latest response cannot retain the prior response's open card.

Validation: 230 PASS / 0 FAIL / 0 SKIP; TypeScript and diff checks passed. Four new tests: complete backend workflow plus attachment success/cancellation contract, HTTP failure mapping, invalid attachments/auth pages. Log: evidence/collaboration-acceptance-tests.log. No new migration, no grants or PACI interface changes. Managed preview status remains stopped; previous /site vinext infrastructure conflict has no demonstrated recovery, so no repeated restart or alternative browser/auth bypass was attempted. Authenticated dual-account browser acceptance and download/print visual verification remain NOT VERIFIED.

Next acceptance work: legitimate dual-account UI walkthrough once preview/auth access is available; validate actual file download and PDF print layout. External email/SMS identity, production real data, AI execution, enterprise storage connector and PACI chain receipts remain separate pending capabilities. This round does not claim production readiness. GitHub remains at v57 (39e355bc821858a983909204b50389a2529f7c55).

Published Site v59 successfully: runtime 8cb24a7d49cbcf0e5606048263b034ae1161b2c4; deployment appgdep_6aee345e98d8819198929db6ae60c64c. Worker build passed. GitHub remains at v57.


## 2026-11-06 · Contact-consent workflow and inbox recovery

Inbox refresh now aborts superseded requests and ignores late responses. HTTP 401 clears loaded conversations, selection, unread totals and return-contact state, unmounts the private panels, and shows a sign-in link returning to /conversations. Failed refresh keeps prior data with an explicit stale-data warning rather than claiming an empty inbox. Opening a different contact clears the old return-contact destination. Explicitly opened accepted contacts without a first message remain open across refreshes; they legitimately have no inbox row yet. No polling, new grant behavior or new messaging scope was introduced.

New complete synthetic store/database acceptance test uses ContactStore.ensureProfile/request/respond (not manual accepted-contact insertion): third-party acceptance denied; consent creates no evidence grants; accepted empty thread opens; request appears unread; supplier's task remains private; unredeemed card response denied; separate buyer redemption enables explicit card response; contact block denies messages but does not silently revoke evidence; separate grant revoke denies downloads while history/export survive. Communication blocking and evidence revocation remain independent controls.

Validation: 231 PASS / 0 FAIL / 0 SKIP, TypeScript/diff checks passed. Log: evidence/contact-consent-workflow-tests.log. This is backend integration acceptance, not browser acceptance. UI race/session changes were reviewed and typechecked; no authenticated browser result is claimed. Prior managed-preview and dual-account login blockers remain unresolved, so the previous failed preview was not repeatedly restarted. No new migration/PACI change, no real data or provider activation. Build/release receipt follows in RELEASE_EVIDENCE.json. GitHub stays at v57 until another sync.

Milestone boundary: core synthetic direct-contact → consent → request → private preparation → separate authorization → fixed-card response → export → block/revoke backend path is now covered. Do not continue adding miscellaneous messaging features to postpone acceptance. Remaining communication milestone gate is legitimate dual-account browser walkthrough, file download/print UX and fixes found there. External real identity/email/SMS/production evidence/AI/PACI/enterprise-host connectors remain separate work, not implied complete by these tests.

Published Site v60 successfully: runtime 1408344a81c3b0c76aebbb680e9bbeac4891a792; deployment appgdep_6aee35e709d48191a541cd167f02d6cf. Worker build passed. GitHub remains at v57.


## 2026-11-06 · Partner entry and three draft agreements

Added prominent localized Sidebar “成为合作伙伴 / Become a partner / Diventa partner” beneath pricing, linking to /partners?lang=zh|en|it. Public overview has three tracks: promotion (creators/local promoters/HR), local delivery/training, and law firms/compliance specialists in EU and non-EU countries. Authenticated server page renders the selected Chinese agreement draft; sign-in return retains track/language. GET /api/partner-contracts?type=promotion|delivery|professional&format=html|md independently requires the hosted authenticated user; no-store attachments include print sandbox protections. Public catalog contains descriptions, not full contract terms. Site login gate is not DRM: downloaded/source-controlled drafts can be copied.

[Confidential draft content removed from published source; retained separately for owner review.]

No application submission, verification workflow, e-signature, referral tracking, commission engine, assignments or payment implementation. Signed-in account does not verify business identity, signatory authority or professional credentials. No new personal data is collected. No database migration, evidence permissions or PACI core change. Current evidence restrictions remain unchanged. Agreement download is not a signed contract. English/Italian UI available; contract bodies intentionally Chinese drafts pending reviewed translations.

Validation: 235 PASS / 0 FAIL / 0 SKIP; 4 new tests for track/draft terms, unauthenticated/invalid access, attachments/no actor leakage, HTML escaping. Log: evidence/partner-entry-tests.log. TypeScript/diff passed. Authenticated browser gate remains pending; publication/anonymous visual check receipt follows. GitHub still at v57 pending separate synchronization.

Published Site v61 successfully: runtime c4921e1cdc922c9af70d47f8fea1bf631949d41c; deployment appgdep_6aee4609bd948191893916f63c49e887. Browser opened production /partners?lang=zh anonymously and verified all three tracks, draft notices and sign-in gate through the accessibility tree. No sign-in or professional verification attempted; signed-in downloads, sidebar/mobile/print visual acceptance remain pending. Cloud browser public navigation now works; do not carry forward a blanket claim that all browser access is unavailable. GitHub remains at v57.


## 2026-11-06 · Adaptive Sidebar work layout

Initial desktop sidebar now opens at full width. Intro shortcuts default expanded. Persistent user choice (localStorage dossivo-sidebar-intro-layout-v1, current browser only) switches expanded/compact, independent of the existing whole-sidebar width toggle. Compact full-width layout is 2×2: benefits, pricing, partnerships, Protocol; direct messaging remains a full-width row below. Whole-sidebar narrow mode uses a single-column adaptation; choosing compact while narrow expands width to show the grid. All labels/icons and destinations retained. Small-height viewports can scroll the whole sidebar so work navigation is not inaccessible.

Successful private-task creation/add_material, or authenticated loading of existing tasks, signals evidence work started. Only users without an explicit layout choice see a nonmodal prompt. Either “switch to work layout” or “keep expanded” is remembered; no automatic layout switch, login counting or repeated prompts after selection. Manual switch remains available; storage-disabled users retain choice for current mount only. Cross-tab preference updates supported. No task IDs or evidence contents enter preference storage. Existing synthetic-only material policy preserved.

Direct messaging shows unread badge when authenticated unread_total is positive, refreshed on mount and visible window focus/visibility return. Failed/unauthenticated reads hide the badge rather than claiming a fresh zero. No polling, auto-read marking or notification delivery. Data accessed through existing authorization only.

Validation: existing 235 tests passed; TypeScript/diff checks passed. Log evidence/sidebar-work-layout-tests.log. No new tests added for reversible layout styling. No schema/migration, contractual policy or PACI permission change. Browser verification receipt follows. GitHub remains at v57 pending requested sync.

Published Site v62 successfully: runtime e29f3ae4670d77aeb7109f5f7c88950b8fef4774; deployment appgdep_6aee49834f608191b016d524c8d75d38. Anonymous production browser at /zh: default expanded observed; clicked compact toggle; screenshot confirmed 2x2 and wide direct-message row with work tools visible; reload retained compact. Signed-in trigger/unread, narrow/mobile interaction remain unverified. GitHub remains v57.


## 2026-11-07 · Round 41 (user correction: 21 was a typo), including unpublished round 40

Both input documents were read: DOSSIVO 三栏工作界面规格 v1.docx and 做一组修改20261107.docx. New /workspace uses existing private evidence tasks, with persisted conversation messages, immutable result versions, task titles/pins/archive, owner-scoped UI preferences and action audits. Homepage prepare/header entry opens it; legacy evidence tools remain reachable. Desktop three columns, tablet result overlay and mobile drawer/bottom sheet are implemented. Homepage hero now emphasizes continuous records; direct messaging moves up and retains its two-person icon in the narrow sidebar. Chinese/English/Italian UI strings are supplied; source evidence is not translated.

Backend migrations 0038 and 0039 are additive. Round 40 adds a dedicated-auth test checkout stop worker, atomic leases, bounded retry/backoff and review state. Hosted scheduling and its credential remain unconfigured; this is an engine, not an active scheduler. Round 41 result bodies are hash-checked and protected by append-only SQL triggers. Deleting a workspace task hides it, preserving existing evidence. Internal links do not grant access. Workspace list/messages/results have explicit technical limits, not subscription policy.

Boundaries: real sensitive intake stays closed; generated drafts are rule-based synthetic preparation, not live AI or legal conclusions. Paid subscriptions and verified buyer organizations are not activated. External share creation fails closed in the backend. No new public links, QR codes, buyer-cap activation or paid entitlement is claimed. Existing PACI adapter/kernel and disclosure rules are unchanged. PDF uses browser print/save; DOCX and JSON download fixed snapshots. Browser preview was blocked by an existing managed dev server; responsive/focus/download interaction is NOT browser-verified. No public GitHub synchronization requested or performed.

Validation: 525 unit/integration tests; 7 local HTTP/workerd/D1 workspace checks; 18 local payment/stop worker checks; TypeScript; DOCX ZIP/Unicode/XML/metadata parsing. Runtime fixtures are synthetic and do not verify production login or real Stripe. See evidence/round41-* and docs/ROUND41_ACCEPTANCE_MATRIX.md. Build/publication receipt recorded separately after completion.

Published Site v123 successfully. Runtime commit cce9b24420cbd4d6512a462943caf37ad99f07a6; deployment appgdep_6aef4719d9e48191a150e4fc0b4fa08d; URL https://dossivo-outcome-workbench.xugv.chatgpt.site/workspace?lang=zh . Native publication succeeded; browser QA remains unverified as stated above. Public GitHub was not synchronized.


## 2026-11-07 · Round 42 — workspace audit and authorized export

Implemented the previously placeholder workspace-record action as an owner-only paginated record panel (Chinese/English/Italian), showing server-recorded task-data reads, result generation and task metadata actions, and export preparation with exact version and format. GET audit does not recursively create a read event. Pages use deterministic timestamp/id cursors (50 events + lookahead); response projection omits command payload hashes and internal actor identifiers. Migration 0040 adds an index and UPDATE/DELETE/REPLACE protection for workspace events; schema and migration snapshot updated. Existing history is retained; read/export tracking starts with this update, not retrospectively.

Export now requests the exact immutable result from the authenticated backend and commits its preparation record before returning it; no client-cache fallback on failure. Export retries are idempotent and still recheck current task availability. Cross-owner/task result IDs, unsupported formats and caller-supplied scope are rejected. JSON/DOCX use returned fixed snapshot; browser print/PDF opens its window before asynchronous permission checking and closes it on failure. Audit explicitly does not claim completed download, offline-copy tracking or external buyer visits. Existing external buyer access logs are a separate system; no new sharing eligibility or buyer access is enabled here.

Also added Markdown copy, corrected copy-success wording, and made Escape close the top modal without also closing the underlying result panel. Preview start again failed due to an existing managed dev server (PID 14, /site); status stopped. Infrastructure was not modified. Desktop/tablet/mobile touch/focus and print-dialog behavior remain NOT BROWSER VERIFIED.

Verification: 530 tests PASS (5 added for owner audit, exact-version export/idempotency, cross-task/deleted-task denial, stable pagination and append-only SQL enforcement); 11 local HTTP/workerd/D1 workspace checks PASS (4 additional export/audit checks); TypeScript and diff checks PASS. These are synthetic runtime fixtures, not production login or actual buyer/Stripe tests. Evidence in evidence/round42-*. No real sensitive-data intake, live AI, PACI kernel change, paid activation or public GitHub sync. Next: browser verification when preview recovers; connect eligible external sharing only through verified subscription and buyer-organization authority. Publication receipt follows.

Round 42 published as Site v124. Runtime commit 75bbd60e39371354606a88b459b755cadb188942; deployment appgdep_6aef4c4c9a3c8191b5fe9c18ea4f7981 succeeded. URL https://dossivo-outcome-workbench.xugv.chatgpt.site/workspace?lang=zh . Native deployment verified; browser interaction remains unverified. Public GitHub unchanged.


## 2026-11-07 · Round 43 — human revision notes with immutable lineage

Workspace result panel now offers Add revision note / Open latest version in Chinese, English and Italian. A saved human note appends a new result version and a conversation result card. The original rule-based narrative, material coverage, evidence snapshot, facility/period, private synthetic scope and non-verification flags remain unchanged. Human notes are visibly labeled and are included in plain/Markdown copy and PDF-print/DOCX/JSON exports. This is annotation, not editing source evidence or upgrading a compliance rating. Regenerating a fresh rule-based result uses current task evidence; prior annotated versions remain retained.

Backend revise accepts only task_id, result_id, expected_hash and a nonempty note up to 2000 characters. It checks owner access, exact base hash and latest version of the same result type. A transactional guard detects another version or task deletion between read and commit; result, conversation card, updated timestamp and audit event commit together. Retried saves are idempotent, including a fresh availability check; cross-owner requests, forged evidence/scope fields, stale versions and deleted-task replay are rejected. Revision lineage records parent result ID/hash with kind HUMAN_NOTE. Audit projection includes revision version without note text. No schema migration or PACI kernel change.

Validation: 535 tests PASS (5 new tests for immutable lineage, denied/stale inputs, rollback, simultaneous revision conflict, note limits/deleted replay); 14 local HTTP/workerd/D1 checks PASS (3 added for revision, stale rejection and exported snapshot lineage); TypeScript and diff checks PASS. Logs: evidence/round43-*. Local runtime uses synthetic data and does not test production login. Known managed preview blockage from rounds 41/42 remains unresolved; no recovery evidence, so browser/touch/print UI acceptance is still NOT VERIFIED and was not represented as passed.

U6 is now partially completed with human annotation versions; unrestricted document/source editing is deliberately not introduced. Remaining: eligible external sharing/buyer-organization and billing integration; browser viewport and touch acceptance; full document editing only with explicit provenance design. Real sensitive intake and live AI remain disabled. No public GitHub sync. Publication receipt follows.

Round 43 published as Site v125. Runtime commit 363f095eb6a2434dc73d5694e6a2c2e1d848f268; deployment appgdep_6aef4e1f93a88191a6a142b281750250 succeeded. URL https://dossivo-outcome-workbench.xugv.chatgpt.site/workspace?lang=zh . Native publication confirmed; browser interaction still unverified. Public GitHub unchanged.


## 2026-11-07 · Round 44 — historical cited-source viewer

Corrected result evidence chips: they now open an authenticated historical-source panel rather than the unrelated private-file staging panel. Backend verifies task ownership, active workspace task, result membership and cited material membership; loads the exact private-task version recorded by the result; verifies its full snapshot fingerprint; then returns a limited source projection. Readable content is restricted to synthetic text. Directory/unreadable sources return no text and never claim an original was reviewed. React renders source text as text, not HTML. No R2 file linkage or real-document preview is claimed.

Successful source reads commit a source_read audit event before returning content. The workspace log records result/version without source text. Cross-owner, absent result, uncited/later-added material and deleted-task access are denied. The panel shows result/task version, snapshot ID, facility and period, with explicit historical-source wording. Result panels warn when the currently loaded task version differs and offer explicit regeneration from current materials; old results remain fixed. This warning is based on the latest fetched task state, not live monitoring. New rule-based results do not automatically carry forward manual notes; earlier annotated versions remain available.

Validation: 540 tests PASS (5 new source access, historical isolation, deleted/foreign denial, directory-only and audit-failure checks); 17 local HTTP/workerd/D1 workspace checks PASS (3 new source runtime checks); TypeScript and diff checks PASS. Evidence: evidence/round44-*. Tests use synthetic fixtures, not production login. Browser/mobile/print verification remains outstanding due to the previously observed preview infrastructure conflict; no recovery was observed and no bypass was attempted. No new migration, subscription activation, sharing grant, AI inference, PACI kernel change or public GitHub synchronization. Four handoff documents updated; publication receipt follows.

Round 44 published as Site v126. Runtime commit f4a342a73bcb7cc03e7f8268ff1f911d40a85716; deployment appgdep_6aef4ff67d2c81918c872f97e14934fb succeeded. URL https://dossivo-outcome-workbench.xugv.chatgpt.site/workspace?lang=zh . Native publication confirmed; browser UI remains unverified. Public GitHub unchanged.


## 2026-11-07 · Round 45 — workspace material intake and gap recording

Result checklist plus buttons now open a category-prefilled material panel instead of file staging. The composer also offers Add materials for an existing task. Chinese/English/Italian forms support synthetic text (title, category, bounded 2000-character text, task facility/period) and missing-material catalogue records (title, category, custodian, reason). Both require the user to confirm synthetic-only input in the UI. Text import additionally enforces synthetic_only on the existing server command. File staging remains separate and does not imply evidence linkage.

Reuses authenticated /api/private-tasks with existing owner checks, expected-version CAS, idempotency and private-task operation audit; no duplicate evidence engine. Save retries retain request IDs while payload/version is unchanged. Saved material refreshes the workspace task without overwriting existing result snapshots; returning to a result exposes the newer-task warning and explicit regeneration. A catalogue record never counts as submitted. Only matching facility/period material contributes to coverage; neither text nor catalogue entries auto-confirm the company or claim verification/legal compliance. Asynchronous refresh after switching tasks is guarded so it does not reopen the previous task. Intake audit remains in private-task operations, not falsely claimed as a new workspace-log event.

Validation: 544 tests PASS (4 new intake-to-result coverage, retry/stale-save, gap-only and synthetic/scope checks); 20 local HTTP/workerd/D1 checks PASS (3 additional intake, replay and regenerated coverage checks); TypeScript/diff checks PASS. Evidence: evidence/round45-*. Runtime is synthetic and does not validate production login. Browser/mobile/print acceptance remains pending because the known managed preview conflict has not recovered. No new migration, real-original intake, AI provider, PACI kernel, paid entitlement or public GitHub sync. Four handoff docs updated. Remaining: validate authenticated UI in recovered preview; eligible buyer sharing/billing integration; real file ingestion only after its existing gates are satisfied. Publication receipt follows.

Round 45 published as Site v127. Runtime commit c75e363df5db5d8b25d44a46149d99376b76c3ef; deployment appgdep_6aef512174f081919790c3812b8b5496 succeeded. URL https://dossivo-outcome-workbench.xugv.chatgpt.site/workspace?lang=zh . Native publication verified; browser UI acceptance remains pending. Public GitHub unchanged.


## 2026-11-07 · Round 46 — proof verification foundation (supplemental anti-phishing design)

Read the full attached DOCX, including configuration and P1–P15 tables. Implemented /verify (ZH/EN/IT), explicit-submit code prefill, /security guidance, workspace entry, and legacy synthetic proof-page notices. Verification is NOT activated: no official domain, signing/rate keys or abuse channel was configured. UI says preparation; server fails closed with 503 rather than claiming NOT_FOUND or successful verification. Current hosted ChatGPT sign-in is accurately distinguished from a future official-domain login policy.

Added internal-only registry/signature primitives, no public issuance endpoint: unbiased random 12-character code using prescribed alphabet; hashed code storage; full canonical snapshot hash with 16-hex display; metadata-only status projection; immutable registry fields/revocation history; region/key-ID HMAC-SHA256 tokens; old-key verification when retained. D1 fixed-window rate limits: 10 per trusted CF IP/minute and 30 per code/hour, short-lived keyed IP digests, expired bucket cleanup. Requires explicitly configured domain, key map, active key, region and separate rate key; only matching hostname may serve lookup. Migration 0041_gorgeous_beyonder and schema snapshot included.

Critical qualification: copied codes/fingerprints do not authenticate a cloned page or prove unchanged visible content. The registry verifies a recorded snapshot/status, not evidence truth/legal compliance. Fingerprint is for the canonical snapshot, not a byte hash of PDF/DOCX. No chain anchor, direct snapshot hash publication on-chain, issuer/buyer names, customer relations or evidence body are exposed by lookup. Legacy /proof token rendering remains its prior mechanism and is NOT newly HMAC-protected; its UI explicitly says not integrated. Existing workspace sharing remains denied; entitlement/privacy gates unchanged.

Validation: 550 tests PASS (6 new groups covering code/config, all-character token alteration, old-key rotation, privacy projection, revoked/expired states, rate bounds, immutable records/new versions); 8 local workerd WebCrypto/D1 runtime checks PASS; TypeScript and diff checks PASS. Evidence: evidence/round46-*. No production config, live signed sharing or browser/touch/print acceptance verified. This is foundation delivery, not P1–P15 completion. See docs/ROUND46_ANTI_PHISHING_ACCEPTANCE.md. No public GitHub sync or uploaded confidential document copied to source. Publication receipt follows.

Round 46 foundation published as Site v128. Runtime commit e5e4e56c2e5edda079be922674ea809bf4f3a5c8; deployment appgdep_6aef531dd844819186a614f9aaeb75a7 succeeded. URL https://dossivo-outcome-workbench.xugv.chatgpt.site/verify?lang=zh . Verification remains explicitly unconfigured, no keys/domain or live issuance enabled. Browser acceptance pending. Public GitHub unchanged.


## 2026-11-07 · Round 47 — proof-source lifecycle binding

Founder explicitly deferred the official domain and abuse mailbox. Retain both as pending; do not repeatedly request them or invent values. No runtime secret/domain configuration or live verification activation performed.

Added internal owner-checked binding from an existing synthetic proof link to a verification record, with an atomic CAS guard for source ownership, activity, expiry and frozen snapshot bytes/version. Binding and registry insertion roll back together; duplicate/racing binding returns a conflict. New migration 0042_sad_jimmy_woo protects binding identity and the frozen snapshot/recipient/scope/expiry of bound proof links. Registry records cannot silently follow a newer snapshot. Existing unbound legacy links are not relabeled or migrated.

Verification now reads the original bound source: revoked/expired results disclose only state/date; exhausted views disclose EXHAUSTED; missing case or incompatible snapshot returns SOURCE_UNAVAILABLE. Public /api/verify explicitly requires a source binding, so standalone internal fixture records cannot report ACTIVE through it. Metadata lookup never consumes views or exposes the source bearer token. Signed token resolution checks signature, record and source before the existing proof route; matching configured host is required. The original route then rechecks access and atomically consumes a view/logs access. An independently signed token grants no extra visits. Invalid/disabled signed requests return a generic 404 without content. Config remains absent, so production signed access remains closed.

Scope: this binds the existing synthetic controlled-summary demonstration, not paid workspace entitlements or verified buyer organisations. No public binding/issuance UI/API was added; owner tenant must come from the existing authenticated session integration, not client-supplied input. Native share modal/export code presentation and idempotent recoverable public issuance remain unfinished. Old proof-page notices remain accurate for the currently issued legacy test links. No mail, report queue, passkey, domain monitoring or PACI anchor changes.

Validation: 559 tests PASS (9 new lifecycle, owner, rollback/race, exhaustion, immutable source, unbound-public-mode and actual signed-route tests); 11 local workerd/WebCrypto/D1 checks PASS (3 new binding/source-lifecycle checks); TypeScript/diff checks PASS. Existing proof-route tests now substitute Cloudflare env with fixtures while running actual signature module, Drizzle predicates and SQLite. No real domain, live token issuance, production login or browser acceptance claimed. Evidence in evidence/round47-*. Four handoff documents updated; GitHub not synchronized. Publication receipt follows.

Round 47 published as Site v129. Runtime commit 0ecb94afa126f55ea86eddf63947a858ca660672; deployment appgdep_6aef599769608191b56a1bc3d2df6c78 succeeded. URL https://dossivo-outcome-workbench.xugv.chatgpt.site . Domain/mailbox remain deferred by founder; signed issuance remains disabled. Browser acceptance pending. Public GitHub unchanged.


## 2026-11-07 · Round 48 — homepage privacy subtitle

Applied the requested temporary homepage copy correction. Chinese hero subtitle is now: 保护资料安全与企业隐私，由你决定向谁披露，按授权范围交付。 English and Italian equivalents emphasize sensitive information, business privacy, recipient choice and authorised scope. Hero title and eyebrow remain unchanged. No claim of absolute security, independent verification or activated sharing is introduced.

This round is a focused copy change. No backend, schema, pricing, permissions or PACI compatibility changes. Official domain/abuse email remain deferred; no production verification activation. Validation: 27 existing workflow/newsletter tests PASS, TypeScript and diff checks PASS. The earlier 559-test suite is historical and was not rerun or counted as this round’s result. No new tests for this reversible text-only edit. Browser responsive layout remains unverified under the existing preview environment limitation. Four handoff documents updated; no public GitHub sync. Next resume remaining signed-share issuance/export integration and other previously documented acceptance gaps. Publication receipt follows.

Round 48 published as Site v130. Runtime commit 55620e6403fa70d04f2c0d35a385dd58866b29c4; deployment appgdep_6aef5a715b5c8191814045304c08203e succeeded. URL https://dossivo-outcome-workbench.xugv.chatgpt.site/zh . Copy-only update; browser layout unverified. Public GitHub unchanged.


## Round 49 — recoverable verification issuance (2026-11-07)

Internal owner-bound issuance now recovers the same verification code, signed token, fingerprint and verification URL after a lost response, process restart or concurrent retry. The original random registry ID is retained. A domain-separated HMAC derivation produces the code with rejection sampling; plaintext codes and signing secrets are not stored in the database. Migration 0043 adds immutable receipts containing registry ID, original key ID, region and domain only. Registry, binding and receipt are committed atomically.

Every retry rechecks source ownership, frozen snapshot integrity, registry/source revocation, expiry and remaining visits. No visit allowance is reset. Retaining the original key permits recovery after active-key rotation; missing/replaced keys or changed domain/region fail closed. Older bindings without receipts cannot silently receive replacement codes. No public issuance endpoint or new sharing entitlement is enabled. Official domain and abuse mailbox remain deferred by the founder; production signing configuration remains absent. PACI kernel/protocol and disclosure policy are unchanged.

Validation: 564 unit/integration tests PASS, including 5 new recovery groups; 13 local workerd/WebCrypto/D1 checks PASS, including retry and restart recovery; TypeScript and diff checks PASS. Logs: evidence/round49-*. These are synthetic checks, not production user or buyer acceptance. Browser/mobile/print verification remains pending due to the previously recorded managed preview conflict. Actual share modal/export integration and production activation remain outstanding.

GitHub synchronization is explicitly requested this round. Source, migrations, tests, validation evidence and development handoff documents are included; secrets, runtime data, real customer/personal records and uploaded confidential contracts/specification attachments are excluded. Publication and GitHub receipts follow after confirmed completion.

Round 49 published as Site v131. Runtime commit f6b1022e7d33f22065391aba6a930f8192ba48f6; deployment appgdep_6aef5c87bf348191b20eb36bb25e7da9 succeeded. URL https://dossivo-outcome-workbench.xugv.chatgpt.site . Source recovery is internal only; production signing remains disabled. Browser acceptance pending. Public GitHub synchronization in progress.


## Round 50 — signed proof presentation and metadata download (2026-11-07)

The actual signed proof route now returns code, short fingerprint, configured official domain, verification URL and issuance/expiry timestamps after signature, binding, receipt and lifecycle checks. It still consumes the original access allowance. Missing receipt/configuration or an invalid signature does not receive signed presentation metadata. Legacy proof responses explicitly carry no verification metadata.

The proof viewer displays this information in Chinese, English or Italian, links to current official status, and offers a JSON verification-information download. The download is an allowlisted metadata receipt only: no original evidence, buyer identity, source ID or bearer token. This is not a new evidence-download permission. It explicitly grants no evidence access and makes no certification claim. A last permitted view can save historical metadata while subsequent verification correctly reports exhausted access; the receipt directs readers to check current status rather than asserting perpetual ACTIVE status. Destination validation rejects altered URLs, extra token query parameters and malformed codes/fingerprints. The legacy warning is shown only for legacy presentation. The mixed-language card-version label is now localized.

Validation: 568 unit/integration tests PASS (4 new route/privacy/destination/last-view cases); 15 local workerd/WebCrypto/D1 checks PASS (2 new signed presentation checks); TypeScript and diff checks PASS. Evidence: evidence/round50-*. Browser/mobile/download interaction remains NOT VERIFIED under the existing managed preview limitation. No production domain/key activation, real sensitive intake, new PACI kernel or paid/buyer permission bypass. No schema change in this round. Official domain and reporting mailbox remain deferred. Share-creation modal and full authorized evidence-export integration are still pending.

Round 49 GitHub sync confirmed: main commit 8c21652149b11d13bb026395f14ba3f2479f680b; 674 public file hashes verified. Automated publication review rejected including five original attachment-derived files under docs/continuation-2026-11-05/inputs/. The public tree excludes that directory; it remains in the private development checkout. This exclusion does not erase any earlier GitHub history. Preserve this public-source exclusion on future syncs. Never publish uploaded confidential contracts/specifications or runtime credentials. Round 50 publication and any subsequent sync receipts follow.

Round 50 published as Site v132. Runtime commit 863026b0f890ccdce3080062011fdc35cb081def; deployment appgdep_6aef5f183374819181f80a56b131e364 succeeded. URL https://dossivo-outcome-workbench.xugv.chatgpt.site . Production verification/signing remains unconfigured. GitHub round50 snapshot scope includes this source and receipt, excluding original attachment texts; consult main commit history for the resulting public sync SHA. Browser acceptance remains pending.
