## Round 39: recovery before stopping an unbound test order

`cancel_test_checkout` now queries existing provider sessions when its server order lacks a session ID. The server supplies all filters/reference values; no browser/provider-ID override. Recovery only uses GET list requests, at most 2 pages × 100 entries, then conditionally binds a unique validated ID and calls the established retrieve/expire workflow. No creation POST, no recovered checkout URL and no entitlement changes. The existing test-only configuration gate remains required for remote operations.

No match is provisional: retain REQUESTED and retry later. Multiple matches, malformed/incomplete pages or inconsistent fields require review; do not choose the first match. A successfully bound session is re-read before expiry. The existing stop idempotency key remains stable. No database migration required. No automatic retry scheduler configured this round.

Reference reviewed 2026-11-07: https://docs.stripe.com/api/checkout/sessions/list (created interval, limit 1–100, starting_after and has_more). The clock margin and page cap are technical safeguards, not subscription policies. Real-provider pagination/recovery must still be validated in the intended TEST account.

## Round 38: stop lifecycle for TEST checkout

New command: POST `/api/payments/test-checkout`, action `cancel_test_checkout`, idempotencyKey (normal command envelope), data `{organization_id,draft_version,confirmed:true}`. Owner-only and same-origin. Provider expiry retries use the server order's deterministic key, independent of browser request keys. No browser-provided provider ID or redirect accepted.

Stop intent is durable even without test configuration. Results REQUESTED, EXPIRED_CONFIRMED and COMPLETED_REVIEW are separate from payment receipt outcomes. Do not equate local expiry/withdrawal with provider expiry; do not treat a completed checkout as refundable/cancelled. Withdrawal now atomically records intent for its corresponding order and makes a best-effort provider call. Existing pending requests are visible in account status and retried by explicit user action. No scheduled retry service or missing-session recovery exists yet.

Official API references reviewed 2026-11-07: https://docs.stripe.com/api/checkout/sessions/expire and https://docs.stripe.com/api/checkout/sessions/retrieve. GET validates the same test order before POST /expire; a provider error on POST is followed by a read to resolve already-expired/completed races. Uncertain outcomes stay pending. No keys, provider payloads or customer details are logged/persisted by this operation.

## Round 37: signed snapshot comparison (TEST ONLY)

The new owner status GET correlates exact server-bound session IDs. It compares signed reference/amount/currency/mode against the saved order quote and requires paid status for TEST_PAYMENT_MATCHED. This is a read-only diagnostic, not fulfillment. Missing snapshots from round 35/36 are REVIEW_REQUIRED; webhook redelivery never overwrites earlier receipt data. Checkout completion with unpaid status remains pending. Mixed success/failure receipts require review regardless of arrival order. No customer metadata is trusted to select an organization.

Snapshot fields are inserted atomically with the verified receipt. Current provider retrieval (including line items), refunds, invoices and subscription-state reconciliation remain required before live activation. No receipt snapshot is itself an entitlement. Current provider guidance reviewed: https://docs.stripe.com/checkout/fulfillment.md?ui=full-page (2026-11-07). The status UI exposes only an owner-scoped summary and explicitly labels test-only and superseded/withdrawn drafts. Its refresh is a read operation; it does not call Stripe or create a new checkout.

## Round 36 test Checkout configuration (default CLOSED)

Server environment must contain all four: `STRIPE_CHECKOUT_MODE=TEST_ONLY`, `STRIPE_TEST_SECRET_KEY` with a valid `sk_test_` value, `STRIPE_WEBHOOK_MODE=TEST_RECEIPT_ONLY`, and `STRIPE_WEBHOOK_SECRET` (`whsec_`). Do not store credential values in documentation, repository, logs or browser. No live-mode configuration is supported. Do not enable until a designated test account and its webhook endpoint are selected. Tests use synthetic placeholders only.

POST `/api/payments/test-checkout`: signed-in organization owner, same-origin JSON command `create_test_checkout`, request idempotency key, data containing only organization_id, expected_version and confirmed=true. GET returns readiness only, never credentials. Server fixes the account return URL and restricts returned payment host to checkout.stripe.com. Test return does not mean paid. Stripe API version pinned to 2026-10-28.endive; inline recurring price uses the frozen catalog value, not customer input. No tax/discount billing policy is inferred from this test adapter.

