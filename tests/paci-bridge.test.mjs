import test from "node:test";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PaciRegistrationStore } from "../lib/paci-registration-store.js";
import { PaciBridgeStore } from "../lib/paci-bridge-store.js";
import { canonicalJson, fingerprint, projectChecks, requireSameOrigin, validateBridgeCommand } from "../lib/paci-bridge-core.js";
import { createInitialState, extractSyntheticFacts } from "../lib/workflow-core.js";

function d1Adapter(sqlite) {
  const db = {
    beforeBatch: null,
    failAt: -1,
    prepare(sql) {
      const make = (values) => ({
        sql, values,
        bind: (...next) => make(next),
        first: async () => sqlite.prepare(sql).get(...values) ?? null,
        run: async () => sqlite.prepare(sql).run(...values),
        all: async () => ({ results: sqlite.prepare(sql).all(...values) }),
      });
      return make([]);
    },
    async batch(statements) {
      if (db.beforeBatch) { const hook = db.beforeBatch; db.beforeBatch = null; hook(); }
      sqlite.exec("BEGIN");
      try {
        const result = statements.map((statement, index) => {
          if (index === db.failAt) throw new Error("Injected persistence failure");
          return sqlite.prepare(statement.sql).run(...statement.values);
        });
        sqlite.exec("COMMIT");
        return result;
      } catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    },
  };
  return db;
}

function fixture(t, file = ":memory:") {
  const sqlite = new DatabaseSync(file);
  t.after(() => { try { sqlite.close(); } catch { /* already closed */ } });
  const directory = new URL("../drizzle/", import.meta.url);
  for (const name of readdirSync(directory).filter((name) => name.endsWith(".sql")).sort()) sqlite.exec(readFileSync(new URL(name, directory), "utf8"));
  const state = { ...createInitialState(), facts: extractSyntheticFacts(), confirmations: ["f1", "f2"] };
  for (const tenant of ["alice", "bob"]) sqlite.prepare("INSERT INTO outcome_cases (id, tenant_id, title, state_json, created_at, updated_at) VALUES (?, ?, 'Synthetic case', ?, ?, ?)").run(`buyer-pack:${tenant}`, tenant, JSON.stringify(state), "2026-10-26T10:00:00.000Z", "2026-10-26T10:00:00.000Z");
  const db = d1Adapter(sqlite);
  return { sqlite, db, store: new PaciBridgeStore(db, { clock: () => "2026-10-26T10:01:00.000Z" }) };
}
const save = (case_version = 1, idempotency_key = "save-1") => ({ action: "prepare_registration", case_version, idempotency_key });
const opens = (snapshot_id, key = "open-1") => ({ action: "open_challenge", snapshot_id, reason: "MISSING_CONTEXT", comment: "Check this synthetic period", idempotency_key: key });

test("registration saves a fixed private draft and outbox without inventing PACI evidence", async (t) => {
  const { store, sqlite } = fixture(t);
  const result = await store.command("alice", save());
  assert.equal(result.connection, "NOT_CONNECTED");
  assert.equal(result.requests[0].status, "PENDING");
  assert.equal(result.current_snapshot.verification, "UNVERIFIED");
  assert.equal(result.current_snapshot.claim_assessment, "UNRESOLVED");
  const exported = await store.exportSnapshot("alice", result.current_snapshot.id);
  assert.equal(exported.proof_package, null);
  assert.equal(exported.manifest.records[0].record.content.facts.length, 4);
  assert.equal(exported.manifest.records[0].record.summary.company_confirmed_count, 2);
  assert.equal(exported.manifest.log_checkpoint, null);
  assert.equal(exported.manifest.deployment_region, "UNVERIFIED");
  assert.equal(exported.manifest.recorded_at_source, "SYSTEM_CLOCK");
  exported.manifest.records[0].record.content.facts[0].value = "CHANGED";
  sqlite.prepare("UPDATE outcome_cases SET state_json = ?, version = 2 WHERE tenant_id = 'alice'").run(JSON.stringify(createInitialState()));
  const old = await store.exportSnapshot("alice", result.current_snapshot.id);
  assert.notEqual(old.manifest.records[0].record.content.facts[0].value, "CHANGED");
  assert.equal(old.manifest.case_version, 1);
});

