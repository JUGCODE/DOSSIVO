import { and, desc, eq, gte, isNull, lte, or } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { evidenceVersions } from "@/db/schema";
import { resolveDemoSession } from "@/lib/demo-session";

export const dynamic = "force-dynamic";
const PRIVATE_HEADERS = { "cache-control": "private, no-store", "x-content-type-options": "nosniff" };

export async function GET(request: Request) {
  const user = await getChatGPTUser();
  const session = resolveDemoSession(request, user?.userId ?? null);
  if (!session) return Response.json({ error: "Open the demo workspace before reading evidence", code: "DEMO_SESSION_REQUIRED" }, { status: 401, headers: PRIVATE_HEADERS });
  const url = new URL(request.url);
  const at = url.searchParams.get("at");
  const entityType = url.searchParams.get("entityType");
  const entityId = url.searchParams.get("entityId");
  const evidenceType = url.searchParams.get("evidenceType");
  if (!at || !entityType || !entityId || !evidenceType || Number.isNaN(Date.parse(at))) {
    return Response.json({ error: "at, entityType, entityId and evidenceType are required" }, { status: 400, headers: PRIVATE_HEADERS });
  }
  const rows = await getDb().select().from(evidenceVersions).where(and(
    eq(evidenceVersions.tenantId, session.tenantId), eq(evidenceVersions.entityType, entityType),
    eq(evidenceVersions.entityId, entityId), eq(evidenceVersions.evidenceType, evidenceType),
    lte(evidenceVersions.validFrom, at), or(isNull(evidenceVersions.validUntil), gte(evidenceVersions.validUntil, at)),
  )).orderBy(desc(evidenceVersions.version), desc(evidenceVersions.createdAt)).limit(1);
  return Response.json({ at, evidence: rows[0] ?? null }, { headers: PRIVATE_HEADERS });
}
