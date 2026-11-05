import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import * as workflow from "../lib/workflow-core.js";
import * as demoSession from "../lib/demo-session.js";
import * as bridgeCore from "../lib/paci-bridge-core.js";

const require = createRequire(import.meta.url);
const { drizzle } = require("drizzle-orm/sqlite-proxy");
const origin = "https://dossivo.example";

function loadTs(path, replacements = {}) {
  const { outputText } = ts.transpileModule(readFileSync(new URL(path, import.meta.url), "utf8"), {
    fileName: path,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  });
  const module = { exports: {} };
  const localRequire = (name) => Object.hasOwn(replacements, name) ? replacements[name] : require(name);
  new Function("require", "module", "exports", outputText)(localRequire, module, module.exports);
  return module.exports;
}

const schema = loadTs("../db/schema.ts");

function fixture(context) {
  const sqlite = new DatabaseSync(":memory:");
  context.after(() => sqlite.close());
  const migrations = new URL("../drizzle/", import.meta.url);
  for (const file of readdirSync(migrations).filter((file) => file.endsWith(".sql")).sort()) {
    sqlite.exec(readFileSync(new URL(file, migrations), "utf8"));
  }
  const database = drizzle(async (query, parameters, method) => {
    const statement = sqlite.prepare(query);
    if (method === "run") { statement.run(...parameters); return { rows: [] }; }
    statement.setReturnArrays(true);
    return { rows: method === "get" ? statement.get(...parameters) : statement.all(...parameters) };
  });
  let activeUser = null;
  const replacements = {
    "@/db": { getDb: () => database },
    "@/db/schema": schema,
    "@/app/chatgpt-auth": { getChatGPTUser: async () => activeUser },
    "@/lib/workflow-core": workflow,
    "@/lib/demo-session": demoSession,
    "@/lib/paci-bridge-core": bridgeCore,
  };
  const caseRoute = loadTs("../app/api/case/route.ts", replacements);
  const evidenceRoute = loadTs("../app/api/evidence/route.ts", replacements);
  const setUser = (userId) => { activeUser = userId ? { userId, email: "synthetic@example.test" } : null; };
  const get = (cookie = "", userId = null) => {
    setUser(userId);
    return caseRoute.GET(new Request(`${origin}/api/case`, { headers: cookie ? { cookie } : {} }));
  };
  const post = (cookie, payload, userId = null, extraHeaders = {}) => {
    setUser(userId);
    return caseRoute.POST(new Request(`${origin}/api/case`, {
      method: "POST",
      headers: { origin, "content-type": "application/json", ...(cookie ? { cookie } : {}), ...extraHeaders },
      body: typeof payload === "string" ? payload : JSON.stringify(payload),
    }));
  };
  const evidence = (cookie = "", userId = null) => {
    setUser(userId);
    const query = new URLSearchParams({ at: "2026-04-01", entityType: "supplier", entityId: "supplier-demo-a", evidenceType: "Recruitment policy" });
    return evidenceRoute.GET(new Request(`${origin}/api/evidence?${query}`, { headers: cookie ? { cookie } : {} }));
  };
  return { sqlite, get, post, evidence };
}

function cookieFrom(response) {
  return response.headers.get("set-cookie")?.split(";")[0] ?? "";
}

function assertPrivate(response) {
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
}

test("two anonymous browsers cannot read, modify or reset each other's cases and evidence", async (context) => {
  const { get, post, evidence } = fixture(context);
  const firstResponse = await get();
  const secondResponse = await get();
  assert.equal(firstResponse.status, 200);
  assertPrivate(firstResponse);
  const firstCookie = cookieFrom(firstResponse);
  const secondCookie = cookieFrom(secondResponse);
  assert.notEqual(firstCookie, secondCookie);
  const first = await firstResponse.json();
  const second = await secondResponse.json();
  assert.notEqual(first.case.tenantId, second.case.tenantId);
  assert.match(first.case.tenantId, /^demo-session-v1:[a-f0-9]{64}$/);

  assert.equal((await post(firstCookie, { action: "save_answers", idempotencyKey: "answers", data: { answers: { hours: "有完整汇总" } } })).status, 200);
  assert.equal((await post(secondCookie, { action: "save_answers", idempotencyKey: "answers", data: { answers: { hours: "尚未准备" } } })).status, 200);
  assert.equal((await post(secondCookie, { action: "reset", idempotencyKey: "reset" })).status, 200);
  const refreshedFirst = await get(firstCookie);
  assert.equal(refreshedFirst.headers.get("set-cookie"), null);
  assert.equal((await refreshedFirst.json()).state.answers.hours, "有完整汇总");
  assert.deepEqual((await (await get(secondCookie)).json()).state.answers, {});

  assert.equal((await post(firstCookie, { action: "extract", idempotencyKey: "extract" })).status, 200);
  const firstEvidence = await evidence(firstCookie);
  assertPrivate(firstEvidence);
  assert.equal((await firstEvidence.json()).evidence.tenantId, first.case.tenantId);
  assert.equal((await (await evidence(secondCookie)).json()).evidence, null);
});

