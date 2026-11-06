/* eslint-disable @typescript-eslint/no-explicit-any, react-hooks/set-state-in-effect */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight, CircleDot, Copy,
  ChevronDown, CircleHelp, CreditCard, FileCheck2, FileSearch, Globe2, KeyRound, Languages, Loader2, LockKeyhole,
  Menu, Network, Newspaper, PanelLeftClose, PanelLeftOpen, RefreshCcw, ShieldCheck,
  Search, Sparkles, Sun, Moon, ScrollText, UserRoundCheck, UsersRound, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CountryFlag, LanguageFlag } from "@/components/country-flag";
import { ComplianceHome, type ProductLang } from "./compliance-home";
import { PrivateTaskPanel } from "./private-task-panel";
import { PaciPanel } from "./paci-panel";
import { COMMUNICATION_REGION_ENFORCEMENT } from "@/lib/communication-config";

type Lang = ProductLang;
type CaseRecord = { currentStep: number; status: string; version: number; updatedAt: string };
type State = Record<string, any>;
type Action = (action: string, data?: Record<string, unknown>) => Promise<any>;

async function readCaseResponse(response: Response): Promise<{ case: CaseRecord; state: State }> {
  const value = await response.json() as Record<string, any>;
  if (!response.ok) throw new Error(typeof value?.error === "string" ? value.error : "Unable to load case");
  if (!value?.case || !Number.isSafeInteger(value.case.version) || !value.state || !Array.isArray(value.state.agents)) throw new Error("Invalid case response");
  return { case: value.case as CaseRecord, state: value.state as State };
}

