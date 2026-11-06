# Account entry and verification boundaries


## 2026-11-06 · Account entry and unverified contact forms

Added /account?lang=zh|en|it with current ChatGPT sign-in plus visibly pending email/phone registration choices. Main header sign-in/register now opens it, including mobile. Optional company-preferred email and international +country-code phone fields persist after hosted sign-in in an account-isolated table (migration 0016). Fields support update/clear, version conflicts and exact-transition response-loss recovery. Domain case normalized, international phone format checked; this is not verification of ownership, existence, mobile capability, delivery or company authority. No country/Chinese language blocking. Contact fields cannot change authenticated identity or existing public contact ID. No OTP, email/SMS sending, password system or independent account creation is implemented. No shared search or buyer disclosure. Privacy notice updated; clear removes current values, not a guarantee of immediate backup erasure.

Validation: 214 PASS / 0 FAIL (4 new format/isolation/retry/clear tests), TypeScript and diff checks passed. Test data uses reserved example.com and synthetic numbers. Log: evidence/account-contacts-tests.log. Authenticated browser acceptance remains pending. Build/publication receipt follows in RELEASE_EVIDENCE.json.

Remaining prerequisite for genuine email/SMS sign-in: confirm hosted identity-provider capability, select and configure provider, verified callback/session integration, OTP hashing/expiry/single-use, resend and attempt limits, enumeration resistance, account linking/recovery, supported delivery countries and production privacy terms. Do not represent current contact forms as working email/SMS registration. No PACI interface change.


## 2026-11-06 · Account contact confirmation and recovery UX

Server now requires the current explicit storage-confirmation version for any nonempty contact save. Additive nullable migration 0017 stores confirmation version/time with the contact row. Legacy rows retain null confirmation; no retrospective assertion. Clearing requires no new consent and clears the current confirmation fields. Exact-transition recovery preserves the original confirmation timestamp. Confirmation never verifies mailbox, phone or company authority. Privacy notice now describes these metadata.

UI distinguishes invalid email/phone, missing confirmation, stale version, expired session and uncertain network result; retains inputs on failure, provides sign-in recovery, shows unsaved changes and last-save/confirmation times. Does not add OTP/provider integration.

Validation: 216 PASS / 0 FAIL (2 new confirmation/legacy tests); TypeScript and diff checks passed; log evidence/account-confirmation-tests.log. Signed-in browser acceptance remains pending. Build/publication receipt follows in RELEASE_EVIDENCE.json.