test("auth is checked for reads, exports and idempotent command retries", async (t) => {
  const { store } = fixture(t);
  const result = await store.command("alice", save());
  await assert.rejects(store.read(""), { code: "AUTH_REQUIRED" });
  await assert.rejects(store.exportSnapshot("", result.current_snapshot.id), { code: "AUTH_REQUIRED" });
  await assert.rejects(store.command("", save()), { code: "AUTH_REQUIRED" });
});

test("tenant isolation applies to snapshots, challenges and idempotency keys", async (t) => {
  const { store } = fixture(t);
  const alice = await store.command("alice", save());
  assert.equal((await store.read("bob")).snapshots.length, 0);
  await assert.rejects(store.exportSnapshot("bob", alice.current_snapshot.id), { code: "SNAPSHOT_NOT_FOUND" });
  await assert.rejects(store.command("bob", opens(alice.current_snapshot.id)), { code: "SNAPSHOT_NOT_FOUND" });
  const bob = await store.command("bob", save());
  assert.notEqual(bob.current_snapshot.id, alice.current_snapshot.id);
  assert.equal(bob.snapshots.length, 1);
});

test("same-key retry returns the saved operation; same-key changed payload conflicts", async (t) => {
  const { store } = fixture(t);
  const first = await store.command("alice", save());
  const replay = await store.command("alice", save());
  assert.equal(replay.replayed, true);
  assert.equal(replay.current_snapshot.id, first.current_snapshot.id);
  assert.equal(replay.requests.length, 1);
  await assert.rejects(store.command("alice", save(2)), { code: "IDEMPOTENCY_CONFLICT" });
  assert.equal((await store.read("alice")).requests.length, 1);
});

test("a version is prepared once even when a new browser supplies a new key", async (t) => {
  const { store } = fixture(t);
  await store.command("alice", save());
  await assert.rejects(store.command("alice", save(1, "different-key")), { code: "VERSION_ALREADY_PREPARED" });
  const again = await store.read("alice");
  assert.equal(again.snapshots.length, 1);
  assert.equal(again.requests.length, 1);
});

test("stale source version is rejected before persistence", async (t) => {
  const { store } = fixture(t);
  await assert.rejects(store.command("alice", save(2)), { code: "VERSION_CONFLICT" });
  assert.equal((await store.read("alice")).requests.length, 0);
});

test("a source change between read and commit leaves neither snapshot nor queued request", async (t) => {
  const { store, db, sqlite } = fixture(t);
  db.beforeBatch = () => sqlite.exec("UPDATE outcome_cases SET version = 2 WHERE tenant_id = 'alice'");
  await assert.rejects(store.command("alice", save()), { code: "VERSION_CONFLICT" });
  const state = await store.read("alice");
  assert.equal(state.snapshots.length, 0);
  assert.equal(state.requests.length, 0);
});

test("persistence failure rolls snapshot and outbox back together", async (t) => {
  const { store, db } = fixture(t);
  db.failAt = 1;
  await assert.rejects(store.command("alice", save()), /Injected persistence failure/);
  const state = await store.read("alice");
  assert.equal(state.snapshots.length, 0);
  assert.equal(state.requests.length, 0);
});

test("challenge replies and withdrawal append history without adjudicating", async (t) => {
  const { store } = fixture(t);
  const saved = await store.command("alice", save());
  const opened = await store.command("alice", opens(saved.current_snapshot.id));
  const challenge = opened.challenges[0];
  const responded = await store.command("alice", { action: "record_response", challenge_id: challenge.id, comment: "A business explanation", idempotency_key: "reply-1" });
  assert.equal(responded.challenges[0].business_status, "RESPONDED");
  assert.equal(responded.challenges[0].paci_status, null);
  assert.deepEqual(responded.challenges[0].history.map((event) => event.kind), ["OPENED", "RESPONDED"]);
  assert.equal(responded.challenges[0].history[1].comment, "A business explanation");
  const withdrawn = await store.command("alice", { action: "withdraw_challenge", challenge_id: challenge.id, idempotency_key: "withdraw-1" });
  assert.equal(withdrawn.challenges[0].business_status, "WITHDRAWN");
  assert.equal(withdrawn.challenges[0].history.length, 3);
  await assert.rejects(store.command("alice", { action: "record_response", challenge_id: challenge.id, comment: "Too late", idempotency_key: "reply-2" }), { code: "CHALLENGE_CLOSED" });
  await assert.rejects(store.command("bob", { action: "withdraw_challenge", challenge_id: challenge.id, idempotency_key: "bob-withdraw" }), { code: "CHALLENGE_NOT_FOUND" });
});

