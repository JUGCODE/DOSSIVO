import { snapshotView, compareSnapshotViews } from "./snapshot-review.js";
import { BridgeError, buildRegistrationDraft, fingerprint, validateBridgeCommand } from "./paci-bridge-core.js";

const NO_CONNECTION = "NOT_CONNECTED";

/** D1 adapter. Its transactions persist DOSSIVO drafts/outbox; they do not persist the PACI engine. */
export class PaciBridgeStore {
  constructor(db, options = {}) {
    this.db = db;
    this.clock = options.clock ?? (() => new Date().toISOString());
    this.uuid = options.uuid ?? (() => crypto.randomUUID());
  }

  statement(sql, ...values) { return this.db.prepare(sql).bind(...values); }
  async first(sql, ...values) { return this.statement(sql, ...values).first(); }
  async all(sql, ...values) { return (await this.statement(sql, ...values).all()).results; }

  identity(actorId) {
    if (typeof actorId !== "string" || !actorId.trim()) throw new BridgeError("AUTH_REQUIRED", "Sign in is required", 401);
    return { tenantId: actorId, caseId: `buyer-pack:${actorId}` };
  }

  async read(actorId) {
    const { tenantId, caseId } = this.identity(actorId);
    const row = await this.first("SELECT version FROM outcome_cases WHERE id = ? AND tenant_id = ?", caseId, tenantId);
    if (!row) throw new BridgeError("CASE_NOT_FOUND", "Open the outcome workspace first", 404);
    const [snapshots, requests, challenges, events] = await Promise.all([
      this.all("SELECT id, case_version, created_at, manifest_json FROM paci_dossier_snapshots WHERE tenant_id = ? AND case_id = ? ORDER BY case_version DESC LIMIT 50", tenantId, caseId),
      this.all("SELECT id, operation, status, case_version, created_at FROM paci_bridge_requests WHERE tenant_id = ? AND case_id = ? ORDER BY created_at DESC, id DESC LIMIT 100", tenantId, caseId),
      this.all("SELECT id, snapshot_id, reason, comment, created_at FROM paci_bridge_challenges WHERE tenant_id = ? AND case_id = ? ORDER BY created_at DESC LIMIT 50", tenantId, caseId),
      this.all("SELECT challenge_id, kind, comment, sequence, created_at FROM paci_challenge_events WHERE tenant_id = ? AND case_id = ? ORDER BY sequence ASC", tenantId, caseId),
    ]);
    const publicSnapshots = snapshots.map((item) => {
      const manifest = JSON.parse(item.manifest_json);
      return { id: item.id, case_version: item.case_version, created_at: item.created_at, source: manifest.source, coverage: manifest.coverage, claim_assessment: manifest.claim_assessment, verification: manifest.verification, dispute: manifest.dispute, visibility: manifest.visibility, record_count: manifest.records.length };
    });
    return {
      connection: NO_CONNECTION, synthetic_demo: true, case_version: row.version,
      current_snapshot: publicSnapshots.find((snapshot) => snapshot.case_version === row.version) ?? null,
      snapshots: publicSnapshots, requests,
      challenges: challenges.map((challenge) => {
        const history = events.filter((event) => event.challenge_id === challenge.id);
        const last = history.at(-1);
        return { ...challenge, business_status: last?.kind === "WITHDRAWN" ? "WITHDRAWN" : last?.kind === "RESPONDED" ? "RESPONDED" : "OPEN", paci_status: null, response_count: history.filter((event) => event.kind === "RESPONDED").length, history };
      }),
    };
  }

  async exportSnapshot(actorId, snapshotId) {
    const { tenantId, caseId } = this.identity(actorId);
    const row = await this.first("SELECT manifest_json, content_hash FROM paci_dossier_snapshots WHERE id = ? AND tenant_id = ? AND case_id = ?", snapshotId, tenantId, caseId);
    if (!row) throw new BridgeError("SNAPSHOT_NOT_FOUND", "Snapshot is unavailable", 404);
    const manifest = JSON.parse(row.manifest_json);
    if (await fingerprint(manifest) !== row.content_hash) throw new BridgeError("SNAPSHOT_INTEGRITY_FAILED", "The stored draft does not match its saved digest", 409);
    return { format: "dossivo-registration-draft/0.1", manifest, local_content_sha256: row.content_hash, proof_package: null, notice: "Private DOSSIVO preparation export. No PACI registration, signed checkpoint, independent verification or legal conclusion is included." };
  }

