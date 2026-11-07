# Confidential contract storage

Draft bodies and commercial proposals are not part of published source. Owner review copies have been preserved separately. Do not seed confidential documents in migrations, tests, assets, environment examples or source history intended for public export.

`dossivo_partner_contract_documents` stores reviewed documents by type/version/language in runtime data. `dossivo_partner_contract_access` separately authorises an individually approved account for an exact type/version and duration. Both must exist. The page and API default to denial; missing or invalid document records are not released. No public write/approval API exists. This release does not provision any document or approve a recipient. Administrative review/upload workflow remains pending.

Site source copying does not copy runtime database records. Do not put private runtime values into release archives. Existing independently obtained copies cannot be recalled.

## Administrator provisioning

Use the private runtime environment variable `PARTNER_CONTRACT_ADMIN_IDS` as a JSON array of exact authenticated account IDs for THIS Site. Do not use emails or project-owner IDs from another service. Never put real IDs in source or examples. Missing or invalid configuration denies access. Configure only a verified intended administrator; the current deployment has no administrator configured.

Navigate to `/partners/admin?lang=en` or `?lang=zh`. Upload a single JSON document with `type`, `version`, `language`, `status`, `title`, `summary`, `clauses` (array of title/text pairs). Current accepted version is defined in `lib/partner-contracts.js`; status must be `DRAFT_NOT_EFFECTIVE`. Review each language separately. Same version/language is immutable; do not bypass this via database edits. New-version authoring remains a future task.

Verify recipient identity and eligibility separately, use their displayed Site account ID, choose expiry, and explicitly approve. Approval applies to all reviewed languages for that type/version. Access remains restricted by the existing recipient API on every request. Revoke when needed; previous copies cannot be recalled. No email delivery or e-signature is implemented.

## Applications and eligibility (v69 work)

`/api/partner-applications` uses the authenticated account as owner. GET returns only that account's applications and whether a reviewer is configured. No administrator configuration means new applications are closed. POST accepts submit or withdraw, an operation ID and the displayed revision. Users cannot edit a pending/approved application in place: withdraw, amend, then resubmit.

`/api/partner-applications/admin` uses the same exact administrator allowlist as contract management. It provides status-filtered pagination and manual reviews. No self-review is allowed. Qualification approval is separate from contract access. Existing grants without a currently approved application are denied. Withdrawal/return/rejection revokes all grants for the track; reapproval does not restore grants. Release checks eligibility revision in the same transaction, and download checks eligibility on every read.

Application/profile text is runtime private data; event records contain identifiers/status/revision only. Withdrawal retains current application and review metadata; it is not a deletion API. Do not activate real-data intake before the responsible operator confirms privacy/retention arrangements and admin identities. No notifications, professional certification or e-signing are implemented.

## Explicit contract versions

This supersedes the fixed-version limitation above. Version identifiers use `partners-draft/major.minor[.patch]-YYYY-MM-DD`; the date-like suffix is an identifier, not an effective date. The document's version must match the upload envelope. Each type/version/language is immutable. Each recipient/type/version requires its own grant and can be revoked separately. Eligibility withdrawal still revokes all versions for that track.

Recipient page and download API accept `version`. Missing version preserves the original `PARTNER_DRAFT_VERSION` default for legacy URLs; never auto-select the newest. Authorized version links list only the current actor's valid grants with the selected language available. No translation fallback. Render reviewed contract text as original data, outside UI localization. Filenames include version IDs. Current lists are bounded at 100 rows; exact-version routes and admin input remain available beyond the listing bound.

## Review history

Application history is available through the existing applicant/admin GET routes with `history=<track>` and optional `before=<revision>`. Applicant ownership comes only from authenticated identity. The admin route additionally requires `recipientId` and administrator authorization. Results are bounded at 25 events, newest revision first, with `nextBefore` for older entries. New events do not shift prior cursor pages.

The applicant projection excludes reviewer account IDs and operation IDs. Admin projection includes the acting account for review accountability. Neither includes private application text or contract terms. History is an audit view, never an authorization source. No notifications are sent. The UI reads only after expansion, supports refresh/earlier records and cancels superseded requests.