test("authenticated accounts stay distinct from each other and from a supplied guest session", async (context) => {
  const { get, post, evidence } = fixture(context);
  const guest = await get();
  const cookie = cookieFrom(guest);
  const first = await get(cookie, "account-one");
  const second = await get(cookie, "account-two");
  assert.equal(first.headers.get("set-cookie"), null);
  assert.equal((await first.json()).case.tenantId, "account-one");
  assert.equal((await second.json()).case.tenantId, "account-two");
  assert.equal((await post("", { action: "save_answers", idempotencyKey: "answers", data: { answers: { hours: "有完整汇总" } } }, "account-one")).status, 200);
  assert.equal((await post("", { action: "extract", idempotencyKey: "extract" }, "account-one")).status, 200);
  assert.equal((await (await get(cookie, "account-one")).json()).state.answers.hours, "有完整汇总");
  assert.deepEqual((await (await get(cookie, "account-two")).json()).state.answers, {});
  assert.deepEqual((await (await get(cookie)).json()).state.answers, {});
  assert.equal((await (await evidence(cookie, "account-one")).json()).evidence.tenantId, "account-one");
  assert.equal((await (await evidence(cookie, "account-two")).json()).evidence, null);
  assert.equal((await (await evidence(cookie)).json()).evidence, null);
});

test("legacy shared records are neither returned nor modified by new or malformed guest sessions", async (context) => {
  const { sqlite, get, post, evidence } = fixture(context);
  const now = new Date().toISOString();
  const state = { ...workflow.createInitialState(), answers: { hours: "legacy-only-value" } };
  sqlite.prepare("INSERT INTO outcome_cases (id, tenant_id, title, state_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)")
    .run("buyer-pack:local-demo-owner", "local-demo-owner", "Legacy demo", JSON.stringify(state), now, now);
  sqlite.prepare("INSERT INTO evidence_versions (id, tenant_id, entity_type, entity_id, evidence_type, version, valid_from, payload_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run("legacy-evidence", "local-demo-owner", "supplier", "supplier-demo-a", "Recruitment policy", 1, "2026-01-01", '{"legacy":true}', now);
  for (const cookie of ["", `${demoSession.DEMO_SESSION_COOKIE}=local-demo-owner`, "dossivo_demo_session=local-demo-owner"]) {
    const opened = await get(cookie);
    assert.equal(opened.status, 200);
    assert.ok(cookieFrom(opened));
    const body = await opened.json();
    assert.notEqual(body.case.tenantId, "local-demo-owner");
    assert.deepEqual(body.state.answers, {});
    const deniedPost = await post(cookie, { action: "reset", idempotencyKey: "reset-legacy" });
    assert.equal(deniedPost.status, 401);
    assertPrivate(deniedPost);
    const deniedRead = await evidence(cookie);
    assert.equal(deniedRead.status, 401);
    assertPrivate(deniedRead);
  }
  assert.equal(JSON.parse(sqlite.prepare("SELECT state_json FROM outcome_cases WHERE tenant_id = 'local-demo-owner'").get().state_json).answers.hours, "legacy-only-value");
});

test("POST requires an existing valid session and never issues a new guest cookie", async (context) => {
  const { sqlite, get, post } = fixture(context);
  const denied = await post("", { action: "reset", idempotencyKey: "no-session" });
  assert.equal(denied.status, 401);
  assert.equal((await denied.json()).code, "DEMO_SESSION_REQUIRED");
  assert.equal(denied.headers.get("set-cookie"), null);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM outcome_cases").get().count, 0);
  const opened = await get();
  const saved = await post(cookieFrom(opened), { action: "reset", idempotencyKey: "session-present" });
  assert.equal(saved.status, 200);
  assertPrivate(saved);
  assert.equal(saved.headers.get("set-cookie"), null);
});

test("cross-site, non-JSON, oversized and overlong input is rejected before database mutation", async (context) => {
  const { sqlite, get, post } = fixture(context);
  const opened = await get();
  const cookie = cookieFrom(opened);
  const command = { action: "reset", idempotencyKey: "reject" };
  const responses = [
    [await post(cookie, command, null, { origin: "https://other.example" }), 403],
    [await post(cookie, command, null, { "content-type": "text/plain" }), 415],
    [await post(cookie, { ...command, data: { padding: "x".repeat(16_384) } }), 413],
    [await post(cookie, { ...command, idempotencyKey: "x".repeat(129) }), 400],
    [await post(cookie, { action: "authorize_link", idempotencyKey: "reject", data: { recipient: "x".repeat(321) } }), 400],
    [await post(cookie, "{"), 400],
  ];
  for (const [response, status] of responses) {
    assert.equal(response.status, status);
    assertPrivate(response);
  }
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM workflow_steps").get().count, 0);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS count FROM proof_links").get().count, 0);
});
