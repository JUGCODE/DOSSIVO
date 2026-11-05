import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  localizeNewsletterIssue,
  maskEmail,
  NEWSLETTER_LANGUAGES,
  normalizeNewsletterLanguage,
  PREVIEW_NEWSLETTER_ISSUE,
  validatePublishableNewsletter,
} from "../lib/newsletter-core.js";

test("the founding briefing is complete and aligned across three languages", () => {
  assert.deepEqual(NEWSLETTER_LANGUAGES, ["zh", "en", "it"]);
  assert.equal(validatePublishableNewsletter(PREVIEW_NEWSLETTER_ISSUE).ok, true);
  for (const language of NEWSLETTER_LANGUAGES) {
    const issue = localizeNewsletterIssue(PREVIEW_NEWSLETTER_ISSUE, language);
    assert.equal(issue.language, language);
    assert.equal(issue.actions.length, 3);
    assert.equal(issue.checklist.length, 3);
    assert.match(issue.practiceLabel, /示例|example|scenario/i);
    assert.ok(issue.sources.every((source) => source.url.startsWith("https://")));
  }
});

test("briefing actions tell businesses what to do without presenting Dossivo tasks", () => {
  for (const language of NEWSLETTER_LANGUAGES) {
    const copy = PREVIEW_NEWSLETTER_ISSUE.translations[language];
    const actions = copy.actions.map((item) => `${item.audience} ${item.action}`).join(" ");
    assert.doesNotMatch(actions, /Dossivo/i);
    assert.doesNotMatch(actions, /认证|certification|certificazione/i);
    assert.match(copy.practiceDisclaimer, /不代表|not a claim|non un’affermazione/i);
  }
});

test("an issue cannot be published when a language version is missing", () => {
  const incomplete = structuredClone(PREVIEW_NEWSLETTER_ISSUE);
  delete incomplete.translations.it;
  const result = validatePublishableNewsletter(incomplete);
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((error) => error.startsWith("it ")));
});

test("newsletter language and email display are deterministic", () => {
  assert.equal(normalizeNewsletterLanguage("zh"), "zh");
  assert.equal(normalizeNewsletterLanguage("it"), "it");
  assert.equal(normalizeNewsletterLanguage("fr"), "en");
  assert.equal(maskEmail("owner@example.com"), "o***@example.com");
});

test("subscription remains separate from registration and delivery", () => {
  const api = readFileSync(new URL("../app/api/newsletter-preferences/route.ts", import.meta.url), "utf8");
  const client = readFileSync(new URL("../app/briefings/briefing-center.tsx", import.meta.url), "utf8");
  assert.match(api, /getChatGPTUser/);
  assert.match(api, /payload\.consent !== true/);
  assert.match(api, /status: "pending_delivery"/);
  assert.match(api, /status: "unsubscribed"/);
  assert.match(api, /email: user\.email/);
  assert.match(client, /注册不等于订阅/);
  assert.match(client, /Email delivery is not yet enabled/);
  assert.match(client, /No email is currently sent/);
  assert.match(client, /type="checkbox" checked=\{consent\}/);
});

test("home and sidebar expose a working trilingual briefing entry", () => {
  const home = readFileSync(new URL("../app/compliance-home.tsx", import.meta.url), "utf8");
  const workbench = readFileSync(new URL("../app/workbench.tsx", import.meta.url), "utf8");
  for (const text of ["本周，全球企业应该完成什么", "What companies worldwide should complete this week", "Che cosa dovrebbero completare questa settimana le imprese di tutto il mondo"]) assert.ok(home.includes(text));
  for (const text of ["企业行动简报", "Action briefings", "Brief operativo"]) assert.ok(workbench.includes(text));
  assert.match(home, /href="\/briefings"/);
  assert.match(workbench, /router\.push\("\/briefings"\)/);
  const chineseCopy = workbench.slice(workbench.indexOf("zh: {"), workbench.indexOf("it: {"));
  assert.doesNotMatch(chineseCopy, /AI 原生/);
});
