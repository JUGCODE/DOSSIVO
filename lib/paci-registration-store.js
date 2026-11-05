import { BridgeError, fingerprint } from "./paci-bridge-core.js";
import { PaciBridgeStore } from "./paci-bridge-store.js";
import { PaciRegistrationClient, registrationEnvelope, TransportError } from "./paci-http-client.js";

/** Durable registration-only dispatcher. No checks, assessments, grants or adjudication. */
export class PaciRegistrationStore extends PaciBridgeStore {
  async listDeliveries(actorId) {
    const { tenantId, caseId } = this.identity(actorId);
    return this.all("SELECT request_id, snapshot_id, case_version, state, record_id, record_version, operation_id, last_error_code, updated_at FROM paci_registration_deliveries WHERE tenant_id=? AND case_id=? ORDER BY updated_at DESC LIMIT 100", tenantId, caseId);
  }
  async sync(actorId, requestId, binding, options = {}) {
    const { tenantId, caseId } = this.identity(actorId);
    if (!binding) throw new TransportError("PACI_NOT_CONFIGURED", false, 503);
    const request = await this.first("SELECT id, target_id, operation FROM paci_bridge_requests WHERE id=? AND tenant_id=? AND case_id=?", requestId, tenantId, caseId);
    if (!request || request.operation !== "REGISTER_DOSSIER") throw new BridgeError("REQUEST_NOT_FOUND", "Registration request is unavailable", 404);
    const draft = await this.exportSnapshot(actorId, request.target_id);
    const expected = await registrationEnvelope(request.id, draft.manifest, actorId, binding);
    const expectedHash = await fingerprint(expected);
    const now = this.clock();
    await this.statement("INSERT OR IGNORE INTO paci_registration_deliveries (request_id, tenant_id, case_id, snapshot_id, case_version, envelope_json, envelope_hash, state, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'PREPARED', ?)", request.id, tenantId, caseId, request.target_id, draft.manifest.case_version, JSON.stringify(expected), expectedHash, now).run();
    const saved = await this.first("SELECT * FROM paci_registration_deliveries WHERE request_id=? AND tenant_id=? AND case_id=?", request.id, tenantId, caseId);
    if (!saved || saved.envelope_hash !== expectedHash || await fingerprint(JSON.parse(saved.envelope_json)) !== expectedHash) throw new TransportError("PACI_BINDING_OR_PAYLOAD_CHANGED", false, 409);
    // Even a registered delivery is recovered again under the service's current permissions.
    try {
      const result = await new PaciRegistrationClient(binding, options).registerOrRecover(JSON.parse(saved.envelope_json));
      const existing = await this.first("SELECT record_id, operation_id FROM paci_registration_deliveries WHERE request_id=? AND tenant_id=?", request.id, tenantId);
      if (existing.record_id && (existing.record_id !== result.record_id || existing.operation_id !== result.operation_id)) throw new TransportError("PACI_RECEIPT_CHANGED", false, 409);
      await this.db.batch([
        this.statement("UPDATE paci_registration_deliveries SET state='REGISTERED', record_id=?, record_version=?, operation_id=?, receipt_json=?, last_error_code=NULL, updated_at=? WHERE request_id=? AND tenant_id=? AND envelope_hash=? AND (record_id IS NULL OR (record_id=? AND operation_id=?))", result.record_id, result.record_version, result.operation_id, JSON.stringify(result.receipt), this.clock(), request.id, tenantId, expectedHash, result.record_id, result.operation_id),
        this.statement("UPDATE paci_bridge_requests SET status='REGISTERED' WHERE id=? AND tenant_id=? AND case_id=? AND EXISTS (SELECT 1 FROM paci_registration_deliveries WHERE request_id=? AND tenant_id=? AND state='REGISTERED' AND record_id=? AND operation_id=?)", request.id, tenantId, caseId, request.id, tenantId, result.record_id, result.operation_id),
      ]);
      const committed = await this.first("SELECT record_id, operation_id FROM paci_registration_deliveries WHERE request_id=? AND tenant_id=?", request.id, tenantId);
      if (committed.record_id !== result.record_id || committed.operation_id !== result.operation_id) throw new TransportError("PACI_RECEIPT_CHANGED", false, 409);
      return { registration: "REGISTERED", verification: "UNVERIFIED", proof_package: null };
    } catch (error) {
      const code = error instanceof TransportError ? error.code : "PACI_CONFIRMATION_UNAVAILABLE";
      // Retain a prior receipt as history, but mark current registration confirmation unavailable.
      await this.db.batch([
        this.statement("UPDATE paci_registration_deliveries SET state='UNCONFIRMED', last_error_code=?, updated_at=? WHERE request_id=? AND tenant_id=?", code, this.clock(), request.id, tenantId),
        this.statement("UPDATE paci_bridge_requests SET status='PENDING' WHERE id=? AND tenant_id=? AND case_id=?", request.id, tenantId, caseId),
      ]);
      if (error instanceof TransportError) throw error;
      throw new TransportError("PACI_CONFIRMATION_UNAVAILABLE", true);
    }
  }
}
