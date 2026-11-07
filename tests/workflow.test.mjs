import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
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
} from "../lib/workflow-core.js";
import { countdownParts, legalDaysRemaining, quickCheckResult, READINESS_TARGETS, startDeadlineTicker } from "../lib/deadline-core.js";
import { coverageSegments, effectiveEvidenceAt, reminderDates, supplierReminderMessage } from "../lib/evidence-core.js";
import { routeAgentTask } from "../lib/agent-intent.js";

test("workflow advances only when each result artifact exists", () => {
  const state = createInitialState();
  assert.equal(nextStepFor(state), 2);
  state.answers = { market: "意大利", facility: "已确认", hours: "有完整汇总", upstream: "部分可追溯" };
  assert.equal(nextStepFor(state), 3);
  state.facts = extractSyntheticFacts();
  assert.equal(nextStepFor(state), 4);
  state.findings = buildFindings(state.answers);
  state.tasks = buildTasks(state.findings);
  assert.equal(nextStepFor(state), 5);
  state.confirmations = state.facts.map((fact) => fact.id);
  assert.equal(nextStepFor(state), 6);
  state.cards = buildCards();
  assert.equal(nextStepFor(state), 7);
  state.link = { token: "demo" };
  assert.equal(nextStepFor(state), 8);
  state.experts = verifiedExperts();
  assert.equal(nextStepFor(state), 8);
});

test("risk score increases for evidence gaps but remains bounded", () => {
  assert.equal(riskFromAnswers({ facility: "已确认", hours: "有完整汇总", upstream: "全部可追溯" }), 18);
  assert.equal(riskFromAnswers({ facility: "仍需确认", hours: "尚未准备", upstream: "尚未梳理" }), 92);
  assert.equal(riskFromAnswers({ facility: "已确认", hours: "有完整汇总", upstream: "全部可追溯", upstreamEvidence: "一键邀请我的供应商" }), 26);
  assert.equal(riskFromAnswers({ facility: "已确认", hours: "有完整汇总", upstream: "全部可追溯", upstreamEvidence: "不能" }), 36);
});

test("upstream evidence-chain answer creates a visible remediation finding", () => {
  const findings = buildFindings({ hours: "有完整汇总", upstreamEvidence: "不能" });
  assert.ok(findings.some((finding) => finding.id === "g3" && finding.title.includes("上游证据链")));
});

test("multilingual cards preserve critical numbers and disclaimer", () => {
  const cards = buildCards();
  for (const card of Object.values(cards)) {
    assert.equal(card.verifiedFacts, 4);
    assert.equal(card.openGaps, 2);
    assert.ok(/认证|certific/i.test(card.disclaimer));
  }
});

test("expert records are explicitly non-production demo profiles", () => {
  const experts = verifiedExperts();
  assert.ok(experts.length > 0);
  assert.ok(experts.every((expert) => expert.demo === true));
  assert.ok(experts.every((expert) => expert.contact.endsWith(".demo")));
});

test("Brussels readiness targets use the specified CET and CEST instants", () => {
  assert.equal(READINESS_TARGETS["3m"], "2027-09-13T22:00:00.000Z");
  assert.equal(READINESS_TARGETS["6m"], "2027-06-13T22:00:00.000Z");
  assert.equal(READINESS_TARGETS["12m"], "2026-12-13T23:00:00.000Z");
  assert.deepEqual(countdownParts(READINESS_TARGETS["6m"], Date.parse("2027-06-13T21:59:59.000Z")), { totalMs: 1000, days: 0, hours: 0, minutes: 0, seconds: 1 });
  assert.equal(countdownParts(READINESS_TARGETS["6m"], Date.parse("2027-06-14T00:00:00.000Z")).totalMs, 0);
  assert.equal(legalDaysRemaining(Date.parse("2027-12-13T23:00:01.000Z")), 0);
});

test("deadline ticker cleanup clears its interval", () => {
  let cleared = null;
  const timerApi = { setInterval: () => 47, clearInterval: (id) => { cleared = id; } };
  const stop = startDeadlineTicker(() => {}, READINESS_TARGETS["3m"], timerApi);
  stop();
  assert.equal(cleared, 47);
});

test("quick check waits for all four answers and includes company governance", () => {
  assert.equal(quickCheckResult({ upstream: "yes" }), null);
  assert.deepEqual(quickCheckResult({ upstream: "no", requests: "no", week: "yes", governance: "yes" }), { score: 0, level: "good" });
  assert.deepEqual(quickCheckResult({ upstream: "yes", requests: "yes", week: "no", governance: "no" }), { score: 4, level: "priority" });
});