  async reviewSnapshot(actorId, snapshotId) {
    const draft = await this.exportSnapshot(actorId, snapshotId);
    return snapshotView(draft.manifest, draft.local_content_sha256);
  }

  async compareSnapshots(actorId, beforeId, afterId) {
    // Each fixed version is looked up under the current actor's tenant and case.
    const before = await this.reviewSnapshot(actorId, beforeId);
    const after = await this.reviewSnapshot(actorId, afterId);
    return compareSnapshotViews(before, after);
  }

  async command(actorId, input) {
    const { tenantId, caseId } = this.identity(actorId); // Authenticate again even on an idempotent retry.
    const command = validateBridgeCommand(input);
    const commandHash = await fingerprint(command);
    const replay = await this.findReplay(tenantId, command.idempotency_key, commandHash);
    if (replay) return { ...await this.read(actorId), replayed: true };
    const now = this.clock();
    let operation;
    let caseVersion;
    let targetId;
    let payload;
    let guardTable;
    const statements = [];

    if (command.action === "prepare_registration") {
      const row = await this.first("SELECT id, version, state_json FROM outcome_cases WHERE id = ? AND tenant_id = ?", caseId, tenantId);
      if (!row) throw new BridgeError("CASE_NOT_FOUND", "Open the outcome workspace first", 404);
      if (row.version !== command.case_version) throw new BridgeError("VERSION_CONFLICT", "The case changed; refresh before saving a snapshot", 409);
      const existing = await this.first("SELECT id FROM paci_dossier_snapshots WHERE tenant_id = ? AND case_id = ? AND case_version = ?", tenantId, caseId, row.version);
      if (existing) throw new BridgeError("VERSION_ALREADY_PREPARED", "This version is already saved; refresh to view it", 409);
      targetId = this.uuid();
      caseVersion = row.version;
      const manifest = buildRegistrationDraft({ snapshotId: targetId, caseId, caseVersion, state: JSON.parse(row.state_json), now });
      statements.push(this.statement("INSERT INTO paci_dossier_snapshots (id, tenant_id, case_id, case_version, manifest_json, content_hash, created_at) SELECT ?, ?, ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM outcome_cases WHERE id = ? AND tenant_id = ? AND version = ?)", targetId, tenantId, caseId, caseVersion, JSON.stringify(manifest), await fingerprint(manifest), now, caseId, tenantId, caseVersion));
      operation = "REGISTER_DOSSIER";
      payload = { format: "dossivo-paci-command/0.1", operation, dossier_id: targetId, case_version: caseVersion, draft: manifest };
      guardTable = "paci_dossier_snapshots";
    } else if (command.action === "open_challenge") {
      const snapshot = await this.first("SELECT id, case_version FROM paci_dossier_snapshots WHERE id = ? AND tenant_id = ? AND case_id = ?", command.snapshot_id, tenantId, caseId);
      if (!snapshot) throw new BridgeError("SNAPSHOT_NOT_FOUND", "Snapshot is unavailable", 404);
      targetId = this.uuid();
      caseVersion = snapshot.case_version;
      statements.push(this.statement("INSERT INTO paci_bridge_challenges (id, tenant_id, case_id, snapshot_id, opened_by, reason, comment, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)", targetId, tenantId, caseId, snapshot.id, actorId, command.reason, command.comment, now));
      statements.push(this.statement("INSERT INTO paci_challenge_events (id, tenant_id, case_id, challenge_id, kind, sequence, actor_id, comment, created_at) VALUES (?, ?, ?, ?, 'OPENED', 1, ?, ?, ?)", this.uuid(), tenantId, caseId, targetId, actorId, command.comment, now));
      operation = "OPEN_CHALLENGE";
      payload = { format: "dossivo-paci-command/0.1", operation, local_challenge_id: targetId, dossier_id: snapshot.id, target_case_version: caseVersion, reason: command.reason, comment: command.comment, requires_registration_receipt: true };
      guardTable = "paci_bridge_challenges";
    } else {
      const challenge = await this.first("SELECT c.id, c.snapshot_id, c.opened_by, s.case_version FROM paci_bridge_challenges c JOIN paci_dossier_snapshots s ON s.id = c.snapshot_id AND s.tenant_id = c.tenant_id WHERE c.id = ? AND c.tenant_id = ? AND c.case_id = ?", command.challenge_id, tenantId, caseId);
      if (!challenge) throw new BridgeError("CHALLENGE_NOT_FOUND", "Challenge is unavailable", 404);
      const latest = await this.first("SELECT sequence, kind FROM paci_challenge_events WHERE challenge_id = ? AND tenant_id = ? ORDER BY sequence DESC LIMIT 1", challenge.id, tenantId);
      if (!latest || latest.kind === "WITHDRAWN") throw new BridgeError("CHALLENGE_CLOSED", "The local challenge has already been withdrawn", 409);
      if (command.action === "withdraw_challenge" && challenge.opened_by !== actorId) throw new BridgeError("FORBIDDEN", "Only the challenger can withdraw", 403);
      targetId = this.uuid();
      caseVersion = challenge.case_version;
      const kind = command.action === "record_response" ? "RESPONDED" : "WITHDRAWN";
      statements.push(this.statement("INSERT INTO paci_challenge_events (id, tenant_id, case_id, challenge_id, kind, sequence, actor_id, comment, created_at) SELECT ?, ?, ?, ?, ?, ?, ?, ?, ? WHERE (SELECT MAX(sequence) FROM paci_challenge_events WHERE challenge_id = ? AND tenant_id = ?) = ?", targetId, tenantId, caseId, challenge.id, kind, latest.sequence + 1, actorId, command.comment ?? "", now, challenge.id, tenantId, latest.sequence));
      operation = command.action === "record_response" ? "RESPOND_CHALLENGE" : "WITHDRAW_CHALLENGE";
      payload = { format: "dossivo-paci-command/0.1", operation, local_challenge_id: challenge.id, dossier_id: challenge.snapshot_id, target_case_version: caseVersion, comment: command.comment ?? "", requires_registration_receipt: true, independent_adjudication: false };
      guardTable = "paci_challenge_events";
    }

    const requestId = this.uuid();
    // guardTable is selected above, never provided by the caller. D1 batch is an atomic transaction.
    statements.push(this.statement(`INSERT INTO paci_bridge_requests (id, tenant_id, case_id, case_version, operation, status, idempotency_key, command_hash, target_id, payload_json, created_at) SELECT ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ? WHERE EXISTS (SELECT 1 FROM ${guardTable} WHERE id = ? AND tenant_id = ?)`, requestId, tenantId, caseId, caseVersion, operation, command.idempotency_key, commandHash, targetId, JSON.stringify(payload), now, targetId, tenantId));
    try {
      await this.db.batch(statements);
    } catch (error) {
      if (await this.findReplay(tenantId, command.idempotency_key, commandHash)) return { ...await this.read(actorId), replayed: true };
      if (String(error).includes("UNIQUE")) throw new BridgeError("VERSION_CONFLICT", "The draft changed concurrently; refresh and retry", 409);
      throw error;
    }
    const saved = await this.first("SELECT id FROM paci_bridge_requests WHERE id = ? AND tenant_id = ?", requestId, tenantId);
    if (!saved) throw new BridgeError("VERSION_CONFLICT", "The source changed before the draft was saved; refresh and retry", 409);
    return this.read(actorId);
  }

  async findReplay(tenantId, key, commandHash) {
    const row = await this.first("SELECT command_hash FROM paci_bridge_requests WHERE tenant_id = ? AND idempotency_key = ?", tenantId, key);
    if (row && row.command_hash !== commandHash) throw new BridgeError("IDEMPOTENCY_CONFLICT", "This idempotency key was used for a different command", 409);
    return Boolean(row);
  }
}
