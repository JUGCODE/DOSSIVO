import { BridgeError, requireSameOrigin } from "./paci-bridge-core.js";

export const DEMO_SESSION_COOKIE = "dossivo_demo_session_v1";
export const DEMO_TENANT_PREFIX = "demo-session-v1:";
export const DEMO_BODY_LIMIT = 16_384;

export function resolveDemoSession(request, authenticatedUserId, allowCreate = false) {
  if (typeof authenticatedUserId === "string" && authenticatedUserId) {
    return { tenantId: authenticatedUserId, setCookie: null };
  }

  const cookiePrefix = `${DEMO_SESSION_COOKIE}=`;
  const matches = (request.headers.get("cookie") ?? "").split(";")
    .map((part) => part.trim()).filter((part) => part.startsWith(cookiePrefix));
  const existingToken = matches.length === 1 ? matches[0].slice(cookiePrefix.length) : "";
  if (/^[a-f0-9]{64}$/.test(existingToken)) {
    return { tenantId: `${DEMO_TENANT_PREFIX}${existingToken}`, setCookie: null };
  }
  if (!allowCreate) return null;

  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return {
    tenantId: `${DEMO_TENANT_PREFIX}${token}`,
    setCookie: `${cookiePrefix}${token}; HttpOnly; SameSite=Lax; Path=/${secure}`,
  };
}

export async function readDemoCommand(request) {
  requireSameOrigin(request);
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new BridgeError("INVALID_CONTENT_TYPE", "JSON is required", 415);
  }
  if (Number(request.headers.get("content-length")) > DEMO_BODY_LIMIT) {
    throw new BridgeError("PAYLOAD_TOO_LARGE", "The request is too large", 413);
  }

  const chunks = [];
  let length = 0;
  const reader = request.body?.getReader();
  if (reader) {
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        length += value.byteLength;
        if (length > DEMO_BODY_LIMIT) {
          await reader.cancel();
          throw new BridgeError("PAYLOAD_TOO_LARGE", "The request is too large", 413);
        }
        chunks.push(value);
      }
    } finally {
      reader.releaseLock();
    }
  }
  const bytes = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let payload;
  try { payload = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)); }
  catch { throw new BridgeError("INVALID_JSON", "Invalid JSON"); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)
    || typeof payload.action !== "string" || !payload.action || payload.action.length > 64
    || typeof payload.idempotencyKey !== "string" || !payload.idempotencyKey.trim() || payload.idempotencyKey.length > 128
    || (payload.data !== undefined && (!payload.data || typeof payload.data !== "object" || Array.isArray(payload.data)))) {
    throw new BridgeError("INVALID_INPUT", "A valid action and idempotencyKey are required");
  }
  if (payload.action === "authorize_link" && (typeof payload.data?.recipient !== "string"
    || !payload.data.recipient.trim() || payload.data.recipient.length > 320)) {
    throw new BridgeError("INVALID_RECIPIENT", "Recipient is required (maximum 320 characters)");
  }
  return payload;
}