test("regulatory readiness answers create traceable remediation findings", () => {
  const findings = buildFindings({ hours: "有完整汇总", policy: "尚未具备", monitoring: "部分具备", evidenceVersion: "不确定" });
  assert.ok(findings.some((finding) => finding.id === "readiness-policy" && finding.severity === "high"));
  assert.ok(findings.some((finding) => finding.id === "readiness-monitoring"));
  assert.ok(findings.some((finding) => finding.id === "readiness-evidenceVersion"));
});

test("full readiness check covers scope, due diligence, evidence continuity and response", () => {
  assert.equal(QUESTIONS.length, 17);
  for (const id of ["market", "policy", "riskScreening", "workerRisk", "remedy", "evidenceVersion", "batch", "response"]) {
    assert.ok(QUESTIONS.some((question) => question.id === id));
  }
});

const evidence = [
  { version: 1, validFrom: "2027-01-01", validUntil: "2027-03-31", createdAt: "2027-01-01T09:00:00Z" },
  { version: 2, validFrom: "2027-03-15", validUntil: "2027-06-30", createdAt: "2027-03-14T09:00:00Z" },
  { version: 3, validFrom: "2027-07-08", validUntil: "2027-12-31", createdAt: "2027-07-01T09:00:00Z" },
];

test("time-point evidence query handles overlap, expiry and dates before first evidence", () => {
  assert.equal(effectiveEvidenceAt(evidence, "2027-03-20").version, 2);
  assert.equal(effectiveEvidenceAt(evidence, "2027-07-03"), null);
  assert.equal(effectiveEvidenceAt(evidence, "2028-01-01"), null);
  assert.equal(effectiveEvidenceAt(evidence, "2026-12-31"), null);
});

test("continuity timeline highlights a coverage gap", () => {
  const segments = coverageSegments(evidence, "2027-06-25", "2027-07-12");
  assert.ok(segments.some((segment) => segment.status === "gap" && segment.from === "2027-07-01" && segment.until === "2027-07-07"));
});

test("expiry reminders and supplier messages are deterministic and trilingual", () => {
  assert.deepEqual(reminderDates("2027-12-31"), [{ daysBefore: 30, at: "2027-12-01" }, { daysBefore: 7, at: "2027-12-24" }]);
  assert.match(supplierReminderMessage({ supplier: "A", evidenceName: "Policy", validUntil: "2027-12-31", language: "en" }), /continuous coverage/);
  assert.match(supplierReminderMessage({ supplier: "甲方", evidenceName: "政策", validUntil: "2027-12-31" }), /覆盖连续/);
  assert.match(supplierReminderMessage({ supplier: "A", evidenceName: "Politica", validUntil: "2027-12-31", language: "it" }), /continuità della copertura probatoria/);
  assert.throws(() => supplierReminderMessage({ supplier: "A", evidenceName: "Policy", validUntil: "2027-12-31", language: "fr" }), /Unsupported reminder language/);
});

test("home copy preserves the legal distinction between suspicion and a prohibition decision", () => {
  const source = readFileSync(new URL("../app/compliance-home.tsx", import.meta.url), "utf8");
  assert.match(source, /完善劳工合规档案，随时交付可核查证据/);
  assert.match(source, /涉嫌情形可能触发评估或调查/);
  assert.match(source, /撤回命令不再针对该产品/);
  assert.doesNotMatch(source, /已到达最终用户的产品.*返回源头/);
});

test("the trilingual task launcher routes urgent intent into the urgent workflow", () => {
  assert.equal(routeAgentTask("我收到了意大利买方的问卷，下周五前需要回复"), "urgent");
  assert.equal(routeAgentTask("We received an authority inquiry"), "urgent");
  assert.equal(routeAgentTask("Ho ricevuto un questionario da un buyer"), "urgent");
  assert.equal(routeAgentTask("Vorrei avviare la prima autovalutazione"), "self-check");
  assert.equal(routeAgentTask(""), "self-check");
});

