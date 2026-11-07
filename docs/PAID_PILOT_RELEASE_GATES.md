# Paid pilot release gates — 2026-11-07

Ten-day target is conditional, not a release guarantee. Do not measure readiness by version or test counts.

| Gate | Actual status | Acceptance |
|---|---|---|
| Independent email registration | BLOCKED: current host owns identity; 2026-11-07 capability re-audit found no supported external-provider configuration in current host tools/docs | Supported hosting/provider decision, verified email, recovery, session revocation, account isolation; no email-only auto-linking |
| Existing account return flow | Implemented; automated tests pass | Authenticated browser callback/recovery still needed |
| Real evidence | v83 binary staging backend implemented, test gate closed; actual R2/browser acceptance pending | Private storage, bounded upload, content validation, authorisation, retention/deletion and restore verification before opening real originals |
| AI extraction | Not connected | Actual source-linked extraction, failure handling, human confirmation, costs measured; no invented verification |
| Subscription/payment | Not connected | Merchant setup, checkout, verified/replay-safe webhook, entitlements, cancellation and failure tests |
| Buyer collaboration | Existing foundation | Two independent accounts exercise grant, read, revoke and download limitations |
| Operations | Partial | Monitoring, backup/restore, support contact, production privacy/terms review |
| PACI | Production proof not verified | Follow existing charter acceptance; explicitly label unavailable proof, never substitute fake addresses |

v82: business authentication is isolated behind app/auth.ts; legacy actor IDs are preserved. External email provider is still not enabled. See IDENTITY_MIGRATION_BOUNDARIES.md.

Capability re-audit completed on 2026-11-07: supported Sites documentation retains platform-owned authentication; current tools expose no external identity-provider configuration. This is a limitation of the verified deployment path, not proof that no future feature exists.

Next action: select and validate a supported independent deployment/identity path. If external email identity is unsupported, prepare a portable hosting/identity migration preserving tenant IDs and access controls before enabling a provider. Do not claim current contact records are verified identities. No user credentials are needed to complete the capability audit. Provider selection and actual account configuration follow a supported design.

Defer optional phone sign-in, advanced agents and sovereign-storage connectors until the narrow paid pilot works. UI polishing is last; safety and functional tests run throughout. No formal pricing or legal policy is set by this document.

Rounds 24–25: an offline identity-binding preflight is implemented and tested. It does not verify sessions, activate email signup, prove control of identities, perform account linking, or migrate data. Do not substitute further UI polish for completing the hosting/identity decision.