test("concurrent challenge transitions use the history sequence as a compare-and-set guard", async (t) => {
  const { store, db, sqlite } = fixture(t);
  const saved = await store.command("alice", save());
  const opened = await store.command("alice", opens(saved.current_snapshot.id));
  const id = opened.challenges[0].id;
  db.beforeBatch = () => sqlite.prepare("INSERT INTO paci_challenge_events (id, tenant_id, case_id, challenge_id, kind, sequence, actor_id, comment, created_at) VALUES ('concurrent', 'alice', 'buyer-pack:alice', ?, 'WITHDRAWN', 2, 'alice', '', '2026-10-26T10:02:00.000Z')").run(id);
  await assert.rejects(store.command("alice", { action: "record_response", challenge_id: id, comment: "Concurrent reply", idempotency_key: "reply-race" }), { code: "VERSION_CONFLICT" });
  const result = await store.read("alice");
  assert.equal(result.challenges[0].business_status, "WITHDRAWN");
  assert.equal(result.challenges[0].response_count, 0);
  assert.equal(result.requests.length, 2);
});

test("new case versions do not retarget an existing challenge or rewrite its draft", async (t) => {
  const { store, sqlite } = fixture(t);
  const first = await store.command("alice", save());
  sqlite.exec("UPDATE outcome_cases SET version = 2 WHERE tenant_id = 'alice'");
  const second = await store.command("alice", save(2, "save-2"));
  assert.equal(second.snapshots.length, 2);
  const challenged = await store.command("alice", opens(first.current_snapshot.id));
  assert.equal(challenged.challenges[0].snapshot_id, first.current_snapshot.id);
  const request = sqlite.prepare("SELECT payload_json FROM paci_bridge_requests WHERE operation = 'OPEN_CHALLENGE'").get();
  assert.equal(JSON.parse(request.payload_json).target_case_version, 1);
});

test("tampered local snapshot fails export rather than inheriting an earlier valid label", async (t) => {
  const { store, sqlite } = fixture(t);
  const state = await store.command("alice", save());
  sqlite.prepare("UPDATE paci_dossier_snapshots SET manifest_json = '{}' WHERE id = ?").run(state.current_snapshot.id);
  await assert.rejects(store.exportSnapshot("alice", state.current_snapshot.id), { code: "SNAPSHOT_INTEGRITY_FAILED" });
});

