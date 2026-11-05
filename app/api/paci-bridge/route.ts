import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { BridgeError, requireSameOrigin } from "@/lib/paci-bridge-core";
import { PaciBridgeStore } from "@/lib/paci-bridge-store";

export const dynamic = "force-dynamic";
const PRIVATE_HEADERS = { "cache-control": "private, no-store", "x-content-type-options": "nosniff" };

function failure(error: unknown) {
  if (error instanceof BridgeError) return Response.json({ error: error.message, code: error.code }, { status: error.status, headers: PRIVATE_HEADERS });
  return Response.json({ error: "The preparation workspace is temporarily unavailable", code: "BRIDGE_UNAVAILABLE" }, { status: 503, headers: PRIVATE_HEADERS });
}

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in is required", code: "AUTH_REQUIRED" }, { status: 401, headers: PRIVATE_HEADERS });
  try {
    const store = new PaciBridgeStore(env.DB);
    const url = new URL(request.url);
    const view = url.searchParams.get("view");
    if (view !== null) {
      const identifier = (name: string) => {
        const value = url.searchParams.get(name);
        if (!value || value.length > 200) throw new BridgeError("INVALID_INPUT", `${name} is required`);
        return value;
      };
      if (view === "snapshot") return Response.json(await store.reviewSnapshot(user.userId, identifier("snapshot_id")), { headers: PRIVATE_HEADERS });
      if (view === "compare") return Response.json(await store.compareSnapshots(user.userId, identifier("before"), identifier("after")), { headers: PRIVATE_HEADERS });
      throw new BridgeError("INVALID_INPUT", "Unsupported view");
    }
    if (url.searchParams.get("export") === "snapshot") {
      const snapshotId = url.searchParams.get("snapshot_id");
      if (!snapshotId || snapshotId.length > 200) throw new BridgeError("INVALID_INPUT", "snapshot_id is required");
      const draft = await store.exportSnapshot(user.userId, snapshotId);
      return Response.json(draft, { headers: { ...PRIVATE_HEADERS, "content-disposition": 'attachment; filename="dossivo-registration-draft.json"' } });
    }
    return Response.json(await store.read(user.userId), { headers: PRIVATE_HEADERS });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in is required", code: "AUTH_REQUIRED" }, { status: 401, headers: PRIVATE_HEADERS });
  try {
    requireSameOrigin(request);
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new BridgeError("INVALID_CONTENT_TYPE", "JSON is required", 415);
    const text = await request.text();
    if (text.length > 16_384) throw new BridgeError("PAYLOAD_TOO_LARGE", "The request is too large", 413);
    let input: unknown;
    try { input = JSON.parse(text); } catch { throw new BridgeError("INVALID_JSON", "Invalid JSON"); }
    return Response.json(await new PaciBridgeStore(env.DB).command(user.userId, input), { headers: PRIVATE_HEADERS });
  } catch (error) { return failure(error); }
}
