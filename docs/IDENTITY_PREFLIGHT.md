# Identity capability audit and migration preflight — 2026-11-07

Round 24 rechecked app/auth.ts, app/chatgpt-auth.ts, existing identity boundary tests, current Sites identity/secrets documentation and available tool metadata. The supported runtime uses platform-injected identity and platform sign-in routes. Runtime environment settings and custom domains do not establish external identity support. No external-provider configuration is exposed in the reviewed tool surface. Independent email signup remains BLOCKED; do not deploy the current header adapter to an untrusted direct origin.

Round 25 provides an offline structural validator, not a login implementation. Run:

```sh
node scripts/check-identity-migration-plan.mjs /absolute/path/to/approved-plan.json
```

Plan structure (synthetic example only):

```json
{"format":"dossivo-identity-migration/1","allowed_issuers":["https://identity.example.test"],"legacy_actor_ids":["synthetic-actor"],"bindings":[{"issuer":"https://identity.example.test","subject":"synthetic-subject","actor_id":"synthetic-actor"}]}
```

Issuer and subject match exactly; neither emails nor display names establish ownership. Every supplied legacy actor must have exactly one binding. Unknown actors, duplicate provider identities, multiple bindings to one actor, malformed/oversized inputs and unapproved issuers fail. Actor IDs are retained byte-for-byte. The CLI prints counts or error codes, never bindings or contact details; it does not write to files or databases. It always reports activation_allowed=false.

A passing plan does NOT establish that the actor inventory is complete, that provider sessions or dual-account control have been verified, or that the proposed binding is authorized. Those require a supported identity host, actual token/session verification, explicit dual-control linking or separately reviewed recovery, full ownership inventory, synthetic restore rehearsal and two-account acceptance. Do not pass raw client identity claims into any future resolver. This module is not imported by application authentication and does not alter current access.

Existing actor IDs must be preserved in tasks, grants, conversations, contacts, contracts and immutable embedded history. Do not rewrite snapshots to new provider IDs. The plan is an additive mapping proposal only; storage, live linking, recovery and production migration are not implemented. No provider, mail sender, paid service, credentials or production data export was configured in these rounds.
