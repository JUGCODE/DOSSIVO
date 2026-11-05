export const STEP_KEYS = [
  "goal",
  "self_check",
  "extract",
  "remediate",
  "confirm",
  "card",
  "share",
  "expert",
];

export const QUESTIONS = [
  {
    id: "market",
    label: "这批产品将销往哪里？",
    reason: "目的市场决定当前采用的要求集和披露语言。",
    options: ["意大利", "其他欧盟国家"],
  },
  {
    id: "facility",
    label: "生产工厂是否已确认？",
    reason: "证据必须绑定实际工厂，而不是只绑定公司名称。",
    options: ["已确认", "仍需确认"],
  },
  {
    id: "hours",
    label: "是否有最近三个月的工时与工资汇总？",
    reason: "这是识别强迫劳动风险与证明整改的重要事实基础。",
    options: ["有完整汇总", "只有部分月份", "尚未准备"],
  },
  {
    id: "upstream",
    label: "关键组件的直接供应商是否可追溯？",
    reason: "买方资料包要说明供应链覆盖范围和未知项。",
    options: ["全部可追溯", "部分可追溯", "尚未梳理"],
  },
  {
    id: "upstreamEvidence",
    label: "你的零部件与原料上游企业能否提供同等层级的劳工合规证据链？",
    reason: "连续证据需要延伸至关键上游，而不只覆盖本企业。",
    options: ["不能", "已有", "一键邀请我的供应商"],
  },
  { id: "policy", label: "是否有适用于本企业和供应商的书面强迫劳动风险政策？", options: ["已具备", "部分具备", "尚未具备", "不确定"] },
  { id: "owner", label: "是否明确负责人员、审批权限和升级路径？", options: ["已具备", "部分具备", "尚未具备", "不确定"] },
  { id: "riskScreening", label: "是否按地区、行业、产品、原料和已公布决定筛查风险？", options: ["已具备", "部分具备", "尚未具备", "不确定"] },
  { id: "workerRisk", label: "是否检查工人层面的强迫劳动风险指标？", options: ["已具备", "部分具备", "尚未具备", "不确定"] },
  { id: "grievance", label: "是否有安全申诉、保密、禁止报复和处理记录？", options: ["已具备", "部分具备", "尚未具备", "不确定"] },
  { id: "prevention", label: "是否有预防措施和带负责人及期限的整改计划？", options: ["已具备", "部分具备", "尚未具备", "不确定"] },
  { id: "monitoring", label: "是否验证措施有效性并保存复查结果？", options: ["已具备", "部分具备", "尚未具备", "不确定"] },
  { id: "communication", label: "能否说明风险、措施、结果和未关闭缺口？", options: ["已具备", "部分具备", "尚未具备", "不确定"] },
  { id: "remedy", label: "是否有提供或配合补救的流程？", options: ["已具备", "部分具备", "尚未具备", "不确定"] },
  { id: "evidenceVersion", label: "证据是否有服务端时间戳、有效期和不可覆盖历史版本？", options: ["已具备", "部分具备", "尚未具备", "不确定"] },
  { id: "batch", label: "证据是否关联主体、产品、批次或生产期间？", options: ["已具备", "部分具备", "尚未具备", "不确定"] },
  { id: "response", label: "能否按产品和历史时间点受控回应问询？", options: ["已具备", "部分具备", "尚未具备", "不确定"] },
];

const READINESS_GAPS = {
  policy: "书面政策与管理体系尚不完整",
  owner: "责任人、审批权限或升级路径尚不清晰",
  riskScreening: "风险筛查来源与日期记录尚不完整",
  workerRisk: "工人层面的强迫劳动指标核查尚不完整",
  grievance: "安全申诉与禁止报复机制证据尚不完整",
  prevention: "预防措施或供应商整改计划尚不完整",
  monitoring: "措施有效性监测记录尚不完整",
  communication: "风险应对与未关闭缺口说明尚不完整",
  remedy: "补救与负责任退出流程尚不完整",
  evidenceVersion: "证据版本、有效期或服务端时间戳尚不完整",
  batch: "证据与产品批次或生产期间的关联尚不完整",
  response: "历史时间点问询与受控披露流程尚不完整",
};

export function createInitialState() {
  return {
    syntheticDemo: true,
    goal: "为意大利买方准备强迫劳动尽调资料",
    scope: {
      organization: "Jinan Aurora Components Co., Ltd.",
      product: "Textile finishing machine drive module",
      facility: "Jinan assembly facility",
      market: "Italy / European Union",
      period: "2026 Q3",
      ruleSet: "EU 2024/3015 · demo rule set v0.1",
    },
    answers: {},
    facts: [],
    findings: [],
    tasks: [],
    confirmations: [],
    cards: {},
    link: null,
    experts: [],
    agents: [
      ["A01", "案件编排", "active"],
      ["A02", "需求与范围", "ready"],
      ["A03", "证据抽取", "waiting"],
      ["A04", "缺口与整改", "waiting"],
      ["A05", "卡片与披露", "waiting"],
      ["A06", "专业匹配", "waiting"],
    ],
  };
}

