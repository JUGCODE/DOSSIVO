import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import ts from "typescript";
import { buildCards, createInitialState } from "../lib/workflow-core.js";

const require = createRequire(import.meta.url);
const { drizzle } = require("drizzle-orm/sqlite-proxy");

// Execute the actual route with real Drizzle predicates and SQLite. Only the
// platform database binding and authenticated-account lookup are substituted.
function loadTs(path, replacements = {}, extra = "") {
  const source = readFileSync(new URL(path, import.meta.url), "utf8") + extra;
  const { outputText } = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const module = { exports: {} };
  const localRequire = (name) => Object.hasOwn(replacements, name) ? replacements[name] : require(name);
  new Function("require", "module", "exports", outputText)(localRequire, module, module.exports);
  return module.exports;
}

const schema = loadTs("../db/schema.ts");

function fixture(t, { beforeUpdate, user = null } = {}) {
  const sqlite = new DatabaseSync(":memory:");
  t.after(() => sqlite.close());
  const migrationDir = new URL("../drizzle/", import.meta.url);
  for (const file of readdirSync(migrationDir).filter((file) => file.endsWith(".sql")).sort()) {
    sqlite.exec(readFileSync(new URL(file, migrationDir), "utf8"));
  }
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 3_600_000).toISOString();
  const cards = buildCards();
  cards.en.title = "Frozen authorised version";
  const scope = { product: "Frozen product", facility: "Frozen factory", period: "Frozen period" };
  const latest = { ...createInitialState(), cards: buildCards(), scope: { ...scope, product: "A different current product" } };
  sqlite.prepare("INSERT INTO outcome_cases (id, tenant_id, title, state_json, created_at, updated_at) VALUES ('case-1', 'owner', 'Demo', ?, ?, ?)").run(JSON.stringify(latest), now, now);
  sqlite.prepare("INSERT INTO proof_links (token, case_id, recipient, expires_at, remaining_views, card_version, card_snapshot_json, scope_snapshot_json, created_at) VALUES ('link-1', 'case-1', 'intended-buyer@example.test', ?, 3, 1, ?, ?, ?)").run(expiresAt, JSON.stringify(cards), JSON.stringify(scope), now);
  let updateHook = beforeUpdate;
  const db = drizzle(async (query, params, method) => {
    if (/^update "proof_links"/i.test(query) && updateHook) {
      const hook = updateHook;
      updateHook = null;
      hook(sqlite);
    }
    const statement = sqlite.prepare(query);
    if (method === "run") { statement.run(...params); return { rows: [] }; }
    statement.setReturnArrays(true);
    return { rows: method === "get" ? statement.get(...params) : statement.all(...params) };
  });
  const route = loadTs("../app/api/proof/[token]/route.ts", {
    "@/db": { getDb: () => db },
    "@/db/schema": schema,
    "@/app/chatgpt-auth": { getChatGPTUser: async () => user },
  });
  const get = (headers = {}) => route.GET(new Request("https://example.test/api/proof/link-1", { headers }), { params: Promise.resolve({ token: "link-1" }) });
  return { sqlite, get, cards, scope, expiresAt };
}

test("a proof link returns only its frozen version and does not identify a visitor as its recipient", async (t) => {
  const { sqlite, get, cards, scope } = fixture(t);
  const response = await get({ "oai-authenticated-user-id": "unverified-header-value" });
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  const body = await response.json();
  assert.deepEqual(body.card, cards);
  assert.deepEqual(body.scope, scope);
  assert.equal(body.cardVersion, 1);
  assert.equal(body.remainingViews, 2);
  const log = sqlite.prepare("SELECT visitor_label FROM proof_access_logs").get();
  assert.equal(log.visitor_label, "Unknown visitor (identity unverified)");
});

