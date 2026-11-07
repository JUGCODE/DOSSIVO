import {env} from 'cloudflare:workers';
import {ProofVerificationStore,verificationConfig} from '@/lib/proof-verification';
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { getCurrentUser } from "@/app/auth";
import { getDb } from "@/db";
import { outcomeCases, proofAccessLogs, proofLinks } from "@/db/schema";

export const dynamic = "force-dynamic";

function privateJson(body: unknown, init: ResponseInit = {}) {
  return Response.json(body, { ...init, headers: { "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
}

function frozenObject(value: string): Record<string, unknown> | null {
  try {
    const parsed: unknown = JSON.parse(value);
    return typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) && Object.keys(parsed).length
      ? parsed as Record<string, unknown> : null;
  } catch { return null; }
}

export async function GET(_request: Request, context: { params: Promise<{ token: string }> }) {
  const { token: suppliedToken } = await context.params;
  let token=suppliedToken;
  let verification: Awaited<ReturnType<ProofVerificationStore["signedPresentation"]>> = null;
  if(suppliedToken.includes('.')){
    const c=verificationConfig(env);
    if(!c||new URL(_request.url).hostname!==c.domain)return privateJson({error:'Proof unavailable.'},{status:404});
    const resolved=await new ProofVerificationStore(env.DB).resolveSignedProof(suppliedToken,c);
    if(!resolved)return privateJson({error:'Proof unavailable.'},{status:404});
    verification=await new ProofVerificationStore(env.DB).signedPresentation(suppliedToken,c);
    if(!verification)return privateJson({error:'Proof unavailable.'},{status:404});
    token=resolved;
  }
  const db = getDb();
  const [link] = await db.select().from(proofLinks).where(and(
    eq(proofLinks.token, token),
    isNull(proofLinks.revokedAt),
    gt(proofLinks.expiresAt, new Date().toISOString()),
    gt(proofLinks.remainingViews, 0),
  )).limit(1);
  if (!link) return privateJson({ error: "This access link is expired, revoked, or exhausted." }, { status: 410 });

  const [record] = await db.select({ id: outcomeCases.id }).from(outcomeCases).where(eq(outcomeCases.id, link.caseId)).limit(1);
  if (!record) return privateJson({ error: "Evidence card unavailable." }, { status: 404 });
  const snapshotCards = frozenObject(link.cardSnapshotJson);
  const snapshotScope = frozenObject(link.scopeSnapshotJson);
  if (!snapshotCards || !snapshotScope) return privateJson({
    error: "This link has no frozen evidence snapshot. Ask the sender to issue a new link.",
    code: "FROZEN_SNAPSHOT_REQUIRED",
  }, { status: 410 });

  const [consumed] = await db.update(proofLinks).set({ remainingViews: link.remainingViews - 1 }).where(and(
    eq(proofLinks.token, token),
    eq(proofLinks.remainingViews, link.remainingViews),
    isNull(proofLinks.revokedAt),
    gt(proofLinks.expiresAt, sql`strftime('%Y-%m-%dT%H:%M:%fZ', 'now')`),
    gt(proofLinks.remainingViews, 0),
  )).returning();
  if (!consumed) return privateJson({ error: "This access link is no longer available. It may be expired, revoked, or already consumed." }, { status: 409 });
  const viewedAt = new Date().toISOString();
  const user = await getCurrentUser();
  await db.insert(proofAccessLogs).values({
    id: crypto.randomUUID(), token, caseId: link.caseId,
    visitorLabel: user ? `Authenticated account: ${user.userId}` : "Unknown visitor (identity unverified)",
    cardVersion: link.cardVersion, viewedAt,
  });
  return privateJson({
    card: snapshotCards,
    scope: snapshotScope,
    recipient: link.recipient,
    expiresAt: link.expiresAt,
    remainingViews: consumed.remainingViews,
    cardVersion: link.cardVersion,
    viewedAt,
    syntheticDemo: true,
    verification,
  });
}
