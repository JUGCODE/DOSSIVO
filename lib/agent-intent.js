const URGENT_INTENT_TERMS = [
  "问卷",
  "问询",
  "主管机关",
  "海关",
  "调查",
  "紧急",
  "questionnaire",
  "inquiry",
  "authority",
  "customs",
  "investigation",
  "urgent",
  "questionario",
  "richiesta",
  "autorità",
  "autorita",
  "dogana",
  "indagine",
  "urgente",
];

export function routeAgentTask(input) {
  const normalized = String(input ?? "").trim().toLocaleLowerCase();
  return URGENT_INTENT_TERMS.some((term) => normalized.includes(term)) ? "urgent" : "self-check";
}
