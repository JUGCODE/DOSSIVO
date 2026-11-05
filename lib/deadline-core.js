export const LEGAL_APPLICATION_AT = "2027-12-13T23:00:00.000Z";

export const READINESS_TARGETS = Object.freeze({
  "3m": "2027-09-13T22:00:00.000Z",
  "6m": "2027-06-13T22:00:00.000Z",
  "12m": "2026-12-13T23:00:00.000Z",
});

export function countdownParts(targetIso, nowMs = Date.now()) {
  const remaining = Math.max(0, Date.parse(targetIso) - nowMs);
  return {
    totalMs: remaining,
    days: Math.floor(remaining / 86_400_000),
    hours: Math.floor((remaining % 86_400_000) / 3_600_000),
    minutes: Math.floor((remaining % 3_600_000) / 60_000),
    seconds: Math.floor((remaining % 60_000) / 1_000),
  };
}

export function legalDaysRemaining(nowMs = Date.now()) {
  return Math.max(0, Math.ceil((Date.parse(LEGAL_APPLICATION_AT) - nowMs) / 86_400_000));
}

export function startDeadlineTicker(callback, targetIso, timerApi = globalThis) {
  callback(countdownParts(targetIso));
  const timerId = timerApi.setInterval(() => callback(countdownParts(targetIso)), 1_000);
  return () => timerApi.clearInterval(timerId);
}

/** @returns {{ score: number, level: 'good' | 'attention' | 'priority' } | null} */
export function quickCheckResult(answers) {
  if (!["upstream", "requests", "week", "governance"].every((key) => answers[key] === "yes" || answers[key] === "no")) return null;
  const score = Number(answers.upstream === "yes")
    + Number(answers.requests === "yes")
    + Number(answers.week === "no")
    + Number(answers.governance === "no");
  return { score, level: score === 0 ? "good" : score <= 2 ? "attention" : "priority" };
}