test("saved drafts and challenge history survive a new store and database connection", async (t) => {
  const directory = mkdtempSync(join(tmpdir(), "dossivo-bridge-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const file = join(directory, "d1.sqlite");
  const { store, sqlite } = fixture(t, file);
  const state = await store.command("alice", save());
  await store.command("alice", opens(state.current_snapshot.id));
  sqlite.close();
  const reopened = new DatabaseSync(file);
  t.after(() => reopened.close());
  const fresh = await new PaciBridgeStore(d1Adapter(reopened)).read("alice");
  assert.equal(fresh.current_snapshot.id, state.current_snapshot.id);
  assert.equal(fresh.challenges[0].history[0].kind, "OPENED");
});

test("no client command can choose a trusted source, tenant, verdict or execution identity", () => {
  for (const field of ["source", "tenant_id", "executor", "independent", "paci_status", "visible_material"]) assert.throws(() => validateBridgeCommand({ ...save(), [field]: "forged" }), { code: "INVALID_INPUT" });
  assert.throws(() => validateBridgeCommand({ action: "adjudicate", idempotency_key: "a" }), { code: "INVALID_ACTION" });
  assert.throws(() => validateBridgeCommand({ ...opens("draft"), comment: "x".repeat(1001) }), { code: "INVALID_INPUT" });
});

test("canonical JSON preserves __proto__ data and rejects non-finite values", async () => {
  const before = JSON.parse('{"__proto__":{"amount":1},"b":2}');
  const after = JSON.parse('{"__proto__":{"amount":9},"b":2}');
  assert.notEqual(await fingerprint(before), await fingerprint(after));
  assert.equal(canonicalJson({ b: 2, a: 1 }), canonicalJson({ a: 1, b: 2 }));
  assert.throws(() => canonicalJson({ amount: NaN }), { code: "INVALID_JSON" });
});

test("verification display is version-bound and a failed check remains explicit", () => {
  const checks = [{ version: 1, kind: "INTEGRITY", result: "PASSED" }, { version: 1, kind: "INTEGRITY", result: "FAILED" }, { version: 2, kind: "INTEGRITY", result: "PASSED" }];
  assert.equal(projectChecks(checks, 1).result, "FAILED");
  assert.equal(projectChecks(checks, 2).result, "PASSED");
  assert.equal(projectChecks(checks, 3).result, "UNVERIFIED");
});

test("browser writes reject cross-origin and missing-origin requests", () => {
  requireSameOrigin(new Request("https://dossivo.example/api/paci-bridge", { headers: { origin: "https://dossivo.example" } }));
  assert.throws(() => requireSameOrigin(new Request("https://dossivo.example/api/paci-bridge", { headers: { origin: "https://other.example" } })), { code: "ORIGIN_DENIED" });
  assert.throws(() => requireSameOrigin(new Request("https://dossivo.example/api/paci-bridge")), { code: "ORIGIN_DENIED" });
});

test("snapshot review and comparison preserve frozen contents and isolate tenants", async (t) => {
  const { store, sqlite } = fixture(t);
  const first = await store.command("alice", save());
  const beforeId = first.current_snapshot.id;
  const state = JSON.parse(sqlite.prepare("SELECT state_json FROM outcome_cases WHERE tenant_id='alice'").get().state_json);
  state.scope.product = "Changed synthetic product";
  state.facts[0].value = "A corrected synthetic value";
  state.confirmations = [];
  sqlite.prepare("UPDATE outcome_cases SET state_json=?, version=2 WHERE tenant_id='alice'").run(JSON.stringify(state));
  const second = await store.command("alice", save(2,"save-2"));
  const afterId = second.current_snapshot.id;
  const comparison = await store.compareSnapshots("alice", beforeId, afterId);
  assert.equal(comparison.verification,"UNVERIFIED");
  assert.equal(comparison.proof_package,null);
  assert.equal(comparison.before.digest_check,"MATCHED_LOCAL_CONTENT");
  assert.notEqual(comparison.before.scope.product,comparison.after.scope.product);
  assert.ok(comparison.changes.some(c=>c.group==='scope' && c.field==='product'));
  assert.ok(comparison.changes.some(c=>c.group==='facts' && c.field==='confirmed_by_company' && c.before===true && c.after===false));
  assert.equal(comparison.before.facts[0].value, extractSyntheticFacts()[0].value);
  await assert.rejects(store.reviewSnapshot("bob",beforeId),{code:"SNAPSHOT_NOT_FOUND"});
  await assert.rejects(store.compareSnapshots("bob",beforeId,afterId),{code:"SNAPSHOT_NOT_FOUND"});
  await assert.rejects(store.compareSnapshots("alice",beforeId,"missing"),{code:"SNAPSHOT_NOT_FOUND"});
  await assert.rejects(store.reviewSnapshot("",beforeId),{code:"AUTH_REQUIRED"});
  assert.deepEqual((await store.compareSnapshots("alice",beforeId,beforeId)).changes,[]);
  comparison.before.facts[0].value="mutated client projection";
  assert.equal((await store.reviewSnapshot("alice",beforeId)).facts[0].value,extractSyntheticFacts()[0].value);
});

test("comparison fails closed if either fixed snapshot digest changes", async (t) => {
  const { store, sqlite }=fixture(t);
  const first=await store.command("alice",save());
  const id=first.current_snapshot.id;
  sqlite.prepare("UPDATE paci_dossier_snapshots SET content_hash='invalid' WHERE id=?").run(id);
  await assert.rejects(store.reviewSnapshot("alice",id),{code:"SNAPSHOT_INTEGRITY_FAILED"});
  await assert.rejects(store.compareSnapshots("alice",id,id),{code:"SNAPSHOT_INTEGRITY_FAILED"});
});

const pilot = {origin:"https://paci.internal.example",tenant_id:"paci-alice",service_actor_id:"dossivo-service",token:"synthetic-test-token"};
function fakePaci() {
  const receipts=new Map();let posts=0;
  const fetch=async(url,opts)=>{
    const headers={"paci-protocol":"paci-http/0.4"};
    if(opts.method==="GET") {const saved=receipts.get(decodeURIComponent(url.split("/").at(-1)));return new Response(JSON.stringify(saved?{protocol:"paci-http/0.4",result:saved}:{}),{status:saved?200:404,headers});}
    posts++;const input=JSON.parse(opts.body);const key=opts.headers["Idempotency-Key"];
    const result={record_id:"paci-record-1",version:1,kind:"MATERIAL",visibility:"PRIVATE",disclosed:"CONTENT",erased:false,status:{source:"SELF_REPORTED",coverage:"PARTIAL"},content:input.content,summary:input.summary};
    const receipt={operation_id:"operation-1",idempotency_key:key,request_digest:await fingerprint({op:"registerRecord",payload:input}),digest_alg:"sha256/paci-canonical-json-1",first_received_at:"2026-10-27T08:00:00.000Z",replayed:false,result_ref:{type:"record",id:result.record_id,version:1}};
    receipts.set(key,{receipt,result});return new Response(JSON.stringify({protocol:"paci-http/0.4",receipt,result}),{status:201,headers});
  };
  return{fetch,posts:()=>posts};
}
test("dispatcher persists exact mapping and recovers receipt across store restarts without duplicating registration",async(t)=>{
 const {store,db,sqlite}=fixture(t);const saved=await store.command("alice",save());const id=saved.requests[0].id;const upstream=fakePaci();
 const dispatcher=new PaciRegistrationStore(db);
 assert.deepEqual(await dispatcher.sync("alice",id,pilot,{fetch:upstream.fetch}),{registration:"REGISTERED",verification:"UNVERIFIED",proof_package:null});
 assert.equal(upstream.posts(),1);
 const delivery=(await dispatcher.listDeliveries("alice"))[0];assert.equal(delivery.record_id,"paci-record-1");assert.equal(delivery.case_version,1);
 assert.equal(sqlite.prepare("SELECT status FROM paci_bridge_requests WHERE id=?").get(id).status,"REGISTERED");
 await new PaciRegistrationStore(db).sync("alice",id,pilot,{fetch:upstream.fetch});assert.equal(upstream.posts(),1);
 assert.deepEqual(await dispatcher.listDeliveries("bob"),[]);
 await assert.rejects(dispatcher.sync("bob",id,pilot,{fetch:upstream.fetch}),{code:"REQUEST_NOT_FOUND"});
 await assert.rejects(dispatcher.sync("alice",id,{...pilot,tenant_id:"another"},{fetch:upstream.fetch}),{code:"PACI_BINDING_OR_PAYLOAD_CHANGED"});
 const persisted=sqlite.prepare("SELECT envelope_json, receipt_json FROM paci_registration_deliveries").get();assert.ok(!JSON.stringify(persisted).includes(pilot.token));
});
test("disabled or failed transport never marks a pending request registered",async(t)=>{
 const{store,db,sqlite}=fixture(t);const saved=await store.command("alice",save());const id=saved.requests[0].id;const dispatcher=new PaciRegistrationStore(db);
 await assert.rejects(dispatcher.sync("alice",id,null),{code:"PACI_NOT_CONFIGURED"});
 await assert.rejects(dispatcher.sync("alice",id,pilot,{fetch:async()=>{throw Error("network lost");}}),{code:"PACI_NETWORK_UNCONFIRMED"});
 assert.equal((await dispatcher.listDeliveries("alice"))[0].state,"UNCONFIRMED");
 assert.equal(sqlite.prepare("SELECT status FROM paci_bridge_requests").get().status,"PENDING");
 const upstream=fakePaci();await dispatcher.sync("alice",id,pilot,{fetch:upstream.fetch});assert.equal(upstream.posts(),1);
});
test("upstream success followed by local database failure recovers the same receipt on retry",async(t)=>{
 const{store,db,sqlite}=fixture(t);const saved=await store.command("alice",save());const id=saved.requests[0].id;const dispatcher=new PaciRegistrationStore(db);const upstream=fakePaci();
 db.failAt=0;
 await assert.rejects(dispatcher.sync("alice",id,pilot,{fetch:upstream.fetch}));
 assert.equal(sqlite.prepare("SELECT status FROM paci_bridge_requests").get().status,"PENDING");
 assert.equal(sqlite.prepare("SELECT record_id FROM paci_registration_deliveries").get().record_id,null);
 db.failAt=-1;await dispatcher.sync("alice",id,pilot,{fetch:upstream.fetch});assert.equal(upstream.posts(),1);
});
