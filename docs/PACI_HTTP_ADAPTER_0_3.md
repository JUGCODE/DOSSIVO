# DOSSIVO registration-only adapter — 2026-10-27

Status: implemented, pilot disabled. No production PACI service, credentials, signed proofs, assessment or independent verification connected by this change.

## Implemented path

- An authenticated same-origin POST `/api/paci-registration` accepts only a fixed local `request_id` and explicit synthetic-registration confirmation. The browser cannot select a PACI origin, tenant, credential, payload, source or assessment.
- Only existing `REGISTER_DOSSIER` requests for the signed-in account and case can be sent. The snapshot is checked against its stored digest again. The snapshot is registered as `MATERIAL`, not a substantive `CLAIM`; its synthetic provenance and local version references are retained.
- Before network access, persist the exact input, operation key, digest and server-owned binding in `paci_registration_deliveries`. Credentials never enter the table, response, application logs or source.
- Query the existing operation before POST. Recovery responses in core 0.3 are actually nested as `{protocol,result:{receipt,result}}`, whereas POST responses are `{protocol,receipt,result}`. Both paths are normalized and validated.
- Compare protocol header/body, operation key, request digest (`registerRecord` plus input), record identity/version, disclosed content, summary, visibility and source. Erased or withheld results fail closed. A service receipt is not a signed transparency proof.
- Save the mapping, receipt and request status atomically. Uncertain network or database outcomes remain pending/unconfirmed; retries reuse the stored key. A changed service origin, tenant, service actor or payload requires explicit migration; it never silently creates another registration.
- Current local snapshot manifests remain immutable preparation artifacts, not mutable transport results. Separate delivery rows carry registration receipts. Challenge/reply/withdrawal requests remain local/pending; this adapter does not send them yet.

## Pilot configuration (not set in this release)

The server must explicitly set `PACI_REGISTRATION_PILOT=enabled`, `PACI_SERVICE_ORIGIN` (HTTPS origin only) and secret `PACI_TENANT_BINDINGS`. Bindings map the signed-in account ID to `{tenant_id,service_actor_id,token}`. Use a separate member-scoped service credential per PACI tenant. Never use an operator credential or a shared cross-tenant token.

Core 0.3 `RecordView` does not return the tenant/service principal. Tenant identity therefore depends on independently checked operator-owned token provisioning; a content echo is not proof of tenant identity. Add authenticated principal discovery or identity-bound receipts upstream before enabling real data. This release keeps the synthetic pilot disabled.

Token rotation may retain the same tenant, actor and origin; these public binding fields are frozen in the envelope. No URL or credential can be supplied by the client. Redirect following is disabled. The request has an eight-second timeout; no background retry loops are installed.

## Acceptance evidence

SQLite-backed tests cover tenant isolation, stable mapping, same-key recovery after new store construction, failure between upstream registration and local commit, disconnected behavior and changed binding rejection. Client tests cover operation/content/protocol mismatch, erased/withheld results, 4xx/5xx, aborted fetch and query-before-write behavior.

An additional in-process compatibility check used the unmodified supplied core 0.3 `PaciEngine` and real `registerRecord`/`operation` outputs: one registration, then recovery of the same operation, passed. The HTTP envelope was simulated; this is not a deployed network end-to-end test.

## Upstream review still open

1. Attestor signature authentication does not establish independence from the claimant/operator. Preserve control/conflict evidence and unknown independence.
2. Derived evidence must not expand original periods or product/factory/batch scope. Compute per-lineage intersections before combining separate evidence paths.
3. Model the binding force of official guidance separately from that of interpreted legal provisions.
4. Apply idempotency to administrative writes too, or clearly version the exceptions.
5. Provide authenticated service principal/tenant identity for binding verification.

`PARTIALLY_SUPPORTED` is accepted as a proposed assessment value; no live assessment or new independent-verification labels are enabled here. No upstream core source is modified or embedded into Workers.
