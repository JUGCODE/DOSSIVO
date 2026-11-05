/* eslint-disable @typescript-eslint/no-explicit-any */
import { and, desc, eq, or } from "drizzle-orm";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { getDb } from "@/db";
import { agentRuns, evidenceVersions, outcomeCases, proofAccessLogs, proofLinks, workflowSteps } from "@/db/schema";
import { readDemoCommand, resolveDemoSession } from "@/lib/demo-session";
import { BridgeError } from "@/lib/paci-bridge-core";
import {
  buildCards,
  buildFindings,
  buildTasks,
  createInitialState,
  extractSyntheticFacts,
  nextStepFor,
  QUESTIONS,
  riskFromAnswers,
  verifiedExperts,
} from "@/lib/workflow-core";

export const dynamic = "force-dynamic";

type DemoState = Record<string, any> & {
  facts: ReturnType<typeof extractSyntheticFacts>;
  findings: ReturnType<typeof buildFindings>;
  tasks: ReturnType<typeof buildTasks>;
  confirmations: string[];
  answers: Record<string, string>;
  cards: Partial<ReturnType<typeof buildCards>>;
  experts: ReturnType<typeof verifiedExperts>;
  agents: string[][];
  scope: ReturnType<typeof createInitialState>["scope"];
};

function privateJson(body: unknown, init: ResponseInit = {}) {
  const responseHeaders = new Headers(init.headers);
  responseHeaders.set("cache-control", "private, no-store");
  responseHeaders.set("x-content-type-options", "nosniff");
  return Response.json(body, { ...init, headers: responseHeaders });
}

function caseIdFor(userId: string) {
  return `buyer-pack:${userId}`;
}

async function loadOrCreate(tenantId: string) {
  const caseId = caseIdFor(tenantId);
  const db = getDb();
  const [existing] = await db.select().from(outcomeCases).where(eq(outcomeCases.id, caseId)).limit(1);
  if (existing) return { row: existing, state: JSON.parse(existing.stateJson) as DemoState };

  const now = new Date().toISOString();
  const state: DemoState = createInitialState();
  const [row] = await db.insert(outcomeCases).values({
    id: caseId,
    tenantId,
    title: "Buyer Due Diligence Pack · Italy",
    status: "waiting_input",
    currentStep: 2,
    stateJson: JSON.stringify(state),
    createdAt: now,
    updatedAt: now,
  }).returning();
  return { row, state };
}

export async function GET(request: Request) {
  let sessionCookie: string | null = null;
  try {
    const user = await getChatGPTUser();
    const session = resolveDemoSession(request, user?.userId ?? null, true);
    if (!session) throw new BridgeError("DEMO_SESSION_REQUIRED", "Open the demo workspace before making changes", 401);
    sessionCookie = session.setCookie;
    const { row, state } = await loadOrCreate(session.tenantId);
    const accessLogs = await getDb().select().from(proofAccessLogs).where(eq(proofAccessLogs.caseId, row.id)).orderBy(desc(proofAccessLogs.viewedAt)).limit(20);
    return privateJson({ case: row, state: { ...state, accessLogs } }, {
      headers: sessionCookie ? { "set-cookie": sessionCookie } : {},
    });
  } catch (error) {
    return privateJson({ error: error instanceof Error ? error.message : "Unable to load case" }, {
      status: error instanceof BridgeError ? error.status : 500,
      headers: sessionCookie ? { "set-cookie": sessionCookie } : {},
    });
  }
}