Reconciliation is still pending. Existing webhook inbox does not update orders or subscriptions. Do not treat any session creation or test receipt as entitlement activation. Previously delivered test URLs remain usable until remote expiration even after draft withdrawal; implement cancellation before live billing. Expired orders are never retried beyond the fixed one-hour window (avoids reuse past Stripe's idempotency retention).

Reference: https://docs.stripe.com/api/checkout/sessions/create and https://docs.stripe.com/api/idempotent_requests (reviewed 2026-11-07).

# Payment webhook handoff — development 35

Implemented endpoint: POST /api/payments/stripe-webhook. Provider reference: Stripe snapshot webhooks. This is TEST RECEIPT intake only. It does not create checkout sessions, collect money, mark an invoice paid, update organisation subscriptions, reserve founder slots or grant evidence access.

## Current state

Production environment inspected on 2026-11-07: revision 0, no STRIPE/PAYMENT configuration keys. No secret value was printed or persisted. No external merchant account was selected or changed. No Stripe destination was created. The endpoint returns 503 PAYMENTS_DISABLED until explicit test configuration and database are available. Checkout remains disabled in the catalog.

Required runtime key names (configure only through secure runtime secret controls, never source/browser/manifest/chat):
- STRIPE_WEBHOOK_MODE: TEST_RECEIPT_ONLY
- STRIPE_WEBHOOK_SECRET: the signing secret from the dedicated Stripe TEST snapshot destination (not an API key and not a different CLI destination secret).

Live events are unconditionally denied in this implementation, even if a real endpoint secret is accidentally configured. Connect/account-context and thin events are not supported. Browser session cookies and redirect parameters cannot authenticate this service endpoint.

## Receipt rules

1. Body read is bounded to 256 KiB, JSON media type and uncompressed bytes. Signature header bounded to 4096 characters and 8 v1 signatures. These are technical intake bounds, not commercial policy.
2. HMAC-SHA256 over the original timestamp-dot-raw-body bytes, using WebCrypto verify; v0 ignored, duplicate timestamp/malformed signatures denied. Timestamp window is 300 seconds both past and future. Signing timestamp freshness is independent of event.created; correctly re-signed historical retry events remain possible.
3. Require a snapshot event ID/object, test livemode=false, event creation timestamp and data.object.id. Allowlisted events: checkout.session.completed, checkout.session.async_payment_succeeded/failed, invoice.paid/payment_failed, customer.subscription.updated/deleted. Unknown verified test types are acknowledged as ignored without storage.
4. Successful response follows database persistence. Unique provider event ID deduplicates retries and concurrent deliveries, including after restart. An already-stored event with a different raw payload SHA-256 returns 409 EVENT_CONFLICT: investigate/provider reconciliation required; never overwrite or silently activate. A storage failure returns 503 so delivery can retry.
5. Persist only event ID/type, object ID, raw payload digest, event-created timestamp and receipt time. No raw JSON, customer/contact/address, metadata, signature, secret, amount or organisation mapping is stored. A digest is not a claim of anonymisation.
6. These records mean VERIFIED_TEST_RECEIPT only. They are not accounting entries, accepted payment, reliable ordering of subscription state, full immutable audit or PACI evidence. No public receipt-list API exists.

## Before enabling the test destination

Select the intended merchant/account with the founder; register a test snapshot destination for the implemented allowlist; configure the exact destination signing secret securely. Test authentic provider delivery, duplicate and failure/retry behavior on hosted dispatch. This has NOT been done. Local HMAC fixtures do not establish merchant account ownership or Stripe delivery success.

## Before live checkout

Complete verified legal entity / contractual buyer mapping and decide supported production identity/hosting. Configure merchant credentials securely. Create server-side checkout orders with catalog version, exact currency/amount, approved tax and founder terms, idempotency and unique provider-session-to-organisation mapping. A receipt must be reconciled to that trusted order, not client metadata. Implement payment/subscription/refund/dispute lifecycle, provider retrieval for stale/out-of-order state, durable failure recovery and transactional entitlement activation. Sponsor payment never creates evidence permissions. Live mode requires separate implementation, security review and end-to-end acceptance, not merely changing the mode variable.

## Verification

478 tests pass, including 7 new webhook tests. Local workerd HTTP endpoint + WebCrypto + D1: 7 checks pass. No real Stripe connection, production HTTP or browser payment flow verified. Evidence: docs/evidence/round35-tests.log, round35-types.log, round35-runtime.log. Migration 0033_melodic_stepford_cuckoos creates the test receipt table; it does not alter prior subscriptions or evidence.

Official references checked 2026-11-07:
- https://docs.stripe.com/webhooks (manual signature protocol, timestamp window, secret rotation)
- https://docs.stripe.com/events/manage-webhook-endpoints (raw body, delivery retry, duplicate handling)
