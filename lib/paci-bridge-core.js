/** DOSSIVO-owned preparation. No PACI registration, attestation or verdict is fabricated here. */
export const PACI_SOURCE = Object.freeze(["SELF_REPORTED", "INSTRUMENTED", "THIRD_PARTY_ATTESTED"]);
export const PACI_CHECK_RESULT = Object.freeze(["PASSED", "FAILED", "INCONCLUSIVE"]);
export const PACI_CLAIM_ASSESSMENT = Object.freeze(["SUPPORTED", "PARTIALLY_SUPPORTED", "SELF_DECLARED_ONLY", "EXPIRED", "CONTRADICTED", "UNRESOLVED", "OUTSIDE_SCOPE"]);
export const CHALLENGE_REASONS = Object.freeze(["INCORRECT_DATA", "OUTDATED_EVIDENCE", "MISSING_CONTEXT", "OTHER"]);

export class BridgeError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "BridgeError";
    this.code = code;
    this.status = status;
  }
}

export function canonicalJson(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  throw new BridgeError("INVALID_JSON", "Only finite JSON values are accepted");
}

export async function fingerprint(value) {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function requiredString(value, name, max = 200) {
  if (typeof value !== "string" || !value.trim() || value.length > max) throw new BridgeError("INVALID_INPUT", `${name} is required (maximum ${max} characters)`);
  return value.trim();
}

export function validateBridgeCommand(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new BridgeError("INVALID_INPUT", "An object is required");
  const key = requiredString(input.idempotency_key, "idempotency_key", 128);
  const allowed = {
    prepare_registration: ["action", "idempotency_key", "case_version"],
    open_challenge: ["action", "idempotency_key", "snapshot_id", "reason", "comment"],
    record_response: ["action", "idempotency_key", "challenge_id", "comment"],
    withdraw_challenge: ["action", "idempotency_key", "challenge_id"],
  };
  if (!Object.hasOwn(allowed, input.action)) throw new BridgeError("INVALID_ACTION", "Unsupported action");
  if (Object.keys(input).some((field) => !allowed[input.action].includes(field))) throw new BridgeError("INVALID_INPUT", "Unexpected fields are not accepted");
  const command = { action: input.action, idempotency_key: key };
  if (input.action === "prepare_registration") {
    if (!Number.isSafeInteger(input.case_version) || input.case_version < 1) throw new BridgeError("INVALID_VERSION", "A positive case_version is required");
    return { ...command, case_version: input.case_version };
  }
  if (input.action === "open_challenge") {
    if (!CHALLENGE_REASONS.includes(input.reason)) throw new BridgeError("INVALID_REASON", "Choose a supported challenge reason");
    const comment = input.comment === undefined || input.comment === "" ? "" : requiredString(input.comment, "comment", 1000);
    return { ...command, snapshot_id: requiredString(input.snapshot_id, "snapshot_id"), reason: input.reason, comment };
  }
  const challenge_id = requiredString(input.challenge_id, "challenge_id");
  if (input.action === "record_response") return { ...command, challenge_id, comment: requiredString(input.comment, "comment", 1000) };
  return { ...command, challenge_id };
}

function text(value, max = 1000) { return typeof value === "string" ? value.slice(0, max) : ""; }

export function buildRegistrationDraft({ snapshotId, caseId, caseVersion, state, now }) {
  if (state?.syntheticDemo !== true) throw new BridgeError("REAL_DATA_DISABLED", "This integration accepts the bundled synthetic workflow only", 403);
  if (!Number.isSafeInteger(caseVersion) || caseVersion < 1 || !Number.isFinite(Date.parse(now))) throw new BridgeError("INVALID_SNAPSHOT", "Invalid snapshot metadata");
  const scope = Object.fromEntries(["organization", "product", "facility", "market", "period", "ruleSet"].map((key) => [key, text(state.scope?.[key], 500)]));
  const facts = (Array.isArray(state.facts) ? state.facts : []).slice(0, 100).map((fact) => ({
    local_ref: text(fact.id, 80), label: text(fact.label), value: text(fact.value),
    source_label: text(fact.source), confirmed_by_company: (state.confirmations ?? []).includes(fact.id),
  }));
  const gaps = (Array.isArray(state.findings) ? state.findings : []).slice(0, 100).map((gap) => ({ local_ref: text(gap.id, 80), title: text(gap.title), status: "OPEN" }));
  const record = {
    client_record_ref: `${snapshotId}:dossier`,
    client_version: 1,
    record: {
      kind: "CLAIM", source: "SELF_REPORTED", lifecycle: "EXECUTED", coverage: "PARTIAL", visibility: "PRIVATE",
      content: { synthetic_demo: true, action: "DOSSIER_PREPARED", scope, facts, open_gaps: gaps, originals_included: false },
      summary: { synthetic_demo: true, fact_count: facts.length, company_confirmed_count: facts.filter((fact) => fact.confirmed_by_company).length, open_gap_count: gaps.length },
      relations: [],
    },
  };
  return {
    format: "dossivo-paci-dossier/0.1", dossier_id: snapshotId, case_ref: caseId, case_version: caseVersion,
    created_at: now, recorded_at_source: "SYSTEM_CLOCK", synthetic_demo: true,
    registration_status: "PENDING", paci_record_refs: [],
    deployment_region: "UNVERIFIED", log_checkpoint: null,
    source: "SELF_REPORTED", coverage: "PARTIAL", visibility: "PRIVATE",
    claim_assessment: "UNRESOLVED", verification: "UNVERIFIED", checks: [], dispute: "NONE",
    records: [record],
    limitations: ["PREPARATION_ONLY", "NO_PACI_RECEIPT", "NO_ORIGINALS", "NO_INDEPENDENT_REVIEW", "NO_TRUSTED_TIMESTAMP", "NO_REGIONAL_LOG_REGISTRATION"],
  };
}

/** Failures remain visible; an old successful check never masks a failed check on the same version. */
export function projectChecks(checks, version) {
  const relevant = checks.filter((check) => check.version === version);
  if (!relevant.length) return { result: "UNVERIFIED", checks: [] };
  if (relevant.some((check) => check.result === "FAILED")) return { result: "FAILED", checks: structuredClone(relevant) };
  if (relevant.some((check) => check.result !== "PASSED")) return { result: "INCONCLUSIVE", checks: structuredClone(relevant) };
  return { result: "PASSED", checks: structuredClone(relevant) };
}

export function requireSameOrigin(request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) throw new BridgeError("ORIGIN_DENIED", "A same-origin request is required", 403);
}