const COPY = {
  zh: {
    engine: "劳工合规证据交付引擎", demo: "合成演示 · 不接收真实原件", heroKicker: "原生智能合规结果平台", signUp: "注册", signIn: "登录", search: "站内搜索", searchPlaceholder: "查找功能或法规关键词", noSearchResult: "未找到匹配内容", faqButton: "常见问题",
    hero: "把复杂合规要求，变成买方可以核查的结果",
    heroText: "告诉 Dossivo 你要完成什么。系统会组织证据、发现缺口、推进整改、准备安全披露，并在需要时找到合适的专业人员。",
    continue: "继续当前资料包", restart: "重新开始演示", coreTasks: "你可以从这里开始",
    ready: "当前可演示", soon: "后续工作包", buyer: "准备买方资料", buyerDesc: "从自检到受控 Link 1，一次完成。",
    remediate: "补齐证据并整改", remediateDesc: "把未知项变成责任人、期限和关闭条件。",
    expert: "找到合适专家", expertDesc: "按地区、资质、语言和问题匹配。",
    notice: "处理调查通知", noticeDesc: "组织期限、证据矩阵和专业接手。",
    active: "当前结果任务", title: "为意大利买方准备一套可核查资料",
    intro: "系统正在把范围、证据、缺口和披露组织成一个可验收结果。你只在需要判断或授权时介入。",
    reset: "重置演示", version: "案件版本", inProgress: "处理中", stage: "第 {n}/8 步",
    nav: ["结果任务", "证据库", "供应网络", "披露链接", "专业网络", "法规资料", "企业行动简报", "记录与质疑"], path: "结果路径",
    stages: ["目标", "自适应自检", "材料抽取", "缺口与整改", "事实确认", "多语卡片", "授权 Link 1", "专业匹配"],
    qTitle: "法规与证据准备度检查", qText: "约 3–5 分钟，覆盖适用范围、OECD 六步尽职调查框架、劳动风险指标、证据连续性和问询响应。结果用于生成缺口清单，不是合规认证或法律结论。", qEstimate: "约 3–5 分钟", qCoverage: "已回答 {done}/{total}",
    questions: [
      ["market", "这批产品将销往哪里？", "目的市场决定采用的要求集和披露语言。", [["意大利", "意大利"], ["其他欧盟国家", "其他欧盟国家"]]],
      ["facility", "生产工厂是否已经确认？", "证据必须绑定实际工厂，而不只是公司名称。", [["已确认", "已确认"], ["仍需确认", "仍需确认"]]],
      ["hours", "是否有最近三个月的工时和工资汇总？", "这是识别风险和证明整改的重要事实基础。", [["有完整汇总", "有完整汇总"], ["只有部分月份", "只有部分月份"], ["尚未准备", "尚未准备"]]],
      ["upstream", "关键组件的直接供应商是否可追溯？", "买方资料包必须说明供应链覆盖范围和未知项。", [["全部可追溯", "全部可追溯"], ["部分可追溯", "部分可追溯"], ["尚未梳理", "尚未梳理"]]],
      ["upstreamEvidence", "你的零部件与原料上游企业能否提供同等层级的劳工合规证据链？", "连续证据需要延伸至关键上游，而不只覆盖本企业。", [["不能", "不能"], ["已有", "已有"], ["一键邀请我的供应商", "一键邀请我的供应商"]]],
      ["policy", "是否有适用于本企业和供应商的书面强迫劳动风险政策？", "对应 OECD 第一步：把负责任商业行为纳入政策与管理体系。", [["已具备", "已具备"], ["部分具备", "部分具备"], ["尚未具备", "尚未具备"], ["不确定", "不确定"]]],
      ["owner", "是否明确负责人员、审批权限和升级路径？", "风险发现、整改、证据确认和对外回应都需要可问责的负责人。", [["已具备", "已具备"], ["部分具备", "部分具备"], ["尚未具备", "尚未具备"], ["不确定", "不确定"]]],
      ["riskScreening", "是否按国家或地区、行业、产品、原料及已公布决定筛查风险，并记录来源和日期？", "风险识别应可复核；官方门户是信息来源，不是企业申报渠道。", [["已具备", "已具备"], ["部分具备", "部分具备"], ["尚未具备", "尚未具备"], ["不确定", "不确定"]]],
      ["workerRisk", "是否检查招聘费、证件扣押、行动限制、债务、威胁、工资工时和非自愿加班等风险指标？", "政策文件之外，还要识别工人层面的强迫劳动迹象。", [["已具备", "已具备"], ["部分具备", "部分具备"], ["尚未具备", "尚未具备"], ["不确定", "不确定"]]],
      ["grievance", "是否有工人可安全使用的申诉渠道，并保留保密、禁止报复和处理记录？", "工人反馈是识别风险、监测结果和提供补救的重要证据。", [["已具备", "已具备"], ["部分具备", "部分具备"], ["尚未具备", "尚未具备"], ["不确定", "不确定"]]],
      ["prevention", "对高风险供应商是否设有合同要求、预防措施和带负责人及期限的整改计划？", "对应 OECD 第三步：停止、预防或减轻不利影响。", [["已具备", "已具备"], ["部分具备", "部分具备"], ["尚未具备", "尚未具备"], ["不确定", "不确定"]]],
      ["monitoring", "是否定期验证预防和整改措施是否有效，并保存复查结果？", "对应 OECD 第四步：跟踪实施与结果，不能只记录已发出要求。", [["已具备", "已具备"], ["部分具备", "部分具备"], ["尚未具备", "尚未具备"], ["不确定", "不确定"]]],
      ["communication", "能否说明已识别风险、采取措施、验证结果和仍未关闭的缺口？", "对应 OECD 第五步：就如何应对影响进行沟通，同时避免夸大结论。", [["已具备", "已具备"], ["部分具备", "部分具备"], ["尚未具备", "尚未具备"], ["不确定", "不确定"]]],
      ["remedy", "发现伤害时，是否有提供或配合补救并避免不负责任退出的流程？", "对应 OECD 第六步：在适当情况下提供或配合补救。", [["已具备", "已具备"], ["部分具备", "部分具备"], ["尚未具备", "尚未具备"], ["不确定", "不确定"]]],
      ["evidenceVersion", "每份证据是否保存服务端时间戳、有效期起止和不可覆盖的历史版本？", "这样才能证明某批产品生产期间当时有效的是哪一版证据。", [["已具备", "已具备"], ["部分具备", "部分具备"], ["尚未具备", "尚未具备"], ["不确定", "不确定"]]],
      ["batch", "证据是否关联企业、工厂、供应商、产品以及生产批次或生产期间？", "主管机关可能关注历史批次，而不是问询当天的现状。", [["已具备", "已具备"], ["部分具备", "部分具备"], ["尚未具备", "尚未具备"], ["不确定", "不确定"]]],
      ["response", "能否按产品范围和历史生产时间点回应买方、海关或主管机关，并控制披露及记录访问？", "回应应准确限定范围，只出示获授权且与相关期间匹配的证据。", [["已具备", "已具备"], ["部分具备", "部分具备"], ["尚未具备", "尚未具备"], ["不确定", "不确定"]]],
    ],
    qNote: "免费自检不构成法律结论。", qAction: "生成风险与证据范围",
    extractTitle: "用合成材料演示可追溯抽取", extractText: "本工作包不接受真实原件。每个字段保留来源页和置信度，低置信度不会进入披露。",
    extractNote: "处理仅使用仓库中的合成样本。", extractAction: "运行受控抽取", pages: "页", synthetic: "合成文件", rows: "行",
    gapsTitle: "证据已经变成可执行工作", gapsText: "已识别 {n} 个可追溯事实。下一步把未知项转成负责人、期限和关闭条件。",
    confidence: "置信度", gapsNote: "严重整改不会由 AI 自动关闭。", gapsAction: "生成缺口与整改任务",
    confirmTitle: "确认哪些事实可以代表企业", confirmText: "AI 已准备建议，但只有企业授权人员能够确认事实；确认不会自动发布任何资料。",
    source: "来源", machine: "机器抽取", gapsVisible: "{n} 个缺口继续保持可见", confirmWarning: "确认已知事实不会把未知项变成低风险，也不会把 Evidence Ready 变成认证。",
    confirmNote: "此操作记录企业确认门。", confirmAction: "确认以上企业事实",
    cardTitle: "用同一事实版本生成三语买方卡片", cardText: "数字、期间和否定含义在各语言间保持一致；原件不会进入 Link 1。",
    cardReady: "可生成中文、英语和意大利语", oneModel: "一个事实模型 · 独立翻译版本", cardNote: "卡片生成后仍需单独授权才能披露。", cardAction: "生成并核对多语卡片",
    discloseTitle: "把披露范围说清楚，再生成 Link 1", discloseText: "接收人只看到已确认卡片；本次授权不包括原件、供应关系图或专业委托。",
    recipient: "指定接收人", policy: "访问规则", policyValue: "7 天 · 3 次访问 · 仅卡片", discloseNote: "未获授权不会创建可访问链接。", discloseAction: "授权并创建 Link 1",
    matchTitle: "专业缺口出现时，交给真正合适的人", matchText: "先按资质、地区、语言和可用性硬筛；赞助或佣金不会改变排序，候选卡也不会自动发送案情。",
    needExpert: "需要欧盟劳动与贸易证据复核", needExpertText: "触发原因：招聘费补偿证据缺失，并涉及意大利买方披露。系统仅使用已核验目录字段进行匹配。",
    matchNote: "本工作包使用明确标识的演示目录资料，不代表已签约专家。", matchAction: "显示适配候选",
    doneKicker: "结果可提交验收", doneTitle: "第一个结果闭环已经跑通", doneText: "范围、证据、缺口、确认、披露和专业接手已形成一个可追溯案件。",
    doneBar: "8/8 步完成 · 已记录合成验收证据", linkReady: "Link 1 已授权", views: "次访问", copy: "复制链接", revoke: "撤销链接", revoked: "链接已撤销", accessLog: "访问记录", noAccess: "尚无访问记录",
    demoProfile: "演示档案", checked: "目录核验日期", reviewFit: "联系前查看匹配理由",
    team: "执行团队", agents: "6 个核心 Agent", teamText: "用户管理结果，不需要逐个管理 Agent；任何外部动作都必须单独授权。",
    boundary: "数据边界", boundaryText: "真实原件处理尚未开放。本工作包只使用合成材料，不会把普通模型 API 包装成“平台不可读”。", demoRegion: "演示区域 · 仅合成数据",
    loading: "正在载入结果工作台", unavailable: "工作台暂时不可用", retry: "重新尝试", collapse: "收窄侧栏", expand: "展开侧栏",
    buyerPack: "买方尽调资料包", facts: "已确认事实", openGaps: "未关闭缺口", languages: ["英语", "意大利语", "中文"],
  },
  it: {
    engine: "Motore di consegna delle prove sul lavoro", demo: "Demo sintetica · nessun originale reale", heroKicker: "Piattaforma AI native per risultati di conformità", signUp: "Registrati", signIn: "Accedi", search: "Cerca nel sito", searchPlaceholder: "Cerca funzioni o termini normativi", noSearchResult: "Nessun contenuto corrispondente", faqButton: "FAQ",
    hero: "Trasforma requisiti complessi in risultati verificabili dai buyer",
    heroText: "Indica a Dossivo il risultato da ottenere. Il sistema organizza le prove, individua le lacune, guida le correzioni, prepara la condivisione controllata e coinvolge il professionista giusto quando serve.",
    continue: "Continua il dossier", restart: "Ricomincia la demo", coreTasks: "Inizia da un risultato concreto",
    ready: "Demo disponibile", soon: "Prossimo pacchetto", buyer: "Preparare i documenti per il buyer", buyerDesc: "Dall'autovalutazione al Link 1 controllato.",
    remediate: "Colmare le lacune e correggere", remediateDesc: "Assegna responsabili, scadenze e criteri di chiusura.",
    expert: "Trovare l'esperto giusto", expertDesc: "Per giurisdizione, qualifica, lingua e problema.",
    notice: "Gestire una notifica d'indagine", noticeDesc: "Organizza scadenze, matrice delle prove e supporto legale.",
    active: "Risultato in corso", title: "Preparare un dossier verificabile per un buyer italiano",
    intro: "Il sistema sta trasformando ambito, prove, lacune e condivisione in un risultato verificabile. Intervieni solo quando serve una decisione o un'autorizzazione.",
    reset: "Reimposta demo", version: "Versione pratica", inProgress: "In lavorazione", stage: "Fase {n} di 8",
    nav: ["Risultati", "Archivio prove", "Rete fornitori", "Link di prova", "Professionisti", "Fonti normative", "Brief operativo", "Registri e contestazioni"], path: "Percorso del risultato",
    stages: ["Obiettivo", "Autovalutazione", "Estrazione", "Lacune e rimedi", "Conferma fatti", "Scheda multilingue", "Autorizza Link 1", "Abbina esperto"],
    qTitle: "Verifica della preparazione normativa e probatoria", qText: "Circa 3–5 minuti. Copre ambito, quadro OCSE in sei fasi, indicatori di rischio del lavoro, continuità delle prove e risposta alle richieste. Genera un elenco di lacune: non è una certificazione né un parere legale.", qEstimate: "Circa 3–5 minuti", qCoverage: "Risposte {done}/{total}",
    questions: [
      ["market", "Dove saranno venduti questi prodotti?", "Il mercato di destinazione determina i requisiti e le lingue di condivisione.", [["意大利", "Italia"], ["其他欧盟国家", "Altro paese UE"]]],
      ["facility", "Lo stabilimento produttivo è confermato?", "Le prove devono riferirsi allo stabilimento reale, non solo alla società.", [["已确认", "Confermato"], ["仍需确认", "Da confermare"]]],
      ["hours", "Sono disponibili tre mesi di riepiloghi su orari e salari?", "Sono dati essenziali per individuare il rischio e verificare le correzioni.", [["有完整汇总", "Riepilogo completo"], ["只有部分月份", "Solo alcuni mesi"], ["尚未准备", "Non ancora disponibile"]]],
      ["upstream", "I fornitori diretti dei componenti critici sono tracciabili?", "Il dossier deve mostrare copertura della filiera e informazioni mancanti.", [["全部可追溯", "Tutti tracciabili"], ["部分可追溯", "Parzialmente tracciabili"], ["尚未梳理", "Non ancora mappati"]]],
      ["upstreamEvidence", "I fornitori a monte di componenti e materie prime possono fornire una catena di prove equivalente?", "La continuità delle prove deve estendersi ai fornitori a monte critici.", [["不能", "No"], ["已有", "Già disponibile"], ["一键邀请我的供应商", "Invita il mio fornitore"]]],
      ["policy", "Esiste una politica scritta sul rischio di lavoro forzato applicabile all'impresa e ai fornitori?", "Passo OCSE 1: integrare la condotta responsabile nelle politiche e nei sistemi di gestione.", [["已具备", "Disponibile"], ["部分具备", "Parziale"], ["尚未具备", "Non disponibile"], ["不确定", "Non so"]]],
      ["owner", "Sono definiti responsabili, poteri di approvazione e percorsi di escalation?", "Rischi, rimedi, conferma delle prove e risposte esterne richiedono responsabilità chiare.", [["已具备", "Disponibile"], ["部分具备", "Parziale"], ["尚未具备", "Non disponibile"], ["不确定", "Non so"]]],
      ["riskScreening", "Il rischio è vagliato per paese o regione, settore, prodotto, materia prima e decisioni pubblicate, registrando fonte e data?", "La valutazione deve essere verificabile; il portale ufficiale è una fonte, non un canale di deposito aziendale.", [["已具备", "Disponibile"], ["部分具备", "Parziale"], ["尚未具备", "Non disponibile"], ["不确定", "Non so"]]],
      ["workerRisk", "Sono verificati commissioni di reclutamento, trattenuta dei documenti, restrizioni, debito, minacce, salari, orari e straordinari non volontari?", "Occorre rilevare gli indicatori a livello dei lavoratori, non solo leggere le politiche.", [["已具备", "Disponibile"], ["部分具备", "Parziale"], ["尚未具备", "Non disponibile"], ["不确定", "Non so"]]],
      ["grievance", "Esiste un canale di reclamo sicuro con riservatezza, divieto di ritorsioni e registri di gestione?", "Il feedback dei lavoratori sostiene identificazione, monitoraggio e rimedio.", [["已具备", "Disponibile"], ["部分具备", "Parziale"], ["尚未具备", "Non disponibile"], ["不确定", "Non so"]]],
      ["prevention", "Per i fornitori ad alto rischio esistono clausole, misure preventive e piani correttivi con responsabile e scadenza?", "Passo OCSE 3: cessare, prevenire o mitigare gli impatti negativi.", [["已具备", "Disponibile"], ["部分具备", "Parziale"], ["尚未具备", "Non disponibile"], ["不确定", "Non so"]]],
      ["monitoring", "L'efficacia delle misure preventive e correttive viene verificata periodicamente e documentata?", "Passo OCSE 4: seguire attuazione e risultati, non soltanto la richiesta inviata.", [["已具备", "Disponibile"], ["部分具备", "Parziale"], ["尚未具备", "Non disponibile"], ["不确定", "Non so"]]],
      ["communication", "L'impresa può spiegare rischi, misure, risultati verificati e lacune ancora aperte?", "Passo OCSE 5: comunicare come vengono affrontati gli impatti senza esagerare le conclusioni.", [["已具备", "Disponibile"], ["部分具备", "Parziale"], ["尚未具备", "Non disponibile"], ["不确定", "Non so"]]],
      ["remedy", "Quando emerge un danno, esiste un processo per fornire o cooperare al rimedio ed evitare un disimpegno irresponsabile?", "Passo OCSE 6: fornire o cooperare al rimedio quando appropriato.", [["已具备", "Disponibile"], ["部分具备", "Parziale"], ["尚未具备", "Non disponibile"], ["不确定", "Non so"]]],
      ["evidenceVersion", "Ogni prova conserva timestamp del server, validità e versioni storiche non sovrascrivibili?", "Serve per mostrare quale versione era valida durante la produzione di una determinata partita.", [["已具备", "Disponibile"], ["部分具备", "Parziale"], ["尚未具备", "Non disponibile"], ["不确定", "Non so"]]],
      ["batch", "Le prove sono collegate a impresa, stabilimento, fornitore, prodotto e lotto o periodo di produzione?", "L'autorità può esaminare una partita storica, non solo la situazione alla data della richiesta.", [["已具备", "Disponibile"], ["部分具备", "Parziale"], ["尚未具备", "Non disponibile"], ["不确定", "Non so"]]],
      ["response", "È possibile rispondere a buyer, dogane o autorità per prodotto e data storica, controllando la divulgazione e registrando gli accessi?", "Mostra solo prove autorizzate e pertinenti al periodo, con ambito chiaramente definito.", [["已具备", "Disponibile"], ["部分具备", "Parziale"], ["尚未具备", "Non disponibile"], ["不确定", "Non so"]]],
    ],
    qNote: "L'autovalutazione gratuita non è un parere legale.", qAction: "Genera rischio e ambito delle prove",
    extractTitle: "Estrazione tracciabile con documenti sintetici", extractText: "Questo pacchetto non accetta originali reali. Ogni campo conserva pagina e confidenza; i dati incerti non vengono condivisi.",
    extractNote: "Vengono usati solo campioni sintetici inclusi nel progetto.", extractAction: "Esegui estrazione controllata", pages: "pagine", synthetic: "sintetico", rows: "righe",
    gapsTitle: "Le prove diventano attività concrete", gapsText: "Sono stati estratti {n} fatti tracciabili. Ora le incognite diventano responsabili, scadenze e criteri di chiusura.",
    confidence: "confidenza", gapsNote: "L'AI non chiude automaticamente le azioni correttive gravi.", gapsAction: "Genera lacune e attività correttive",
    confirmTitle: "Conferma i fatti che rappresentano l'impresa", confirmText: "L'AI prepara le proposte, ma solo una persona autorizzata può confermare i fatti. La conferma non pubblica nulla.",
    source: "Fonte", machine: "estrazione automatica", gapsVisible: "{n} lacune restano visibili", confirmWarning: "Confermare i fatti noti non trasforma le incognite in rischio basso e non equivale a una certificazione.",
    confirmNote: "L'azione registra il controllo umano dell'impresa.", confirmAction: "Conferma i fatti aziendali",
    cardTitle: "Crea una scheda in tre lingue dalla stessa versione dei fatti", cardText: "Numeri, periodi e negazioni restano coerenti tra le lingue; gli originali non entrano nel Link 1.",
    cardReady: "Pronta per cinese, inglese e italiano", oneModel: "Un modello dei fatti · versioni linguistiche separate", cardNote: "La scheda richiede comunque un'autorizzazione separata per essere condivisa.", cardAction: "Genera e verifica la scheda",
    discloseTitle: "Definisci l'ambito prima di creare il Link 1", discloseText: "Il destinatario vede solo la scheda confermata; originali, filiera e incarico professionale restano esclusi.",
    recipient: "Destinatario nominativo", policy: "Regole di accesso", policyValue: "7 giorni · 3 accessi · solo scheda", discloseNote: "Senza autorizzazione non viene creato alcun link accessibile.", discloseAction: "Autorizza e crea Link 1",
    matchTitle: "Quando serve competenza professionale, trova la persona giusta", matchText: "Prima applichiamo filtri rigidi su qualifica, luogo, lingua e disponibilità. Sponsorizzazioni e commissioni non cambiano l'ordine.",
    needExpert: "Serve una revisione su lavoro e commercio UE", needExpertText: "Motivo: manca la prova sul rimborso delle commissioni di reclutamento e la divulgazione è destinata a un buyer italiano.",
    matchNote: "Questo pacchetto usa profili demo chiaramente indicati; non sono professionisti già incaricati.", matchAction: "Mostra candidati compatibili",
    doneKicker: "Risultato pronto per l'accettazione", doneTitle: "Il primo ciclo di risultato è completo", doneText: "Ambito, prove, lacune, conferme, divulgazione e passaggio al professionista formano ora una pratica tracciabile.",
    doneBar: "8 fasi su 8 completate · prova sintetica di accettazione registrata", linkReady: "Link 1 autorizzato", views: "accessi", copy: "Copia link", revoke: "Revoca link", revoked: "Link revocato", accessLog: "Registro accessi", noAccess: "Nessun accesso registrato",
    demoProfile: "Profilo demo", checked: "Directory verificata il", reviewFit: "Valuta la compatibilità prima del contatto",
    team: "Squadra di esecuzione", agents: "6 Agent principali", teamText: "Gestisci il risultato, non i singoli Agent. Ogni azione esterna richiede un'autorizzazione separata.",
    boundary: "Confine dei dati", boundaryText: "Il trattamento di originali reali non è ancora aperto. Questa demo usa solo dati sintetici e non presenta una normale API AI come ambiente illeggibile alla piattaforma.", demoRegion: "Regione demo · solo dati sintetici",
    loading: "Caricamento area risultati", unavailable: "Area di lavoro non disponibile", retry: "Riprova", collapse: "Riduci barra laterale", expand: "Espandi barra laterale",
    buyerPack: "Dossier di due diligence del buyer", facts: "Fatti confermati", openGaps: "Lacune aperte", languages: ["English", "Italiano", "中文"],
  },
  en: {
    engine: "Labour evidence delivery engine", demo: "Synthetic demo · no real originals", heroKicker: "AI-native evidence workspace", signUp: "Sign up", signIn: "Sign in", search: "Search site", searchPlaceholder: "Search features or regulatory terms", noSearchResult: "No matching content", faqButton: "FAQ",
    hero: "Turn complex requirements into evidence buyers can verify", heroText: "Dossivo organises evidence, identifies gaps, guides remediation and prepares controlled disclosure.",
    continue: "Continue evidence file", restart: "Restart demo", coreTasks: "Start from an outcome", ready: "Demo available", soon: "Future package",
    buyer: "Prepare buyer evidence", buyerDesc: "From self-check to controlled Link 1.", remediate: "Close evidence gaps", remediateDesc: "Assign owners, dates and closure conditions.",
    expert: "Find the right expert", expertDesc: "Match jurisdiction, credentials, language and issue.", notice: "Handle an authority inquiry", noticeDesc: "Organise scope, evidence matrix and professional support.",
    active: "Current outcome", title: "Prepare a verifiable file for an Italian buyer", intro: "The system turns scope, evidence, gaps and disclosure into a reviewable outcome. You intervene for decisions and authorisation.",
    reset: "Reset demo", version: "Case version", inProgress: "In progress", stage: "Step {n} of 8", nav: ["Outcomes", "Evidence archive", "Supplier network", "Evidence links", "Professionals", "Legal sources", "Action briefings", "Records and challenges"], path: "Outcome path",
    stages: ["Goal", "Self-check", "Extraction", "Gaps and remediation", "Fact confirmation", "Multilingual card", "Authorise Link 1", "Expert match"],
    qTitle: "Regulatory and evidence readiness check", qText: "About 3–5 minutes. Covers scope, the OECD six-step framework, labour-risk indicators, evidence continuity and inquiry response. It creates a gap list; it is not certification or legal advice.", qEstimate: "About 3–5 minutes", qCoverage: "{done}/{total} answered",
    questions: [
      ["market", "Where will these products be sold?", "The destination determines the rule set and disclosure languages.", [["意大利", "Italy"], ["其他欧盟国家", "Another EU country"]]],
      ["facility", "Is the production facility confirmed?", "Evidence must attach to the real facility, not only the company.", [["已确认", "Confirmed"], ["仍需确认", "Needs confirmation"]]],
      ["hours", "Are three recent months of hours and payroll summaries available?", "These facts support risk assessment and remediation evidence.", [["有完整汇总", "Complete summary"], ["只有部分月份", "Some months only"], ["尚未准备", "Not prepared"]]],
      ["upstream", "Are direct suppliers of critical components traceable?", "The file must show supply-chain coverage and unknowns.", [["全部可追溯", "All traceable"], ["部分可追溯", "Partly traceable"], ["尚未梳理", "Not mapped"]]],
      ["upstreamEvidence", "Can your upstream component and material suppliers provide an equivalent labour-evidence chain?", "Evidence continuity needs to extend to critical upstream suppliers.", [["不能", "No"], ["已有", "Already available"], ["一键邀请我的供应商", "Invite my supplier"]]],
      ["policy", "Is there a written forced-labour risk policy that applies to the company and its suppliers?", "OECD step 1: embed responsible business conduct into policies and management systems.", [["已具备", "Available"], ["部分具备", "Partial"], ["尚未具备", "Not available"], ["不确定", "Unsure"]]],
      ["owner", "Are accountable owners, approval authority and escalation paths defined?", "Risk findings, remediation, evidence confirmation and external responses need clear accountability.", [["已具备", "Available"], ["部分具备", "Partial"], ["尚未具备", "Not available"], ["不确定", "Unsure"]]],
      ["riskScreening", "Is risk screened by country or region, sector, product, material and published decisions, with source and date recorded?", "Screening should be reviewable; the official portal is a source, not a business filing channel.", [["已具备", "Available"], ["部分具备", "Partial"], ["尚未具备", "Not available"], ["不确定", "Unsure"]]],
      ["workerRisk", "Are recruitment fees, document retention, movement restrictions, debt, threats, wages, hours and involuntary overtime checked?", "Worker-level indicators must be examined in addition to policy documents.", [["已具备", "Available"], ["部分具备", "Partial"], ["尚未具备", "Not available"], ["不确定", "Unsure"]]],
      ["grievance", "Is there a safe worker grievance channel with confidentiality, non-retaliation and handling records?", "Worker feedback supports risk identification, outcome monitoring and remedy.", [["已具备", "Available"], ["部分具备", "Partial"], ["尚未具备", "Not available"], ["不确定", "Unsure"]]],
      ["prevention", "Do high-risk suppliers have contractual requirements, preventive measures and corrective plans with owners and dates?", "OECD step 3: cease, prevent or mitigate adverse impacts.", [["已具备", "Available"], ["部分具备", "Partial"], ["尚未具备", "Not available"], ["不确定", "Unsure"]]],
      ["monitoring", "Is the effectiveness of prevention and remediation checked periodically and recorded?", "OECD step 4: track implementation and results, not merely that a request was sent.", [["已具备", "Available"], ["部分具备", "Partial"], ["尚未具备", "Not available"], ["不确定", "Unsure"]]],
      ["communication", "Can the company explain identified risks, actions taken, verified results and gaps still open?", "OECD step 5: communicate how impacts are addressed without overstating conclusions.", [["已具备", "Available"], ["部分具备", "Partial"], ["尚未具备", "Not available"], ["不确定", "Unsure"]]],
      ["remedy", "When harm is found, is there a process to provide or cooperate in remedy and avoid irresponsible disengagement?", "OECD step 6: provide for or cooperate in remediation when appropriate.", [["已具备", "Available"], ["部分具备", "Partial"], ["尚未具备", "Not available"], ["不确定", "Unsure"]]],
      ["evidenceVersion", "Does each evidence item preserve a server timestamp, validity dates and non-overwritable historical versions?", "This shows which version was valid when a particular batch was produced.", [["已具备", "Available"], ["部分具备", "Partial"], ["尚未具备", "Not available"], ["不确定", "Unsure"]]],
      ["batch", "Is evidence linked to the company, facility, supplier, product and production batch or period?", "An authority may examine a historical batch rather than the situation on the inquiry date.", [["已具备", "Available"], ["部分具备", "Partial"], ["尚未具备", "Not available"], ["不确定", "Unsure"]]],
      ["response", "Can the company answer buyers, customs or authorities by product and historical date while controlling disclosure and logging access?", "Show only authorised evidence relevant to the period, with scope defined accurately.", [["已具备", "Available"], ["部分具备", "Partial"], ["尚未具备", "Not available"], ["不确定", "Unsure"]]],
    ],
    qNote: "The free self-check is not a legal conclusion.", qAction: "Generate risk and evidence scope", extractTitle: "Traceable extraction with synthetic documents", extractText: "This package accepts no real originals. Every field keeps its source and confidence; uncertain data is not disclosed.", extractNote: "Only bundled synthetic samples are processed.", extractAction: "Run controlled extraction", pages: "pages", synthetic: "synthetic", rows: "rows",
    gapsTitle: "Turn evidence into concrete work", gapsText: "{n} traceable facts were extracted. Convert unknowns into owners, dates and closure conditions.", confidence: "confidence", gapsNote: "AI never closes serious remediation automatically.", gapsAction: "Create gaps and remediation tasks",
    confirmTitle: "Confirm the facts that represent the company", confirmText: "AI prepares suggestions, but only an authorised person can confirm facts. Confirmation publishes nothing.", source: "Source", machine: "machine extraction", gapsVisible: "{n} gaps remain visible", confirmWarning: "Confirming known facts does not make unknowns low risk and is not certification.", confirmNote: "This action records the human approval gate.", confirmAction: "Confirm enterprise facts",
    cardTitle: "Create three language views from one fact version", cardText: "Numbers, periods and negative statements remain aligned; originals never enter Link 1.", cardReady: "Ready for Chinese, English and Italian", oneModel: "One fact model · separate language views", cardNote: "A separate authorisation is still required before disclosure.", cardAction: "Generate and review card",
    discloseTitle: "Define disclosure before creating Link 1", discloseText: "The recipient sees only the confirmed card; originals, supplier graph and professional engagement remain excluded.", recipient: "Named recipient", policy: "Access rules", policyValue: "7 days · 3 views · card only", discloseNote: "No accessible link is created without authorisation.", discloseAction: "Authorise and create Link 1",
    matchTitle: "When expertise is needed, find the right person", matchText: "Apply hard filters for qualification, location, language and availability. Sponsorship never changes suitability ranking.", needExpert: "EU labour and trade evidence review needed", needExpertText: "Reason: recruitment-fee repayment evidence is missing and disclosure is for an Italian buyer.", matchNote: "This package uses clearly marked demo profiles; no expert is engaged.", matchAction: "Show suitable candidates",
    doneKicker: "Outcome ready for review", doneTitle: "The first outcome loop is complete", doneText: "Scope, evidence, gaps, confirmation, disclosure and professional handoff form a traceable case.", doneBar: "8 of 8 steps complete · synthetic acceptance evidence recorded", linkReady: "Link 1 authorised", views: "views", copy: "Copy link", revoke: "Revoke link", revoked: "Link revoked", accessLog: "Access log", noAccess: "No access recorded",
    demoProfile: "Demo profile", checked: "Directory checked", reviewFit: "Review suitability before contact", team: "Execution team", agents: "6 core agents", teamText: "Manage the result, not individual agents. Every external action requires separate authorisation.", boundary: "Data boundary", boundaryText: "Real originals are not enabled. This demo uses synthetic materials only.", demoRegion: "Demo region · synthetic data only", loading: "Loading outcome workspace", unavailable: "Workspace unavailable", retry: "Try again", collapse: "Collapse sidebar", expand: "Expand sidebar", buyerPack: "Buyer evidence file", facts: "Confirmed facts", openGaps: "Open gaps", languages: ["English", "Italiano", "中文"],
  },
} as const;