export function riskFromAnswers(answers) {
  let score = 18;
  if (answers.facility === "仍需确认") score += 22;
  if (answers.hours === "只有部分月份") score += 18;
  if (answers.hours === "尚未准备") score += 34;
  if (answers.upstream === "部分可追溯") score += 16;
  if (answers.upstream === "尚未梳理") score += 30;
  if (answers.upstreamEvidence === "不能") score += 18;
  if (answers.upstreamEvidence === "一键邀请我的供应商") score += 8;
  for (const key of Object.keys(READINESS_GAPS)) {
    if (answers[key] === "部分具备") score += 3;
    if (answers[key] === "尚未具备") score += 6;
    if (answers[key] === "不确定") score += 4;
  }
  return Math.min(score, 92);
}

export function extractSyntheticFacts() {
  return [
    { id: "f1", label: "工厂主体", value: "Jinan Aurora Components Co., Ltd.", source: "Supplier statement · p1", confidence: 0.99 },
    { id: "f2", label: "覆盖期间", value: "2026-07-01 — 2026-09-30", source: "Payroll summary · p1", confidence: 0.99 },
    { id: "f3", label: "最高周工时", value: "58 hours", source: "Attendance summary · p2", confidence: 0.94 },
    { id: "f4", label: "招聘费政策", value: "Prohibited; repayment evidence not attached", source: "Recruitment policy · §4", confidence: 0.91 },
  ];
}

export function buildFindings(answers) {
  const findings = [
    { id: "g1", severity: "high", title: "招聘费补偿证据缺失", detail: "政策声明存在，但没有工人退款抽样或零收费验证记录。", owner: "HR lead", due: "2026-09-30" },
    { id: "g2", severity: "medium", title: "上游组件覆盖不完整", detail: "驱动电机供应商已知，控制器次级来源仍为未知。", owner: "Procurement", due: "2026-10-07" },
  ];
  if (answers.hours !== "有完整汇总") {
    findings.unshift({ id: "g0", severity: "high", title: "工时证据期间不完整", detail: "买方要求三个月连续期间，当前材料存在月份缺口。", owner: "Payroll", due: "2026-09-26" });
  }
  if (answers.upstreamEvidence === "不能" || answers.upstreamEvidence === "一键邀请我的供应商") {
    findings.push({ id: "g3", severity: "medium", title: "上游证据链尚未完整接通", detail: "至少一个关键上游企业尚未提供同等层级、可追溯且具有有效期的劳工证据。", owner: "Procurement", due: "待企业负责人设定" });
  }
  for (const [key, title] of Object.entries(READINESS_GAPS)) {
    if (answers[key] && answers[key] !== "已具备") {
      findings.push({
        id: `readiness-${key}`,
        severity: answers[key] === "尚未具备" ? "high" : "medium",
        title,
        detail: `当前回答为“${answers[key]}”。请补充可核查材料、负责人、适用范围、有效期间和复核记录。`,
        owner: "Compliance owner",
        due: "待企业负责人设定",
      });
    }
  }
  return findings;
}

export function buildTasks(findings) {
  return findings.map((finding, index) => ({
    id: `t${index + 1}`,
    title: finding.title,
    owner: finding.owner,
    due: finding.due,
    status: "open",
    closeCondition: index === 0 ? "上传连续期间汇总并由企业审批人确认" : "补充来源、范围及复核记录",
  }));
}

export function buildCards() {
  const base = {
    scope: "Drive module · Jinan facility · 2026 Q3",
    readiness: "Prepared with disclosed gaps",
    verifiedFacts: 4,
    openGaps: 2,
  };
  return {
    en: { ...base, title: "Buyer evidence card", summary: "The current evidence set identifies the facility and coverage period. Recruitment-fee repayment evidence and one upstream component source remain open.", disclaimer: "Evidence readiness is not EU certification or a guarantee of compliance. Authorities make the final determination." },
    it: { ...base, title: "Scheda prove per l'acquirente", summary: "Le prove attuali identificano lo stabilimento e il periodo coperto. Restano aperte le prove sul rimborso delle commissioni di reclutamento e una fonte a monte.", disclaimer: "La preparazione delle prove non è una certificazione UE né una garanzia di conformità. La decisione finale spetta alle autorità." },
    zh: { ...base, title: "买方证据卡", summary: "当前证据已确认工厂与覆盖期间。招聘费补偿证明及一个上游组件来源仍待补齐。", disclaimer: "证据准备不等于欧盟认证，也不保证合规；最终判断由主管机关作出。" },
  };
}

export function verifiedExperts() {
  return [
    { id: "p1", name: "Giulia Ferri", organization: "Ferri Labour & Trade", location: "Milan, Italy", languages: ["Italian", "English"], fit: "EU labour due diligence · importer response", verified: "2026-09-11", availability: "Availability pending confirmation", contact: "giulia.ferri@example.demo", demo: true },
    { id: "p2", name: "Marco Rinaldi", organization: "Rinaldi Compliance Studio", location: "Genoa, Italy", languages: ["Italian", "English", "Mandarin partner"], fit: "Port-facing trade response · evidence review", verified: "2026-09-08", availability: "Review slot next week", contact: "marco.rinaldi@example.demo", demo: true },
  ];
}

export function nextStepFor(state) {
  if (!state.answers?.market) return 2;
  if (!state.facts?.length) return 3;
  if (!state.tasks?.length) return 4;
  if ((state.confirmations?.length ?? 0) < (state.facts?.length ?? 0)) return 5;
  if (!state.cards?.en) return 6;
  if (!state.link) return 7;
  if (!state.experts?.length) return 8;
  return 8;
}
