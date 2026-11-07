import { env } from "cloudflare:workers";
import { getCurrentUser } from "@/app/auth";
import { BridgeError, requireSameOrigin } from "@/lib/paci-bridge-core";
import { pilotBinding } from "@/lib/paci-http-client";
import { PaciRegistrationStore } from "@/lib/paci-registration-store";
export const dynamic = "force-dynamic";
const headers = { "cache-control": "private, no-store", "x-content-type-options": "nosniff" };
function fail(error: unknown) {
  if (error instanceof BridgeError) return Response.json({ code: error.code, error: error.message }, { status: error.status, headers });
  return Response.json({ code: "REGISTRATION_UNAVAILABLE", error: "Registration confirmation is unavailable" }, { status: 503, headers });
}
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ code: "AUTH_REQUIRED" }, { status: 401, headers });
  try {
    const binding = pilotBinding(env as unknown as Record<string, string>, user.userId);
    return Response.json({ configuration: binding ? "PILOT_CONFIGURED" : "NOT_CONFIGURED", synthetic_demo: true, assessment_enabled: false, independent_verification_enabled: false, deliveries: await new PaciRegistrationStore(env.DB).listDeliveries(user.userId) }, { headers });
  } catch (error) { return fail(error); }
}
export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ code: "AUTH_REQUIRED" }, { status: 401, headers });
  try {
    requireSameOrigin(request);
    if (!request.headers.get("content-type")?.startsWith("application/json")) throw new BridgeError("INVALID_CONTENT_TYPE", "JSON is required", 415);
    const text = await request.text();
    if (text.length > 1024) throw new BridgeError("PAYLOAD_TOO_LARGE", "The request is too large", 413);
    let body; try { body = JSON.parse(text); } catch { throw new BridgeError("INVALID_JSON", "Invalid JSON"); }
    if (!body || typeof body !== "object" || Array.isArray(body) || Object.keys(body).some(key => !["request_id", "confirm_synthetic_registration"].includes(key))
      || typeof body.request_id !== "string" || !body.request_id || body.request_id.length > 200 || body.confirm_synthetic_registration !== true) throw new BridgeError("INVALID_INPUT", "Confirm a specific synthetic registration request");
    const binding = pilotBinding(env as unknown as Record<string, string>, user.userId);
    return Response.json(await new PaciRegistrationStore(env.DB).sync(user.userId, body.request_id, binding), { headers });
  } catch (error) { return fail(error); }
}