const factText: Record<string, Record<Lang, [string, string, string]>> = {
  f1: { zh: ["工厂主体", "济南 Aurora 零部件有限公司", "供应商声明 · 第 1 页"], it: ["Entità dello stabilimento", "Jinan Aurora Components Co., Ltd.", "Dichiarazione fornitore · p. 1"], en: ["Facility entity", "Jinan Aurora Components Co., Ltd.", "Supplier statement · p. 1"] },
  f2: { zh: ["覆盖期间", "2026-07-01 至 2026-09-30", "工资汇总 · 第 1 页"], it: ["Periodo coperto", "01/07/2026 – 30/09/2026", "Riepilogo salari · p. 1"], en: ["Coverage period", "2026-07-01 to 2026-09-30", "Payroll summary · p. 1"] },
  f3: { zh: ["最高周工时", "58 小时", "考勤汇总 · 第 2 页"], it: ["Ore settimanali massime", "58 ore", "Riepilogo presenze · p. 2"], en: ["Maximum weekly hours", "58 hours", "Attendance summary · p. 2"] },
  f4: { zh: ["招聘费政策", "禁止收费；尚未附补偿证明", "招聘政策 · 第 4 条"], it: ["Politica sulle commissioni", "Vietate; prova di rimborso non allegata", "Politica di assunzione · §4"], en: ["Recruitment-fee policy", "Fees prohibited; repayment evidence not attached", "Recruitment policy · §4"] },
};

