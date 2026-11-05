import test from "node:test";
import assert from "node:assert/strict";
import { DEMO_BODY_LIMIT, DEMO_SESSION_COOKIE, DEMO_TENANT_PREFIX, readDemoCommand, resolveDemoSession } from "../lib/demo-session.js";

const origin = "https://dossivo.example";

function demoRequest(cookie = "", url = `${origin}/api/case`) {
  return new Request(url, { headers: cookie ? { cookie } : {} });
}

function commandRequest(payload = { action: "reset", idempotencyKey: "test-command" }, headers = {}) {
  return new Request(`${origin}/api/case`, {
    method: "POST",
    headers: { origin, "content-type": "application/json", ...headers },
    body: typeof payload === "string" ? payload : JSON.stringify(payload),
  });
}

test("anonymous browser sessions use different 256-bit tokens and secure, HTTP-only cookies", () => {
  const first = resolveDemoSession(demoRequest(), null, true);
  const second = resolveDemoSession(demoRequest(), null, true);
  assert.notEqual(first.tenantId, second.tenantId);
  assert.match(first.tenantId, new RegExp(`^${DEMO_TENANT_PREFIX}[a-f0-9]{64}$`));
  assert.match(first.setCookie, /; HttpOnly; SameSite=Lax; Path=\/; Secure$/);
  const persisted = resolveDemoSession(demoRequest(first.setCookie.split(";")[0]));
  assert.equal(persisted.tenantId, first.tenantId);
  assert.equal(persisted.setCookie, null);
  assert.doesNotMatch(resolveDemoSession(demoRequest("", "http://localhost/api/case"), null, true).setCookie, /; Secure/);
});

test("authenticated users retain their own tenant and never inherit an anonymous cookie identity", () => {
  const anonymous = resolveDemoSession(demoRequest(), null, true);
  const cookie = anonymous.setCookie.split(";")[0];
  const first = resolveDemoSession(demoRequest(cookie), "user-one");
  const second = resolveDemoSession(demoRequest(cookie), "user-two");
  assert.equal(first.tenantId, "user-one");
  assert.equal(second.tenantId, "user-two");
  assert.equal(first.setCookie, null);
  assert.notEqual(first.tenantId, anonymous.tenantId);
});

test("missing, legacy, malformed and duplicate cookies cannot select a shared or authenticated tenant", () => {
  const token = "a".repeat(64);
  for (const cookie of ["", "dossivo_demo_session=local-demo-owner", `${DEMO_SESSION_COOKIE}=local-demo-owner`,
    `${DEMO_SESSION_COOKIE}=user-one`, `${DEMO_SESSION_COOKIE}=${"a".repeat(63)}`,
    `${DEMO_SESSION_COOKIE}=${"A".repeat(64)}`, `${DEMO_SESSION_COOKIE}=${token}; ${DEMO_SESSION_COOKIE}=${token}`]) {
    assert.equal(resolveDemoSession(demoRequest(cookie)), null);
    const created = resolveDemoSession(demoRequest(cookie), null, true);
    assert.ok(created.setCookie);
    assert.notEqual(created.tenantId, "local-demo-owner");
    assert.notEqual(created.tenantId, "user-one");
  }
  assert.equal(resolveDemoSession(demoRequest(`${DEMO_SESSION_COOKIE}=${token}`)).tenantId, `${DEMO_TENANT_PREFIX}${token}`);
});

test("demo commands require same-origin JSON and reject malformed or invalid inputs", async () => {
  await assert.rejects(readDemoCommand(commandRequest(undefined, { origin: "https://elsewhere.example" })), { code: "ORIGIN_DENIED", status: 403 });
  await assert.rejects(readDemoCommand(commandRequest(undefined, { "content-type": "text/plain" })), { code: "INVALID_CONTENT_TYPE", status: 415 });
  await assert.rejects(readDemoCommand(commandRequest(undefined, { "content-type": "application/json-invalid" })), { code: "INVALID_CONTENT_TYPE", status: 415 });
  await assert.rejects(readDemoCommand(commandRequest("{")), { code: "INVALID_JSON", status: 400 });
  for (const payload of [null, [], { action: "reset" }, { action: "reset", idempotencyKey: " " },
    { action: "reset", idempotencyKey: "x".repeat(129) }, { action: "reset", idempotencyKey: "valid", data: [] }]) {
    await assert.rejects(readDemoCommand(commandRequest(payload)), { code: "INVALID_INPUT", status: 400 });
  }
  for (const recipient of ["", " ", 17, "x".repeat(321)]) {
    await assert.rejects(readDemoCommand(commandRequest({ action: "authorize_link", idempotencyKey: "valid", data: { recipient } })), { code: "INVALID_RECIPIENT", status: 400 });
  }
  const valid = { action: "authorize_link", idempotencyKey: "valid", data: { recipient: "Synthetic buyer" } };
  assert.deepEqual(await readDemoCommand(commandRequest(valid, { "content-type": "application/json; charset=utf-8" })), valid);
});

test("the 16 KiB command limit counts actual UTF-8 bytes with or without content-length", async () => {
  await assert.rejects(readDemoCommand(commandRequest(undefined, { "content-length": String(DEMO_BODY_LIMIT + 1) })), { code: "PAYLOAD_TOO_LARGE", status: 413 });
  const oversized = { action: "reset", idempotencyKey: "valid", data: { padding: "文".repeat(6000) } };
  assert.ok(JSON.stringify(oversized).length < DEMO_BODY_LIMIT);
  await assert.rejects(readDemoCommand(commandRequest(oversized)), { code: "PAYLOAD_TOO_LARGE", status: 413 });
  await assert.rejects(readDemoCommand(commandRequest(oversized, { "content-length": "1" })), { code: "PAYLOAD_TOO_LARGE", status: 413 });
});
