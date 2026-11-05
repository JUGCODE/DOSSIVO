import { BridgeError, canonicalJson, fingerprint } from "./paci-bridge-core.js";
export const PACI_PROTOCOL = "paci-http/0.4";
const SUPPORTED_PROTOCOLS = ["paci-http/0.3",PACI_PROTOCOL];
const DIGEST_ALG = "sha256/paci-canonical-json-1";

export class TransportError extends BridgeError {
  constructor(code, retryable = false, status = 503) { super(code, "PACI registration could not be confirmed", status); this.retryable = retryable; }
}

/** Only an explicit server-owned tenant binding can enable synthetic registration. */
export function pilotBinding(env, actorId) {
  if (env.PACI_REGISTRATION_PILOT !== "enabled") return null;
  let bindings;
  try { bindings = JSON.parse(env.PACI_TENANT_BINDINGS ?? "{}"); } catch { throw new TransportError("PACI_CONFIG_INVALID"); }
  const b = Object.hasOwn(bindings, actorId) ? bindings[actorId] : null;
  if (!b) return null;
  let url;
  try { url = new URL(env.PACI_SERVICE_ORIGIN); } catch { throw new TransportError("PACI_CONFIG_INVALID"); }
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash
    || !b.tenant_id || !b.service_actor_id || typeof b.token !== "string" || !/^[\x21-\x7e]{16,4096}$/.test(b.token)) throw new TransportError("PACI_CONFIG_INVALID");
  const api_version = env.PACI_HTTP_VERSION ?? PACI_PROTOCOL;
  if (!SUPPORTED_PROTOCOLS.includes(api_version)) throw new TransportError("PACI_PROTOCOL_MISMATCH");
  return { origin: url.origin, tenant_id: b.tenant_id, service_actor_id: b.service_actor_id, token: b.token, api_version };
}

export async function registrationEnvelope(requestId, snapshot, actorId, binding) {
  if (snapshot.synthetic_demo !== true || snapshot.records?.length !== 1) throw new TransportError("PACI_SYNTHETIC_ONLY", false, 403);
  const input = {
    kind: "MATERIAL", source: "SELF_REPORTED", lifecycle: "EXECUTED", coverage: "PARTIAL", visibility: "PRIVATE",
    content: { ...snapshot.records[0].record.content, dossivo: { dossier_id: snapshot.dossier_id, case_version: snapshot.case_version, client_record_ref: snapshot.records[0].client_record_ref, client_version: 1 } },
    summary: snapshot.records[0].record.summary, relations: [],
  };
  return {
    protocol: binding.api_version ?? PACI_PROTOCOL, request_id: requestId, dossier_id: snapshot.dossier_id, case_version: snapshot.case_version,
    origin: binding.origin, paci_tenant_id: binding.tenant_id, service_actor_id: binding.service_actor_id,
    on_behalf_of: `user:${actorId}`, idempotency_key: `dossivo:register:${requestId}`,
    input, request_digest: await fingerprint({ op: "registerRecord", payload: input }),
  };
}

export async function validateRegistrationReply(body, envelope) {
  const r = body?.receipt, v = body?.result;
  if (!SUPPORTED_PROTOCOLS.includes(envelope.protocol) || body?.protocol !== envelope.protocol || r?.digest_alg !== DIGEST_ALG
    || r.idempotency_key !== envelope.idempotency_key || r.request_digest !== envelope.request_digest
    || typeof r.operation_id !== "string" || !r.operation_id || !Number.isFinite(Date.parse(r.first_received_at))
    || typeof r.replayed !== "boolean" || r.result_ref?.type !== "record"
    || typeof r.result_ref.id !== "string" || !r.result_ref.id || r.result_ref.version !== 1
    || v?.record_id !== r.result_ref.id || v.version !== 1
    || v.kind !== "MATERIAL" || v.visibility !== "PRIVATE" || v.disclosed !== "CONTENT" || v.erased === true
    || v.status?.source !== "SELF_REPORTED" || v.status?.coverage !== "PARTIAL"
    || canonicalJson(v.content) !== canonicalJson(envelope.input.content)
    || canonicalJson(v.summary) !== canonicalJson(envelope.input.summary)) throw new TransportError("PACI_RECEIPT_MISMATCH");
  // An authenticated service response is a registration receipt, not a signed proof package.
  return { operation_id: r.operation_id, record_id: r.result_ref.id, record_version: 1, receipt: structuredClone(r) };
}

export class PaciRegistrationClient {
  constructor(binding, options = {}) { this.binding = binding; this.fetch = options.fetch ?? globalThis.fetch; this.timeoutMs = options.timeoutMs ?? 8000; }
  async exchange(path, envelope, post = false) {
    const b = this.binding;
    if (envelope.protocol !== (b.api_version ?? PACI_PROTOCOL) || envelope.origin !== b.origin || envelope.paci_tenant_id !== b.tenant_id || envelope.service_actor_id !== b.service_actor_id) throw new TransportError("PACI_BINDING_CHANGED", false, 409);
    const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const headers = { Authorization: `Bearer ${b.token}`, "PACI-Protocol": envelope.protocol, "X-Paci-On-Behalf-Of": envelope.on_behalf_of };
      if (post) { headers["Content-Type"] = "application/json"; headers["Idempotency-Key"] = envelope.idempotency_key; }
      const response = await this.fetch(`${b.origin}${path}`, { method: post ? "POST" : "GET", headers, body: post ? JSON.stringify(envelope.input) : undefined, redirect: "error", cache: "no-store", signal: controller.signal });
      if (!post && response.status === 404) return null;
      if (!response.ok) throw new TransportError(`PACI_HTTP_${response.status}`, response.status >= 500, response.status === 409 ? 409 : 503);
      if (response.headers.get("paci-protocol") !== envelope.protocol) throw new TransportError("PACI_PROTOCOL_MISMATCH");
      const raw = await response.text();
      if (raw.length > 1_000_000) throw new TransportError("PACI_RESPONSE_TOO_LARGE");
      let body; try { body = JSON.parse(raw); } catch { throw new TransportError("PACI_INVALID_RESPONSE"); }
      return await validateRegistrationReply(post ? body : { protocol: body.protocol, ...body.result }, envelope);
    } catch (error) {
      if (error instanceof TransportError) throw error;
      throw new TransportError("PACI_NETWORK_UNCONFIRMED", true);
    } finally { clearTimeout(timer); }
  }
  async registerOrRecover(envelope) {
    // Always recover with the existing operation key first, including after process restart.
    const prior = await this.exchange(`/v1/operations/${encodeURIComponent(envelope.idempotency_key)}`, envelope);
    return prior ?? this.exchange("/v1/records", envelope, true);
  }
}