test("the hero presents an honest trilingual intelligent-workflow prototype", () => {
  const source = readFileSync(new URL("../app/compliance-home.tsx", import.meta.url), "utf8");
  for (const text of [
    "原生智能工作流原型",
    "现在需要多希沃帮你完成什么？",
    "智能助手提出建议并准备草稿；每一步执行和对外披露均由企业确认，并保留操作记录。",
    "AI-native workflow prototype",
    "What do you need Dossivo to help you complete?",
    "AI recommends next steps and prepares drafts. Your company approves every action and external disclosure, with an audit trail.",
    "Prototipo di workflow AI-native",
    "Che cosa deve aiutarti a completare Dossivo?",
    "L’impresa approva ogni azione e divulgazione esterna, con registrazione delle attività.",
  ]) assert.ok(source.includes(text), `missing intelligent-workflow copy: ${text}`);
  const chineseCopy = source.slice(source.indexOf("zh: {"), source.indexOf("en: {"));
  assert.doesNotMatch(chineseCopy, /AI[- ]?native/i);
  assert.match(source, /disabled=\{!agentTask\.trim\(\)\}/);
  assert.match(source, /routeAgentTask\(task\)/);
});

test("attachment copy is precise and aligned across all three languages", () => {
  const source = readFileSync(new URL("../app/compliance-home.tsx", import.meta.url), "utf8");
  for (const text of [
    "贵企业是否已有书面政策、明确负责人，以及可追溯的风险评估和整改记录？",
    "Does your company have a written policy, a designated person responsible, and traceable records of risk assessments and corrective actions?",
    "La vostra impresa dispone di una politica scritta, di un responsabile designato e di registri tracciabili delle valutazioni dei rischi e delle azioni correttive?",
    "已收到买方问卷或主管机关问询",
    "I received a buyer questionnaire or authority inquiry",
    "Ho ricevuto un questionario dal buyer o una richiesta dall’autorità",
  ]) assert.ok(source.includes(text), `missing copy: ${text}`);
});

test("supplier follow-up copy promises reviewable drafts, not automatic outreach", () => {
  const source = readFileSync(new URL("../app/subscription-pricing.tsx", import.meta.url), "utf8");
  for (const text of [
    "企业审核后自行发送，Dossivo 不会自动联系供应商。",
    "Your company reviews and sends each draft; Dossivo does not contact suppliers automatically.",
    "L’impresa verifica e invia ogni bozza; Dossivo non contatta automaticamente i fornitori.",
  ]) assert.ok(source.includes(text), `missing reminder boundary: ${text}`);
});

test("language controls use local flag artwork rather than regional-indicator emoji", () => {
  const workbench = readFileSync(new URL("../app/workbench.tsx", import.meta.url), "utf8");
  const viewer = readFileSync(new URL("../app/proof/[token]/viewer.tsx", import.meta.url), "utf8");
  const component = readFileSync(new URL("../components/country-flag.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(`${workbench}\n${viewer}`, /[\u{1F1E6}-\u{1F1FF}]{2}/u);
  assert.match(workbench, /LanguageFlag/);
  assert.match(viewer, /LanguageFlag/);
  for (const path of ["/flags/cn.svg", "/flags/gb.svg", "/flags/it.svg"]) {
    assert.ok(component.includes(path), `missing ${path}`);
    assert.ok(existsSync(new URL(`../public${path}`, import.meta.url)), `missing local asset ${path}`);
  }
});

test("the hero quick check can collapse and remembers the user's choice", () => {
  const source = readFileSync(new URL("../app/compliance-home.tsx", import.meta.url), "utf8");
  for (const text of [
    "展开 30 秒快速判断",
    "Open the 30-second check",
    "Apri la verifica rapida di 30 secondi",
    "dossivo-quick-check-collapsed",
    'id="quick-check-panel"',
    'aria-controls="quick-check-panel"',
  ]) assert.ok(source.includes(text), `missing collapsible quick-check behavior: ${text}`);
  assert.match(source, /hidden=\{quickCheckCollapsed\}/);
  assert.match(source, /localStorage\.setItem\(QUICK_CHECK_COLLAPSED_KEY, "true"\)/);
  assert.match(source, /clearTimeout\(timer\)/);
});

test("a multilingual accessible back-to-top control appears after the hero", () => {
  const source = readFileSync(new URL("../app/compliance-home.tsx", import.meta.url), "utf8");
  for (const text of ["返回首屏", "Back to top", "Torna all’inizio"]) assert.ok(source.includes(text), `missing back-to-top label: ${text}`);
  assert.match(source, /IntersectionObserver/);
  assert.match(source, /observer\.disconnect\(\)/);
  assert.match(source, /window\.scrollTo\(\{ top: 0/);
  assert.match(source, /prefers-reduced-motion: reduce/);
  assert.match(source, /h-12 w-12/);
});