const agentNames = { zh: ["案件编排", "需求与范围", "证据抽取", "缺口与整改", "卡片与披露", "专业匹配"], it: ["Orchestrazione", "Requisiti e ambito", "Estrazione prove", "Lacune e rimedi", "Scheda e divulgazione", "Abbinamento esperto"], en: ["Case orchestration", "Requirements and scope", "Evidence extraction", "Gaps and remediation", "Card and disclosure", "Professional match"] };
const expertText = {
  p1: { zh: ["欧盟劳动尽调 · 进口商回应", "意大利语、英语", "可用时间待确认"], it: ["Due diligence sul lavoro UE · risposta importatore", "Italiano, inglese", "Disponibilità da confermare"], en: ["EU labour due diligence · importer response", "Italian, English", "Availability pending confirmation"] },
  p2: { zh: ["口岸贸易回应 · 证据复核", "意大利语、英语、中文合作方", "下周可安排复核"], it: ["Risposta commerciale portuale · revisione prove", "Italiano, inglese, partner mandarino", "Revisione disponibile la prossima settimana"], en: ["Port-facing trade response · evidence review", "Italian, English, Mandarin partner", "Review slot next week"] },
};
const navIcons = [CircleDot, FileCheck2, Network, KeyRound, UserRoundCheck, BookOpen, Newspaper, FileSearch];
function revealElement(element: HTMLElement | null) {
  if (!element) return;
  for (let node: HTMLElement | null = element; node; node = node.parentElement) if (node instanceof HTMLDetailsElement) node.open = true;
  element.scrollIntoView({ behavior: "smooth", block: "start" });
}
function revealSection(id: string) { revealElement(document.getElementById(id)); }
const fmt = (text: string, values: Record<string, string | number>) => Object.entries(values).reduce((out, [key, value]) => out.replace(`{${key}}`, String(value)), text);
const cn = (...values: Array<string | false | undefined>) => values.filter(Boolean).join(" ");

