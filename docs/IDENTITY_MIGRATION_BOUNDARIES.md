# Identity migration boundaries — v82

## Capability decision
The current supported deployment uses Sites-managed authentication. The inspected tool surface has runtime secrets, site access controls and custom domains, but no external identity-provider configuration. This is not proof that no future platform feature can support it; it is insufficient evidence to enable a separate session stack today. Current independent email registration remains BLOCKED.

## Implemented
Business code now calls app/auth.ts. Its only provider is app/chatgpt-auth.ts. It returns the existing actor identifier unchanged. Contact email and phone never create or resolve an identity. No claims of enterprise authority or email verification are introduced. All existing resource ownership and membership checks remain necessary after authentication.

## Required before external email activation
1. Confirm a supported external-provider deployment, or select independent hosting. Do not claim DNS/custom-domain changes replace the authentication gateway.
2. On independent hosting, replace the adapter with verified provider sessions; do not deploy the current Sites header adapter on an untrusted direct endpoint. Arbitrary incoming oai-authenticated headers must never grant identity there.
3. Keep application actor IDs separate from provider issuer + subject. Existing actors require explicit, authenticated migration/linking. Never infer ownership from the same email, contact field, unverified profile or domain. New provider identities must not collide with legacy IDs.
4. Prove control of both identities for self-service linking, or use a separately reviewed administrative recovery process with audit and rollback. Account-linking implementation does not exist yet.
5. Migrate dependent task, grant, conversation, contact and contract ownership consistently. Preserve audit attribution and frozen evidence. Do not mass-rewrite user IDs in current production.
6. Validate email verification, expired/replayed callbacks, session logout/revocation, recovery, rate limits, account enumeration resistance, and two-account resource isolation.
7. Rehearse database export/import and restore on synthetic data before real customer migration. No production data was exported this round.

## External configuration still needed
Supported host and identity provider; sender domain and delivery service if applicable; callback origins; secret configuration; production privacy/support arrangements. None has been provisioned by this round. The user is not asked to provide secrets until a supported, concrete setup has been selected.

## Acceptance limits
Automated tests run against the actual adapter and mocked platform headers. They do not prove that a different host validates or strips headers, nor replace a real sign-in browser test. GitHub remains at v73 until another explicit sync.