test("legacy links without either frozen snapshot return 410 without consuming a view", async (t) => {
  for (const [column, value] of [["card_snapshot_json", "{}"], ["scope_snapshot_json", "{}"], ["card_snapshot_json", "not-json"]]) {
    await t.test(`${column}: ${value}`, async (subtest) => {
      const { sqlite, get } = fixture(subtest);
      sqlite.prepare(`UPDATE proof_links SET ${column} = ?`).run(value);
      const response = await get();
      assert.equal(response.status, 410);
      const error = await response.json();
      assert.match(error.error, /new link/i);
      assert.equal(error.code, "FROZEN_SNAPSHOT_REQUIRED");
      assert.equal(sqlite.prepare("SELECT remaining_views FROM proof_links").get().remaining_views, 3);
      assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM proof_access_logs").get().n, 0);
    });
  }
});

test("revocation or expiry between the initial read and consumption prevents disclosure", async (t) => {
  for (const [name, mutation] of [
    ["revocation", "UPDATE proof_links SET revoked_at = '2026-01-01T00:00:00.000Z'"],
    ["expiry", "UPDATE proof_links SET expires_at = '2000-01-01T00:00:00.000Z'"],
  ]) {
    await t.test(name, async (subtest) => {
      const { sqlite, get } = fixture(subtest, { beforeUpdate: (db) => db.exec(mutation) });
      const response = await get();
      assert.equal(response.status, 409);
      assert.equal((await response.json()).card, undefined);
      assert.equal(sqlite.prepare("SELECT remaining_views FROM proof_links").get().remaining_views, 3);
      assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM proof_access_logs").get().n, 0);
    });
  }
});

test("concurrent reads cannot both consume the same remaining-view value", async (t) => {
  const { sqlite, get } = fixture(t);
  const results = await Promise.all([get(), get()]);
  assert.deepEqual(results.map((response) => response.status).sort(), [200, 409]);
  assert.equal(sqlite.prepare("SELECT remaining_views FROM proof_links").get().remaining_views, 2);
  assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM proof_access_logs").get().n, 1);
});

test("a superseded viewer request cannot replace the new token's result or surface an old error", async (t) => {
  const { __requestProof: requestProof } = loadTs("../app/proof/[token]/viewer.tsx", {
    "@/components/country-flag": {}, "@/components/ui/tabs": {},
  }, "\nexports.__requestProof = requestProof;\n");
  const pending = [];
  t.mock.method(globalThis, "fetch", (url, options) => new Promise((resolve, reject) => pending.push({ url, options, resolve, reject })));
  const received = [];
  const failures = [];
  const oldController = new AbortController();
  const newController = new AbortController();
  const oldRequest = requestProof("old-token", oldController.signal, () => received.push("old"), () => failures.push("old"));
  oldController.abort();
  const newRequest = requestProof("new-token", newController.signal, () => received.push("new"), () => failures.push("new"));
  const payload = { card: buildCards(), scope: { product: "Product", facility: "Factory", period: "Period" }, recipient: "Buyer", expiresAt: "2030-01-01T00:00:00.000Z", remainingViews: 2, cardVersion: 1, syntheticDemo: true };
  assert.equal(pending[0].options.signal, oldController.signal);
  assert.match(pending[1].url, /new-token$/);
  pending[1].resolve(Response.json(payload));
  await newRequest;
  pending[0].resolve(Response.json(payload));
  await oldRequest;
  assert.deepEqual(received, ["new"]);
  assert.deepEqual(failures, []);
  const failedController = new AbortController();
  const oldFailure = requestProof("another-old-token", failedController.signal, () => received.push("stale"), () => failures.push("stale"));
  failedController.abort();
  pending[2].reject(new Error("Late failure"));
  await oldFailure;
  assert.deepEqual(failures, []);
  const missingRequest = requestProof("legacy-token", new AbortController().signal, () => received.push("legacy"), (reason) => failures.push(reason));
  pending[3].resolve(Response.json({ code: "FROZEN_SNAPSHOT_REQUIRED" }, { status: 410 }));
  await missingRequest;
  assert.deepEqual(failures, ["snapshot_required"]);
});
