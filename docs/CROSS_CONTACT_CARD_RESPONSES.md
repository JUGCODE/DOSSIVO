# Explicit authorised card responses across contact and grant contexts


## 2026-11-06 · Cross-contact authorised card response

Implemented explicit CARD_SHARED responses in the original contact request thread using a separately created, redeemed grant. Sender must own that grant; redeemed buyer must be the request author; selected fixed publication month must equal the request month. Only structured responses allow an external evidence_grant_id; ordinary notes/requests cannot attach arbitrary grants. No grant is created, widened, redeemed or automatically bound by sending. Card response is not a claim that the requested material is present, independently verified or sufficient.

Migration 0018 adds nullable evidence_grant_id on messages. Existing grant-thread references retain their projection shape; external references include grant_id. Messages and request tracker preserve original request linkage and fixed card/version. Supplier workbench latest response becomes CARD_SHARED through existing projection. Reads/downloads re-authorise via original grant; revoke/expiry denies evidence while preserving message history. Send transaction rechecks active grant, sender/requester binding and contact/region restrictions; a concurrent revoke rolls back message and sequence.

UI: direct contact conversation → evidence request tracker → incoming request → use separately authorised card → select active same-month grant already redeemed by this contact → select fixed version → explicitly send. Candidate lookup supports pagination, reset and cancellation. Existing grant conversations continue unchanged. No original upload, AI execution, PACI core modification, email notification or automatic disclosure.

Validation: 221 PASS / 0 FAIL, including five cross-contact workflow/security tests. Initial legacy reference-shape regression was fixed by preserving optional-field compatibility. TypeScript/diff checks passed; log evidence/cross-contact-card-tests.log. Authenticated browser acceptance remains pending. Build/deployment receipt follows in RELEASE_EVIDENCE.json.