export function Workbench({ userName, initialLanguage = "zh" }: { userName: string; initialLanguage?: Lang }) {
  const router = useRouter();
  const [language, setLanguageState] = useState<Lang>(initialLanguage);
  useEffect(() => { setLanguageState(initialLanguage); }, [initialLanguage]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [record, setRecord] = useState<CaseRecord | null>(null);
  const [state, setState] = useState<State | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [recipient, setRecipient] = useState("buyer@demo.example");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMessage, setSearchMessage] = useState("");
  const t = COPY[language];

  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => { try { setTheme(localStorage.getItem("dossivo-theme") === "dark" ? "dark" : "light"); } catch {} }, []);
  const setLanguage = (next: Lang) => { router.push(`/${next}/`); };
  const toggleTheme = () => setTheme(current => { const next = current === "light" ? "dark" : "light"; try { localStorage.setItem("dossivo-theme", next); } catch {} return next; });
  useEffect(() => { document.documentElement.lang = language === "zh" ? "zh-CN" : language; }, [language]);


  const loadCase = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/case", { cache: "no-store" });
      const data = await readCaseResponse(response);
      setRecord(data.case); setState(data.state); setAnswers(data.state.answers ?? {});
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to load case"); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadCase(); }, [loadCase]);

  const act = useCallback(async (action: string, data: Record<string, unknown> = {}) => {
    setBusy(action); setError("");
    try {
      const idempotencyKey = `${action}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
      const response = await fetch("/api/case", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, data, idempotencyKey }) });
      const result = await readCaseResponse(response);
      setRecord(result.case); setState(result.state); if (action === "reset") setAnswers({});
      return result;
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Action failed"); throw caught; }
    finally { setBusy(null); }
  }, []);

  useEffect(() => {
    const context = (document as Document & { modelContext?: { registerTool?: (tool: unknown, options?: unknown) => unknown } }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try { void Promise.resolve(context.registerTool({ name: "advance_dossivo_demo", title: "Advance Dossivo demo", description: "Completes the next safe internal step in the synthetic buyer-evidence workflow.", inputSchema: { type: "object", properties: { action: { type: "string", enum: ["extract", "create_tasks", "confirm_facts", "prepare_card", "match_experts"] } }, required: ["action"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, execute: async (input: { action: string }) => { await act(input.action); return { status: "completed", action: input.action, syntheticDemo: true }; } }, { signal: lifecycle.signal })).catch(() => undefined); } catch { /* optional */ }
    return () => lifecycle.abort();
  }, [act]);

  const progress = useMemo(() => record ? Math.round((record.currentStep / 8) * 100) : 0, [record]);
  const current = record?.currentStep ?? 1;

  useEffect(() => {
    const revealHash = () => { const id = window.location.hash.slice(1); if (id) requestAnimationFrame(() => revealSection(id)); };
    revealHash(); window.addEventListener("hashchange", revealHash);
    return () => window.removeEventListener("hashchange", revealHash);
  }, [record?.version]);
  const restart = (record?.currentStep ?? 1) >= 8;
  const goToWork = async () => { if (restart) await act("reset"); requestAnimationFrame(() => revealSection("workspace")); };
  const goEmergency = () => revealSection("workspace");
  const searchSite = () => {
    const query = searchQuery.trim().toLocaleLowerCase();
    if (!query) return;
    const root = document.querySelector("main");
    const candidates = root?.querySelectorAll<HTMLElement>("h1,h2,h3,p,a,button,summary") ?? [];
    const match = Array.from(candidates).find((element) => element.textContent?.toLocaleLowerCase().includes(query));
    if (match) { revealElement(match); setSearchMessage(""); }
    else setSearchMessage(t.noSearchResult);
  };
  const languageNames: Record<Lang, string> = { zh: "中文", en: "English", it: "Italiano" };

  return <div lang={language === "zh" ? "zh-CN" : language} data-theme={theme} className="dossivo-app min-h-screen bg-[#07110f] text-[#e8f3ef]">
    <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_63%_-8%,rgba(30,193,151,.18),transparent_35%),linear-gradient(135deg,rgba(255,255,255,.025),transparent_35%)]" />
    <header className="sticky top-0 z-40 flex min-h-16 items-center border-b border-white/8 bg-[#07110f]/90 px-4 py-2 backdrop-blur-xl lg:px-7">
      <Button variant="ghost" size="icon" className="mr-2 text-white lg:hidden" onClick={() => setMenuOpen(true)} aria-label="Menu"><Menu /></Button>
      <a href={`/${language}/`} aria-label="Dossivo home" className="flex min-w-0 items-center gap-3"><BrandMark /><div className="flex min-w-0 items-baseline gap-2"><div className="text-[15px] font-semibold tracking-tight brand-wordmark">DOSSIVO</div><div className="hidden truncate text-[10px] font-medium uppercase tracking-[.14em] text-[#77d8bb] sm:block">{t.engine}</div></div></a>
      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <div className="relative flex items-center">
          {searchOpen && <form className="absolute right-12 top-0 z-50 w-[min(72vw,360px)]" onSubmit={(event) => { event.preventDefault(); searchSite(); }}><Input autoFocus value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); setSearchMessage(""); }} placeholder={t.searchPlaceholder} className="h-11 border-white/15 bg-[#10201b] pr-10 text-white shadow-2xl"/><button type="submit" className="absolute right-1 top-0 grid h-11 w-10 place-items-center text-[#8fe6cb]" aria-label={t.search}><ArrowRight className="h-4 w-4"/></button>{searchMessage && <div className="mt-1 rounded-lg bg-[#301f1f] px-3 py-2 text-xs text-red-100">{searchMessage}</div>}</form>}
          <Button variant="ghost" size="icon" className="text-[#9cb0aa] hover:bg-white/5 hover:text-white" onClick={() => setSearchOpen((value) => !value)} aria-label={t.search}><Search className="h-4 w-4"/></Button>
        </div>
        <Button variant="ghost" size="icon" className="hidden text-[#9cb0aa] hover:bg-white/5 hover:text-white sm:inline-flex" onClick={() => revealSection("faq")} aria-label={t.faqButton} title={t.faqButton}><CircleHelp className="h-4 w-4"/></Button>
        <div className="relative"><button className="flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/[.035] px-3 text-base" onClick={() => setLanguageMenuOpen((value) => !value)} aria-label={`Language: ${languageNames[language]}`} aria-expanded={languageMenuOpen}><LanguageFlag language={language}/><ChevronDown className="h-3.5 w-3.5 text-[#82978f]"/></button>{languageMenuOpen && <div className="absolute right-0 top-12 z-50 grid min-w-36 gap-1 rounded-xl border border-white/10 bg-[#10201b] p-1.5 shadow-2xl">{(["zh","en","it"] as Lang[]).map((lang)=><button key={lang} aria-pressed={language === lang} className={cn("flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-sm", language === lang ? "bg-[#d7fff0] text-[#07382d]" : "text-[#c0d0ca] hover:bg-white/5")} onClick={() => { setLanguage(lang); setLanguageMenuOpen(false); }}><LanguageFlag language={lang}/><span>{languageNames[lang]}</span></button>)}</div>}</div>
        <a href="/eu-buyer" className="hidden min-h-11 items-center rounded-xl px-3 text-sm text-[#c9b578] md:inline-flex">{language === "zh" ? "欧盟用户入口" : language === "it" ? "Accesso buyer UE" : "EU buyer"}</a><a href="#private-tasks" onClick={(event)=>{event.preventDefault();revealSection("private-tasks");}} className="hidden min-h-11 items-center rounded-xl px-3 text-sm md:inline-flex">{language === "zh" ? "私密任务" : "Private tasks"}</a><a href={"/account?lang="+language} aria-label={language === "zh" ? "登录 / 注册" : language === "it" ? "Accedi / Registrati" : "Sign in / Sign up"} className="inline-flex min-h-11 items-center rounded-xl bg-[#d7fff0] px-3 text-sm font-semibold text-[#07382d] hover:bg-[#baf4dd]">{language === "zh" ? "登录 / 注册" : language === "it" ? "Accedi / Registrati" : "Sign in / Sign up"}</a>
        <div className="hidden h-10 w-10 place-items-center rounded-full bg-[#d8fbef] text-xs font-bold text-[#0d5b48] lg:grid" title={userName}>{userName.slice(0, 1).toUpperCase()}</div>
      </div>
    </header>

    <div className={cn("relative mx-auto grid max-w-[1680px] transition-[grid-template-columns] duration-300", sidebarCollapsed ? "lg:grid-cols-[82px_minmax(0,1fr)]" : "lg:grid-cols-[238px_minmax(0,1fr)]")}>
      <Sidebar lang={language} open={menuOpen} collapsed={sidebarCollapsed} onClose={() => setMenuOpen(false)} onCollapse={() => setSidebarCollapsed((value) => !value)} onBriefings={() => router.push("/briefings")} current={current} progress={progress} theme={theme} onToggleTheme={toggleTheme} />
      <main className="min-w-0 px-4 py-5 sm:px-6 lg:px-8 lg:py-8"><div className="mx-auto max-w-[1220px]">
        <ComplianceHome language={language} onStart={() => void goToWork()} onEmergency={goEmergency} onPrepare={() => revealSection("private-tasks")} />

        <details className="home-secondary" id="workspace-disclosure"><summary>{language === "zh" ? "完整自检工作台" : language === "it" ? "Autovalutazione completa" : "Full readiness workspace"}<ChevronDown aria-hidden="true"/></summary><section id="workspace" className="scroll-mt-24 pt-8">
          {loading ? <LoadingScreen text={t.loading}/> : !record || !state ? <ErrorScreen title={t.unavailable} retry={t.retry} message={error || t.unavailable} onRetry={loadCase}/> : <>
          <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><div className="mb-2 flex items-center gap-2 text-xs font-medium text-[#7ce0c1]"><CircleDot className="h-3.5 w-3.5" />{t.active}</div><h2 className="max-w-3xl text-2xl font-semibold tracking-[-.035em] text-white sm:text-3xl">{t.title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[#8ca39c]">{t.intro}</p></div><div className="flex items-center gap-2"><Button variant="outline" className="border-white/10 bg-white/[.035] text-[#c7d8d2] hover:bg-white/[.07] hover:text-white" onClick={() => act("reset")} disabled={!!busy}><RefreshCcw className="h-4 w-4" />{t.reset}</Button><div className="rounded-xl border border-white/8 bg-white/[.035] px-4 py-2 text-right"><div className="text-[10px] uppercase tracking-[.15em] text-[#698078]">{t.version}</div><div className="text-sm font-semibold text-white">v{record.version}</div></div></div></div>
          {error && <div role="alert" className="mb-5 flex items-center justify-between rounded-xl border border-red-400/20 bg-red-400/8 px-4 py-3 text-sm text-red-100"><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss"><X className="h-4 w-4" /></button></div>}
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]"><div className="overflow-hidden rounded-[22px] border border-white/9 bg-[#0c1815]/92 shadow-[0_28px_80px_rgba(0,0,0,.24)]"><OutcomeHeader t={t} current={current} progress={progress} /><div className="p-5 sm:p-7">{renderStage(language, current, state, answers, setAnswers, recipient, setRecipient, act, busy)}</div></div><aside className="space-y-5"><AgentPanel lang={language} agents={state.agents} /><TrustPanel lang={language} /></aside></div>
        </>}
        </section>
        </details>
        <details className="home-secondary" id="private-task-disclosure"><summary>{language === "zh" ? "私密任务与证据准备" : language === "it" ? "Attività private e prove" : "Private tasks and evidence"}<ChevronDown aria-hidden="true"/></summary><PrivateTaskPanel language={language} /></details>
        {record && <details className="home-secondary" id="paci-disclosure"><summary>{language === "zh" ? "登记、核验与质疑记录" : language === "it" ? "Registri, verifica e contestazioni" : "Registration, verification and challenges"}<ChevronDown aria-hidden="true"/></summary><PaciPanel language={language} caseVersion={record.version} /></details>}
      </div></main>
    </div>
  </div>;
}

function renderStage(lang: Lang, current: number, state: State, answers: Record<string, string>, setAnswers: (answers: Record<string, string>) => void, recipient: string, setRecipient: (value: string) => void, act: Action, busy: string | null) {
  const t = COPY[lang];
  if (current === 2) {
    const answered = t.questions.filter((q) => answers[q[0]]).length;
    const complete = answered === t.questions.length;
    return <div>
      <StageIntro eyebrow="A02" title={t.qTitle} text={t.qText} />
      <div className="mb-5 rounded-2xl border border-[#5bd9b3]/16 bg-[#5bd9b3]/[.045] p-4">
        <div className="flex items-center justify-between gap-3 text-sm"><span className="font-medium text-[#a9eee0]">{t.qEstimate}</span><span className="text-[#7e9d93]">{fmt(t.qCoverage, { done: answered, total: t.questions.length })}</span></div>
        <Progress value={(answered / t.questions.length) * 100} className="mt-3 h-1.5 bg-white/8 [&>div]:bg-[#57ddb6]"/>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">{t.questions.map((q, index) => <div key={q[0]} className="rounded-2xl border border-white/8 bg-white/[.025] p-5"><div className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-[#173b32] text-xs font-semibold text-[#8ef0d0]">{index + 1}</span><div className="min-w-0 flex-1"><h3 className="font-medium leading-6 text-white">{q[1]}</h3><p className="mb-4 mt-1 text-xs leading-5 text-[#718880]">{q[2]}</p>{q[0] === "market" ? <MarketPicker lang={lang} value={answers.market ?? ""} onChange={(value) => setAnswers({ ...answers, market: value })}/> : <RadioGroup value={answers[q[0]] ?? ""} onValueChange={(value) => setAnswers({ ...answers, [q[0]]: value })} className="grid gap-2 sm:grid-cols-2">{q[3].map(([value, label]) => <Label key={value} className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3.5 py-3 text-sm transition", answers[q[0]] === value ? "border-[#54d7b1]/60 bg-[#54d7b1]/10 text-white" : "border-white/8 bg-[#07110f]/50 text-[#adc0ba] hover:border-white/15")}><RadioGroupItem value={value} />{label}</Label>)}</RadioGroup>}</div></div></div>)}</div>
      <ActionBar note={t.qNote} label={t.qAction} disabled={!complete} busy={busy === "save_answers"} onClick={() => act("save_answers", { answers })} />
    </div>;
  }
  if (current === 3) return <div><StageIntro eyebrow="A03" title={t.extractTitle} text={t.extractText} /><div className="grid gap-4 sm:grid-cols-3"><DemoFile name="Payroll_Q3_demo.pdf" meta={`2 ${t.pages} · ${t.synthetic}`}/><DemoFile name="Recruitment_policy_demo.pdf" meta={`4 ${t.pages} · ${t.synthetic}`}/><DemoFile name="Supplier_map_demo.xlsx" meta={`12 ${t.rows} · ${t.synthetic}`}/></div><ActionBar note={t.extractNote} label={t.extractAction} busy={busy === "extract"} onClick={() => act("extract")} /></div>;
  if (current === 4) return <div><StageIntro eyebrow="A04" title={t.gapsTitle} text={fmt(t.gapsText, { n: state.facts.length })} /><div className="overflow-hidden rounded-2xl border border-white/8">{state.facts.map((fact: any) => { const copy = factText[fact.id]?.[lang] ?? [fact.label, fact.value, fact.source]; return <div key={fact.id} className="grid gap-2 border-b border-white/7 bg-white/[.02] px-4 py-4 last:border-0 sm:grid-cols-[1fr_1.4fr_auto]"><div><div className="text-xs text-[#718880]">{copy[0]}</div><div className="mt-1 text-sm font-medium text-white">{copy[1]}</div></div><div className="text-xs leading-5 text-[#91a69f]">{copy[2]}</div><div className="text-xs font-medium text-[#7ce0c1]">{Math.round(fact.confidence * 100)}% {t.confidence}</div></div>; })}</div><ActionBar note={t.gapsNote} label={t.gapsAction} busy={busy === "create_tasks"} onClick={() => act("create_tasks")} /></div>;
  if (current === 5) return <div><StageIntro eyebrow="A04 → A05" title={t.confirmTitle} text={t.confirmText} /><div className="space-y-3">{state.facts.map((fact: any) => { const copy = factText[fact.id]?.[lang] ?? [fact.label, fact.value, fact.source]; return <div key={fact.id} className="flex items-start gap-3 rounded-xl border border-white/8 bg-white/[.025] p-4"><div className="mt-0.5 grid h-5 w-5 place-items-center rounded-md border border-[#56dbb4]/40 bg-[#56dbb4]/10"><Check className="h-3.5 w-3.5 text-[#7ce0c1]" /></div><div className="flex-1"><div className="text-sm font-medium text-white">{copy[0]}: {copy[1]}</div><div className="mt-1 text-xs text-[#718880]">{t.source}: {copy[2]} · {t.machine}</div></div></div>; })}</div><div className="mt-5 rounded-xl border border-amber-300/15 bg-amber-300/[.06] p-4"><div className="text-sm font-medium text-amber-100">{fmt(t.gapsVisible, { n: state.findings.length })}</div><p className="mt-1 text-xs leading-5 text-amber-100/60">{t.confirmWarning}</p></div><ActionBar note={t.confirmNote} label={t.confirmAction} busy={busy === "confirm_facts"} onClick={() => act("confirm_facts")} /></div>;
  if (current === 6) return <div><StageIntro eyebrow="A05" title={t.cardTitle} text={t.cardText} /><CardPreview lang={lang} cards={state.cards} empty /><ActionBar note={t.cardNote} label={t.cardAction} busy={busy === "prepare_card"} onClick={() => act("prepare_card")} /></div>;
  if (current === 7) return <div><StageIntro eyebrow="Link 1" title={t.discloseTitle} text={t.discloseText} /><CardPreview lang={lang} cards={state.cards} /><div className="mt-6 grid gap-4 sm:grid-cols-2"><div><Label htmlFor="recipient" className="mb-2 block text-xs font-medium text-[#8ca39c]">{t.recipient}</Label><Input id="recipient" value={recipient} onChange={(e) => setRecipient(e.target.value)} className="border-white/10 bg-[#07110f] text-white" /></div><div><div className="mb-2 text-xs font-medium text-[#8ca39c]">{t.policy}</div><div className="rounded-xl border border-white/8 bg-[#07110f] px-4 py-2.5 text-sm text-[#c8d7d2]">{t.policyValue}</div></div></div><ActionBar note={t.discloseNote} label={t.discloseAction} busy={busy === "authorize_link"} onClick={() => act("authorize_link", { recipient })} /></div>;
  if (current === 8 && !state.experts.length) return <div><StageIntro eyebrow="A06" title={t.matchTitle} text={t.matchText} /><LinkSuccess lang={lang} link={state.link} act={act} /><div className="mt-6 rounded-2xl border border-white/8 bg-white/[.025] p-5"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-[#7ce0c1]"/><div><div className="font-medium text-white">{t.needExpert}</div><p className="mt-1 text-sm leading-6 text-[#849b93]">{t.needExpertText}</p></div></div></div><ActionBar note={t.matchNote} label={t.matchAction} busy={busy === "match_experts"} onClick={() => act("match_experts")} /></div>;
  return <div><StageIntro eyebrow={t.doneKicker} title={t.doneTitle} text={t.doneText} /><LinkSuccess lang={lang} link={state.link} act={act} /><div className="mt-6 grid gap-4 md:grid-cols-2">{state.experts.map((expert: any) => <ExpertCard key={expert.id} lang={lang} expert={expert} />)}</div><AccessLog lang={lang} logs={state.accessLogs ?? []}/><div className="mt-6 flex items-center gap-2 rounded-xl border border-[#55d8b2]/20 bg-[#55d8b2]/8 px-4 py-3 text-sm text-[#b9f5e2]"><CheckCircle2 className="h-4 w-4"/>{t.doneBar}</div></div>;
}

function OutcomeHeader({ t, current, progress }: { t: (typeof COPY)[Lang]; current: number; progress: number }) { return <div className="border-b border-white/8 bg-[#0f201b] p-5 sm:p-7"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl border border-[#4bd2aa]/20 bg-[#4bd2aa]/10"><FileCheck2 className="h-5 w-5 text-[#7ce0c1]"/></div><div><div className="text-xs text-[#718880]">{t.buyerPack}</div><div className="mt-0.5 font-medium text-white">{t.title}</div></div></div><div className="flex items-center gap-2"><span className="rounded-full border border-[#51d5ae]/20 bg-[#51d5ae]/8 px-2.5 py-1 text-xs font-medium text-[#88eaca]">{t.inProgress}</span><span className="text-xs text-[#718880]">{fmt(t.stage, { n: current })}</span></div></div><div className="mt-5 flex items-center gap-3"><Progress value={progress} className="h-1.5 bg-white/8 [&>div]:bg-[#57ddb6]"/><span className="w-10 text-right text-xs font-medium text-[#8ddfc7]">{progress}%</span></div></div>; }

const EU_COUNTRIES = ["AT","BE","BG","HR","CY","CZ","DK","EE","FI","FR","DE","GR","HU","IE","IT","LV","LT","LU","MT","NL","PL","PT","RO","SK","SI","ES","SE"];
function MarketPicker({ lang, value, onChange }: { lang: Lang; value: string; onChange: (value: string) => void }) {
  const [expanded, setExpanded] = useState(false);
  const selected = new Set(value.split(",").filter(Boolean));
  const locale = lang === "zh" ? "zh-CN" : lang === "it" ? "it" : "en";
  const names = new Intl.DisplayNames([locale], { type: "region" });
  const toggle = (code: string) => { const next = new Set(selected); if (next.has(code)) next.delete(code); else next.add(code); onChange([...next].join(",")); };
  const otherLabel = lang === "zh" ? "及其他欧盟国家" : lang === "it" ? "e altri paesi UE" : "and other EU countries";
  const selectedLabel = selected.size ? `${selected.size} ${lang === "zh" ? "个国家已选" : lang === "it" ? "paesi selezionati" : "countries selected"}` : otherLabel;
  return <div><div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => toggle("IT")} className={cn("flex min-h-14 items-center gap-3 rounded-xl border px-4 text-left text-sm font-semibold transition", selected.has("IT") ? "border-amber-200 bg-amber-200 text-[#2f2307]" : "border-amber-300/45 bg-amber-300/8 text-amber-100 hover:bg-amber-300/14")}><CountryFlag country="it"/>{names.of("IT")}</button><button type="button" onClick={() => setExpanded((current) => !current)} className="flex min-h-14 items-center justify-between rounded-xl border border-white/10 bg-[#07110f]/50 px-4 text-left text-sm text-[#b7c7c1] hover:border-white/20"><span>{selectedLabel}</span><ChevronDown className={cn("h-4 w-4 transition", expanded && "rotate-180")}/></button></div>{expanded && <div className="mt-2 grid max-h-64 grid-cols-2 gap-1.5 overflow-y-auto rounded-xl border border-white/8 bg-[#07110f] p-2 sm:grid-cols-3">{EU_COUNTRIES.filter((code) => code !== "IT").map((code)=><button type="button" key={code} onClick={() => toggle(code)} className={cn("min-h-11 rounded-lg px-3 text-left text-xs transition", selected.has(code) ? "bg-[#5bd9b3]/16 font-medium text-[#baf5e2]" : "text-[#8fa39c] hover:bg-white/5 hover:text-white")}>{names.of(code)}</button>)}</div>}</div>;
}
function StageIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) { return <div className="mb-6"><div className="text-[11px] font-semibold uppercase tracking-[.16em] text-[#66caae]">{eyebrow}</div><h3 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">{title}</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-[#849b93]">{text}</p></div>; }
function DemoFile({ name, meta }: { name: string; meta: string }) { return <div className="rounded-2xl border border-white/8 bg-white/[.025] p-4"><FileSearch className="h-5 w-5 text-[#7ce0c1]"/><div className="mt-8 truncate text-sm font-medium text-white">{name}</div><div className="mt-1 text-xs text-[#718880]">{meta}</div></div>; }
function ActionBar({ note, label, onClick, busy, disabled }: { note: string; label: string; onClick: () => void; busy: boolean; disabled?: boolean }) { return <div className="mt-7 flex flex-col gap-4 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-[#6f847d]">{note}</p><Button onClick={onClick} disabled={busy || disabled} className="h-11 bg-[#d7fff0] px-5 font-semibold text-[#07382d] hover:bg-[#b9f4dd]">{busy ? <Loader2 className="animate-spin"/> : null}{label}<ArrowRight className="h-4 w-4"/></Button></div>; }
function CardPreview({ lang, cards, empty = false }: { lang: Lang; cards: State; empty?: boolean }) { const t = COPY[lang]; if (empty) return <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-white/12 bg-[#07110f]/50 text-center"><div><Languages className="mx-auto h-7 w-7 text-[#587169]"/><div className="mt-3 text-sm text-[#91a69f]">{t.cardReady}</div><div className="mt-1 text-xs text-[#587169]">{t.oneModel}</div></div></div>; return <Tabs defaultValue={lang}><TabsList className="bg-[#07110f] text-[#82988f]"><TabsTrigger className="gap-2" value="en"><LanguageFlag language="en"/>{t.languages[0]}</TabsTrigger><TabsTrigger className="gap-2" value="it"><LanguageFlag language="it"/>{t.languages[1]}</TabsTrigger><TabsTrigger className="gap-2" value="zh"><LanguageFlag language="zh"/>{t.languages[2]}</TabsTrigger></TabsList>{["en", "it", "zh"].map((cardLang) => <TabsContent key={cardLang} value={cardLang} className="mt-3 rounded-2xl border border-white/8 bg-[#f4fbf8] p-5 text-[#10231e]"><div className="flex items-start justify-between gap-4"><div><div className="text-[10px] font-bold uppercase tracking-[.16em] text-[#2a775f]">Dossivo · Card v1</div><h4 className="mt-2 text-lg font-semibold">{cards[cardLang].title}</h4></div><ShieldCheck className="h-6 w-6 text-[#2a9471]"/></div><p className="mt-4 text-sm leading-6 text-[#496059]">{cards[cardLang].summary}</p><div className="mt-5 grid grid-cols-2 gap-3"><Metric label={t.facts} value={cards[cardLang].verifiedFacts}/><Metric label={t.openGaps} value={cards[cardLang].openGaps}/></div><p className="mt-4 border-t border-[#ccdbd5] pt-3 text-[11px] leading-4 text-[#63766f]">{cards[cardLang].disclaimer}</p></TabsContent>)}</Tabs>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-xl bg-white p-3"><div className="text-[10px] uppercase tracking-[.12em] text-[#71847d]">{label}</div><div className="mt-1 text-xl font-semibold">{value}</div></div>; }
function LinkSuccess({ lang, link, act }: { lang: Lang; link: State; act: Action }) { if (!link) return null; const t = COPY[lang]; const url = typeof window !== "undefined" ? `${window.location.origin}/proof/${link.token}` : `/proof/${link.token}`; return <div className="rounded-2xl border border-[#4ed7ae]/20 bg-[#4ed7ae]/8 p-5"><div className="flex items-start gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#8ceccb] text-[#083c30]"><Check className="h-5 w-5"/></div><div className="min-w-0 flex-1"><div className="font-medium text-white">{link.revokedAt ? t.revoked : t.linkReady}</div><div className="mt-1 text-xs text-[#8db8aa]">{link.recipient} · {t.policyValue} · {link.remainingViews} {t.views}</div><div className="mt-3 flex gap-2"><code className="min-w-0 flex-1 truncate rounded-lg bg-black/20 px-3 py-2 text-xs text-[#adddce]">{url}</code><Button size="icon" variant="outline" className="min-h-11 min-w-11 border-white/10 bg-white/5" onClick={() => navigator.clipboard.writeText(url)} aria-label={t.copy}><Copy className="h-4 w-4"/></Button></div>{!link.revokedAt&&<Button variant="ghost" className="mt-3 min-h-11 px-0 text-red-200 hover:bg-transparent hover:text-red-100" onClick={() => void act("revoke_link")}>{t.revoke}</Button>}</div></div></div>; }
function AccessLog({ lang, logs }: { lang: Lang; logs: State[] }) { const t=COPY[lang]; return <div className="mt-6 rounded-2xl border border-white/8 bg-white/[.025] p-5"><div className="font-medium text-white">{t.accessLog}</div>{logs.length ? <div className="mt-3 space-y-2">{logs.slice(0,5).map((log)=><div key={log.id} className="flex flex-wrap justify-between gap-2 rounded-xl bg-black/15 px-3 py-2 text-xs text-[#9eb2ab]"><span>{log.visitorLabel ?? "—"}</span><span>Card v{log.cardVersion} · {new Date(log.viewedAt).toISOString()}</span></div>)}</div>:<div className="mt-2 text-sm text-[#718880]">{t.noAccess}</div>}</div>; }
function ExpertCard({ lang, expert }: { lang: Lang; expert: State }) { const t = COPY[lang]; const copy = expertText[expert.id as keyof typeof expertText]?.[lang] ?? [expert.fit, expert.languages.join(", "), expert.availability]; return <div className="rounded-2xl border border-white/8 bg-white/[.025] p-5"><div className="flex items-start justify-between gap-3"><div><div className="font-medium text-white">{expert.name}</div><div className="mt-1 text-xs text-[#718880]">{expert.organization} · {expert.location}</div></div><span className="rounded-full bg-amber-300/10 px-2 py-1 text-[10px] font-semibold text-amber-100">{t.demoProfile}</span></div><div className="mt-4 text-sm leading-6 text-[#afc1bb]">{copy[0]}</div><div className="mt-4 text-xs text-[#82978f]">{copy[1]}</div><div className="mt-4 border-t border-white/7 pt-4 text-xs text-[#718880]">{t.checked} {expert.verified} · {copy[2]}</div><Button variant="outline" className="mt-4 w-full border-white/10 bg-transparent text-white hover:bg-white/5">{t.reviewFit}<ChevronRight className="h-4 w-4"/></Button></div>; }

function Sidebar({ lang, open, collapsed, onClose, onCollapse, onBriefings, current, progress, theme, onToggleTheme }: { lang: Lang; open: boolean; collapsed: boolean; onClose: () => void; onCollapse: () => void; onBriefings: () => void; current: number; progress: number; theme: "light" | "dark"; onToggleTheme: () => void }) { const t = COPY[lang]; const themeName=lang === "zh" ? (theme === "dark" ? "深色" : "浅色") : lang === "it" ? (theme === "dark" ? "Scuro" : "Chiaro") : (theme === "dark" ? "Dark" : "Light"); return <><div className={cn("fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden", open ? "block" : "hidden")} onClick={onClose}/><aside className={cn("fixed inset-y-0 left-0 z-50 flex flex-col w-[276px] border-r border-white/8 bg-[#08130f] p-4 transition-all duration-300 lg:sticky lg:top-16 lg:z-20 lg:h-[calc(100vh-4rem)] lg:translate-x-0", open ? "translate-x-0" : "-translate-x-full", collapsed ? "lg:w-[82px] lg:px-3" : "lg:w-[238px]")}><div className="mb-4 flex items-center justify-between"><span className="font-semibold lg:hidden">Dossivo</span><Button variant="ghost" size="icon" className="lg:hidden" onClick={onClose}><X/></Button><Button variant="ghost" size="icon" className="ml-auto hidden text-[#789087] hover:bg-white/5 hover:text-white lg:inline-flex" onClick={onCollapse} title={collapsed ? t.expand : t.collapse} aria-label={collapsed ? t.expand : t.collapse}>{collapsed ? <PanelLeftOpen/> : <PanelLeftClose/>}</Button></div><button type="button" className={cn("sidebar-why", collapsed && "sidebar-why-compact")} aria-label={lang === "zh" ? "为何选择多希沃" : lang === "it" ? "Perché Dossivo" : "Why Dossivo"} title={lang === "zh" ? "为何选择多希沃" : lang === "it" ? "Perché Dossivo" : "Why Dossivo"} onClick={() => { window.dispatchEvent(new Event("dossivo:open-benefits")); onClose(); }}><Sparkles aria-hidden="true"/><span>{lang === "zh" ? (collapsed ? <>为何选<br/>多希沃</> : "为何选择多希沃") : lang === "it" ? "Perché Dossivo" : "Why Dossivo"}</span>{!collapsed && <ChevronRight aria-hidden="true"/>}</button><a className={cn("sidebar-why sidebar-pricing", collapsed && "sidebar-why-compact")} href="#subscription-pricing" aria-label={lang === "zh" ? "订阅与价格" : lang === "it" ? "Abbonamenti e prezzi" : "Plans & pricing"} title={lang === "zh" ? "订阅与价格" : lang === "it" ? "Abbonamenti e prezzi" : "Plans & pricing"} onClick={(event) => { event.preventDefault(); revealSection("subscription-pricing"); onClose(); }}><CreditCard aria-hidden="true"/><span>{lang === "zh" ? (collapsed ? <>订阅<br/>价格</> : "订阅与价格") : lang === "it" ? (collapsed ? "Prezzi" : "Abbonamenti e prezzi") : "Plans & pricing"}</span>{!collapsed && <ChevronRight aria-hidden="true"/>}</a><a className="sidebar-buyer sidebar-communication" href="/conversations" aria-describedby="communication-availability-tooltip"><UsersRound aria-hidden="true"/><span>{lang === "zh" ? "直接通信" : lang === "it" ? "Messaggi diretti" : "Direct messaging"}</span><span id="communication-availability-tooltip" role="tooltip" className="sidebar-communication-tooltip">{COMMUNICATION_REGION_ENFORCEMENT ? (lang === "zh" ? "中国大陆用户暂未开通，待完成相关手续。国际测试版已开放。" : lang === "it" ? "Non ancora disponibile per gli utenti nella Cina continentale, in attesa delle necessarie procedure. La beta internazionale è disponibile." : "Not yet available for users in mainland China, pending the necessary formalities. The international beta is open.") : (lang === "zh" ? "开发测试版暂不按地区限制，中文可正常使用。正式上线时再启用地区规则。" : lang === "it" ? "Versione di sviluppo: nessun blocco geografico. Il cinese è supportato. Le regole regionali saranno attivate al lancio." : "Development test mode: no regional restrictions. Chinese is supported. Regional rules will be enabled for commercial launch.")}</span></a><a className="sidebar-buyer sidebar-protocol" href="/protocol" onClick={onClose} title={lang === "zh" ? "Protocol · 协议" : "Protocol"}><ScrollText aria-hidden="true"/><span>Protocol</span></a><div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto"><nav className="space-y-1">{t.nav.map((label, index) => { const Icon = navIcons[index]; return <button key={label} title={collapsed ? label : undefined} onClick={() => { if (index === 1) revealSection("evidence-continuity"); if (index === 0) revealSection("workspace"); if (index === 2) revealSection("compliance-scope"); if (index === 3) revealSection("evidence-link-example"); if (index === 4) revealSection("workspace"); if (index === 5) revealSection("regulatory-facts"); if (index === 6) onBriefings(); if (index === 7) { revealSection("paci-records"); onClose(); } }} className={cn("flex min-h-11 w-full items-center rounded-xl py-2.5 text-left text-sm transition", collapsed ? "justify-center px-0" : "gap-3 px-3", index === 0 ? "bg-[#17342c] font-medium text-white" : "text-[#7d948c] hover:bg-white/5 hover:text-white")}><Icon className="h-4 w-4 shrink-0"/><span className={cn(collapsed && "lg:hidden")}>{label}</span></button>; })}</nav><div className={cn("mt-7 border-t border-white/8 pt-5", collapsed && "lg:hidden")}><div className="mb-3 flex items-center justify-between text-[10px] font-semibold uppercase tracking-[.14em] text-[#597069]"><span>{t.path}</span><span>{progress}%</span></div><ol>{t.stages.map((label, index) => { const step = index + 1; const done = step < current; const active = step === current; return <li key={label} className="relative flex gap-3 pb-3 last:pb-0"><div className="relative z-10 grid h-5 w-5 shrink-0 place-items-center rounded-full border border-white/10 bg-[#0b1713]">{done ? <Check className="h-3 w-3 text-[#7ce0c1]"/> : <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-[#7ce0c1]" : "bg-[#344941]")}/>}</div>{index < t.stages.length - 1 && <div className={cn("absolute left-[9.5px] top-5 h-[calc(100%-20px)] w-px", done ? "bg-[#3fa787]" : "bg-white/8")}/>}<span className={cn("pt-0.5 text-xs", active ? "font-medium text-white" : done ? "text-[#8bb0a4]" : "text-[#50645d]")}>{label}</span></li>; })}</ol></div>{collapsed && <div className="mt-6 hidden flex-col items-center gap-2 lg:flex"><div className="grid h-10 w-10 place-items-center rounded-full border border-[#52d6af]/20 text-xs font-semibold text-[#89e8ca]">{progress}%</div></div>}</div><div className="sidebar-footer"><button type="button" className={cn("sidebar-theme theme-toggle", collapsed && "sidebar-theme-compact")} onClick={onToggleTheme} aria-label={lang === "zh" ? "切换明暗主题" : lang === "it" ? "Cambia tema chiaro e scuro" : "Switch light and dark theme"} aria-pressed={theme === "dark"} title={lang === "zh" ? "切换明暗主题" : lang === "it" ? "Cambia tema chiaro e scuro" : "Switch light and dark theme"}>{theme === "dark" ? <Moon aria-hidden="true"/> : <Sun aria-hidden="true"/>}<span>{!collapsed && <>{lang === "zh" ? "外观" : lang === "it" ? "Aspetto" : "Appearance"} · </>}{themeName}</span></button></div></aside></>; }
function AgentPanel({ lang, agents }: { lang: Lang; agents: any[] }) { const t = COPY[lang]; return <div className="rounded-[20px] border border-white/8 bg-[#0c1815]/90 p-5"><div className="flex items-center justify-between"><div><div className="text-xs text-[#718880]">{t.team}</div><h3 className="mt-1 font-medium text-white">{t.agents}</h3></div><Sparkles className="h-4 w-4 text-[#7ce0c1]"/></div><div className="mt-4 space-y-2">{agents.map((agent, index) => <div key={agent[0]} className="flex items-center gap-3 rounded-xl border border-white/6 bg-white/[.02] px-3 py-2.5"><span className="w-8 text-[10px] font-bold text-[#6dd0b3]">{agent[0]}</span><span className="min-w-0 flex-1 truncate text-xs text-[#a9bcb5]">{agentNames[lang][index]}</span><span className={cn("h-1.5 w-1.5 rounded-full", agent[2] === "completed" ? "bg-[#58dcb5]" : agent[2] === "ready" || agent[2] === "active" ? "bg-amber-300" : "bg-[#3a4d46]")}/></div>)}</div><p className="mt-4 text-[11px] leading-5 text-[#5f756d]">{t.teamText}</p></div>; }
function TrustPanel({ lang }: { lang: Lang }) { const t = COPY[lang]; return <div className="rounded-[20px] border border-white/8 bg-[#0c1815]/90 p-5"><div className="flex items-center gap-2 text-sm font-medium text-white"><LockKeyhole className="h-4 w-4 text-[#7ce0c1]"/>{t.boundary}</div><p className="mt-3 text-xs leading-5 text-[#718880]">{t.boundaryText}</p><div className="mt-4 flex items-center gap-2 text-[11px] text-[#8fb4a8]"><Globe2 className="h-3.5 w-3.5"/>{t.demoRegion}</div></div>; }
function BrandMark() { const stars = [[34,30],[47,28],[60,31],[70,39],[34,42],[34,54],[34,66],[34,78],[47,80],[60,77],[70,69]]; return <svg viewBox="0 0 104 104" className="h-9 w-9 shrink-0" aria-hidden="true"><rect width="104" height="104" rx="16" fill="#073cab"/>{stars.map(([x,y]) => <path key={`${x}-${y}`} d="M0 -5 1.47 -2.02 4.76 -1.55 2.38 .77 2.94 4.05 0 2.5 -2.94 4.05 -2.38 .77 -4.76 -1.55 -1.47 -2.02Z" transform={`translate(${x} ${y})`} fill="#ffcf32"/>)}{[49,55,61].map(y => <circle key={y} cx="75" cy={y} r="1.9" fill="#ffcf32"/>)}</svg>; }

function LoadingScreen({ text }: { text: string }) { return <div className="grid min-h-64 place-items-center bg-[#07110f] text-[#d7fff0]"><div className="text-center"><BrandMark/><Loader2 className="mx-auto mt-5 h-5 w-5 animate-spin"/><div className="mt-3 text-sm text-[#789087]">{text}</div></div></div>; }
function ErrorScreen({ title, retry, message, onRetry }: { title: string; retry: string; message: string; onRetry: () => void }) { return <div className="grid min-h-64 place-items-center bg-[#07110f] p-6 text-white"><div className="max-w-md text-center"><h1 className="text-xl font-semibold">{title}</h1><p className="mt-2 text-sm text-[#849b93]">{message}</p><Button className="mt-5" onClick={onRetry}>{retry}</Button></div></div>; }