export async function POST(request: Request) {
  try {
    const payload = await readDemoCommand(request) as {
      action: string;
      data?: Record<string, unknown>;
      idempotencyKey: string;
    };
    const user = await getChatGPTUser();
    const session = resolveDemoSession(request, user?.userId ?? null);
    if (!session) throw new BridgeError("DEMO_SESSION_REQUIRED", "Open the demo workspace before making changes", 401);
    const { row, state } = await loadOrCreate(session.tenantId);
    const db = getDb();
    const scopedIdempotencyKey = JSON.stringify([row.id, payload.idempotencyKey]);
    const [replayed] = await db.select().from(workflowSteps).where(and(
      eq(workflowSteps.caseId, row.id),
      or(eq(workflowSteps.idempotencyKey, scopedIdempotencyKey), eq(workflowSteps.idempotencyKey, payload.idempotencyKey)),
    )).limit(1);
    if (replayed) return privateJson({ case: row, state, replayed: true });

    const now = new Date().toISOString();
    const runs: Array<{ agentCode: string; output: unknown }> = [];

    switch (payload.action) {
      case "save_answers": {
        const answers = payload.data?.answers;
        if (!answers || typeof answers !== "object" || Array.isArray(answers)) return privateJson({ error: "answers are required" }, { status: 400 });
        const validatedAnswers: Record<string, string> = {};
        for (const [key, value] of Object.entries(answers)) {
          if (!QUESTIONS.some((question) => question.id === key) || typeof value !== "string" || value.length > 512) return privateJson({ error: "Invalid questionnaire answer" }, { status: 400 });
          validatedAnswers[key] = value;
        }
        state.answers = validatedAnswers;
        state.riskScore = riskFromAnswers(validatedAnswers);
        state.agents[1][2] = "completed";
        state.agents[2][2] = "ready";
        runs.push({ agentCode: "A02", output: { riskScore: state.riskScore, scope: state.scope } });
        break;
      }
      case "extract":
        state.facts = extractSyntheticFacts();
        state.evidenceContinuity = [
          { version: 1, validFrom: "2026-01-01", validUntil: "2026-06-30", evidenceType: "Recruitment policy", entityId: "supplier-demo-a" },
          { version: 2, validFrom: "2026-07-15", validUntil: "2026-12-31", evidenceType: "Recruitment policy", entityId: "supplier-demo-a" },
        ];
        if (!(await db.select({ id: evidenceVersions.id }).from(evidenceVersions).where(and(eq(evidenceVersions.tenantId, row.tenantId), eq(evidenceVersions.entityId, "supplier-demo-a"))).limit(1)).length) {
          await db.insert(evidenceVersions).values(state.evidenceContinuity.map((item: any) => ({
            id: crypto.randomUUID(), tenantId: row.tenantId, entityType: "supplier", entityId: item.entityId,
            evidenceType: item.evidenceType, version: item.version, validFrom: item.validFrom,
            validUntil: item.validUntil, productionFrom: item.validFrom, productionUntil: item.validUntil,
            payloadJson: JSON.stringify({ synthetic: true, source: `Recruitment_policy_demo_v${item.version}.pdf` }), createdAt: now,
          })));
        }
        state.agents[2][2] = "completed";
        state.agents[3][2] = "ready";
        runs.push({ agentCode: "A03", output: { facts: state.facts.length, sourceMode: "synthetic" } });
        break;
      case "create_tasks":
        state.findings = buildFindings(state.answers);
        state.tasks = buildTasks(state.findings);
        state.agents[3][2] = "completed";
        state.agents[4][2] = "ready";
        runs.push({ agentCode: "A04", output: { findings: state.findings.length, tasks: state.tasks.length } });
        break;
      case "confirm_facts":
        state.confirmations = state.facts.map((fact: { id: string }) => fact.id);
        state.confirmedAt = now;
        break;
      case "prepare_card":
        if (!state.facts.length || state.confirmations.length !== state.facts.length) throw new Error("Confirm all enterprise facts first");
        state.cards = buildCards();
        state.cardVersion = (state.cardVersion ?? 0) + 1;
        state.agents[4][2] = "completed";
        state.agents[5][2] = "ready";
        runs.push({ agentCode: "A05", output: { cardVersion: state.cardVersion, languages: ["zh", "en", "it"] } });
        break;
      case "authorize_link": {
        if (!state.cards.en) throw new Error("Prepare the card before disclosure");
        const recipient = String(payload.data?.recipient ?? "").trim();
        if (!recipient) throw new Error("Recipient is required");
        const token = crypto.randomUUID().replaceAll("-", "");
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        await db.insert(proofLinks).values({
          token,
          caseId: row.id,
          recipient,
          expiresAt,
          remainingViews: 3,
          cardVersion: state.cardVersion,
          cardSnapshotJson: JSON.stringify(state.cards),
          scopeSnapshotJson: JSON.stringify(state.scope),
          selectedFieldsJson: JSON.stringify(["card", "scope"]),
          createdAt: now,
        });
        state.link = { token, recipient, expiresAt, remainingViews: 3, cardVersion: state.cardVersion };
        break;
      }
      case "revoke_link": {
        const token = String(state.link?.token ?? "");
        if (!token) throw new Error("No active link to revoke");
        await db.update(proofLinks).set({ revokedAt: now }).where(and(eq(proofLinks.token, token), eq(proofLinks.caseId, row.id)));
        state.link = { ...state.link, revokedAt: now };
        break;
      }
      case "match_experts":
        state.experts = verifiedExperts();
        state.agents[5][2] = "completed";
        runs.push({ agentCode: "A06", output: { candidates: state.experts.length, directoryVersion: "demo-2026-09-18" } });
        break;
      case "reset":
        Object.keys(state).forEach((key) => delete state[key]);
        Object.assign(state, createInitialState());
        break;
      default:
        return privateJson({ error: "Unknown action" }, { status: 400 });
    }

    const nextStep = nextStepFor(state);
    const status = nextStep >= 8 && state.experts.length ? "ready_for_acceptance" : nextStep === 5 ? "waiting_approval" : "running";
    const nextVersion = row.version + 1;
    const [updatedCase] = await db.update(outcomeCases).set({
      stateJson: JSON.stringify(state),
      currentStep: nextStep,
      status,
      version: nextVersion,
      updatedAt: now,
    }).where(and(eq(outcomeCases.id, row.id), eq(outcomeCases.version, row.version))).returning();
    if (!updatedCase) return privateJson({ error: "The case changed; refresh before retrying" }, { status: 409 });

    await db.insert(workflowSteps).values({
      id: crypto.randomUUID(),
      caseId: row.id,
      stepKey: payload.action,
      status: "completed",
      idempotencyKey: scopedIdempotencyKey,
      detailJson: JSON.stringify({ synthetic: true, nextStep }),
      createdAt: now,
    });

    for (const run of runs) {
      await db.insert(agentRuns).values({
        id: crypto.randomUUID(),
        caseId: row.id,
        agentCode: run.agentCode,
        status: "completed",
        inputVersion: row.version,
        outputJson: JSON.stringify(run.output),
        costCents: 0,
        createdAt: now,
      });
    }

    return privateJson({
      case: { ...row, currentStep: nextStep, status, version: nextVersion, updatedAt: now },
      state,
    });
  } catch (error) {
    if (error instanceof BridgeError) return privateJson({ error: error.message, code: error.code }, { status: error.status });
    const message = error instanceof Error ? error.message : "Workflow action failed";
    const status = message.includes("UNIQUE") ? 409 : 500;
    return privateJson({ error: message }, { status });
  }
}
