'use client';
import {UIText,LocaleLink} from '@/app/ui-language';
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Download, FileClock, History, Loader2, MessageSquare, RefreshCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RegistrationStatus } from "./registration-status";
import { SnapshotInspector } from "./snapshot-inspector";
import type { ProductLang } from "./compliance-home";

type Snapshot = {
  id: string;
  case_version: number;
  created_at: string;
  source: "SELF_REPORTED";
  coverage: "PARTIAL";
  claim_assessment: "UNRESOLVED";
  verification: "UNVERIFIED";
  dispute: "NONE";
  visibility: "PRIVATE";
  record_count: number;
};
type Operation = "REGISTER_DOSSIER" | "OPEN_CHALLENGE" | "RESPOND_CHALLENGE" | "WITHDRAW_CHALLENGE";
type ChallengeReason = "INCORRECT_DATA" | "OUTDATED_EVIDENCE" | "MISSING_CONTEXT" | "OTHER";
type ChallengeEvent = {
  challenge_id: string;
  kind: "OPENED" | "RESPONDED" | "WITHDRAWN";
  comment: string;
  sequence: number;
  created_at: string;
};
type Challenge = {
  id: string;
  snapshot_id: string;
  reason: ChallengeReason;
  comment?: string | null;
  business_status: "OPEN" | "RESPONDED" | "WITHDRAWN";
  paci_status: null;
  response_count: number;
  created_at: string;
  history?: ChallengeEvent[];
};
type BridgeState = {
  connection: "NOT_CONNECTED";
  synthetic_demo: true;
  case_version: number;
  current_snapshot: Snapshot | null;
  snapshots: Snapshot[];
  requests: { id: string; operation: Operation; status: "PENDING" | "REGISTERED"; case_version: number; created_at: string }[];
  challenges: Challenge[];
};
type Action =
  | { action: "prepare_registration"; case_version: number }
  | { action: "open_challenge"; snapshot_id: string; reason: ChallengeReason; comment?: string }
  | { action: "record_response"; challenge_id: string; comment: string }
  | { action: "withdraw_challenge"; challenge_id: string };
type ErrorKey = "auth" | "conflict" | "load" | "action" | "download" | "responseRequired";
type NoticeKey = "saved" | "challengeSaved" | "responseSaved" | "withdrawalSaved";

const REASONS: ChallengeReason[] = ["INCORRECT_DATA", "OUTDATED_EVIDENCE", "MISSING_CONTEXT", "OTHER"];
const OPERATIONS: Operation[] = ["REGISTER_DOSSIER", "OPEN_CHALLENGE", "RESPOND_CHALLENGE", "WITHDRAW_CHALLENGE"];

const COPY = {
  zh: {
    title: "PACIscan 记录与质疑", demo: "合成演示", connection: "PACIscan 登记准备",
    intro: "保存当前资料版本，查看历史记录，并对具体版本提出质疑。",
    boundary: "准备资料为合成示例；登记回执、业务质疑与核验状态分别记录。实际连接配置见下方登记同步区域。",
    currentVersion: "当前资料版本", save: "保存当前版本，等待登记", saving: "正在保存…", alreadySaved: "当前版本已保存",
    saved: "资料版本已在 DOSSIVO 保存。", notSaved: "当前版本尚未保存为待登记资料。",
    loading: "正在读取记录…", refresh: "刷新记录", retry: "重试读取", reload: "刷新工作台", signIn: "登录",
    errors: {
      auth: "请先登录，再读取或保存你的资料。",
      conflict: "资料版本已变更，请刷新工作台后继续。",
      load: "暂时无法读取 PACIscan 相关记录，请重试。",
      action: "操作结果尚未确认，请先刷新记录，再决定是否重试。",
      download: "暂时无法下载待登记资料，请重试。",
      responseRequired: "请填写回复内容，最多 1,000 个字符。",
    },
    versions: "已保存版本", version: "版本", noVersions: "保存一个版本后，即可查看记录、下载资料或提出质疑。",
    created: "保存时间", recordCount: "记录数", source: "来源", sourceValue: "企业自述",
    coverage: "覆盖范围", coverageValue: "部分覆盖", verification: "核验", verificationValue: "尚未核验",
    assessment: "声明评估", assessmentValue: "尚无结论", visibility: "可见性", visibilityValue: "私有",
    download: "下载待登记资料", downloading: "正在准备下载…", exportNote: "下载包含所选版本的待登记资料，不代表 PACIscan 已完成登记或核验。",
    pending: "等待提交 PACIscan", pendingLabel: "待提交",
    operations: { REGISTER_DOSSIER: "资料登记", OPEN_CHALLENGE: "提出质疑", RESPOND_CHALLENGE: "记录回复", WITHDRAW_CHALLENGE: "撤回质疑" },
    challenges: "所选版本的质疑", challengeNote: "以下为 DOSSIVO 中的业务处理状态，不是 PACIscan 裁决。尚未配置独立复核人，回复不会自动结案。",
    noChallenges: "此版本尚无本地质疑记录。", newChallenge: "对此版本提出质疑", reason: "质疑原因",
    reasons: { INCORRECT_DATA: "数据不准确", OUTDATED_EVIDENCE: "证据已过时", MISSING_CONTEXT: "缺少必要背景", OTHER: "其他" },
    comment: "补充说明（选填）", commentHint: "说明需要核对的具体内容；仅使用合成示例。", characters: "字符",
    submitChallenge: "保存质疑", submittingChallenge: "正在保存质疑…", challengeSaved: "质疑已在 DOSSIVO 保存，PACIscan 待登记。",
    businessStatus: "业务状态", states: { OPEN: "待回复", RESPONDED: "已有业务回复", WITHDRAWN: "已在本地撤回" },
    paciStatus: "PACIscan 状态", noDecision: "未收到裁决", responses: "业务回复数", raised: "提出时间",
    history: "回复与撤回记录", replyEntry: "业务回复", withdrawalEntry: "本地撤回记录",
    reply: "添加业务回复", responseLabel: "回复内容", responseHint: "补充事实或解释；这条回复不会裁决质疑。", saveResponse: "保存回复", savingResponse: "正在保存回复…", cancel: "取消",
    responseSaved: "业务回复已保存，PACIscan 待登记；质疑未被裁决。",
    withdraw: "撤回此质疑", withdrawing: "正在记录撤回…", withdrawalSaved: "撤回已在 DOSSIVO 记录，PACIscan 待登记。",
  },
  en: {
    title: "PACIscan records and challenges", demo: "Synthetic demo", connection: "PACIscan registration preparation",
    intro: "Save this version, review its history and raise a challenge against a specific version.",
    boundary: "Preparation uses synthetic examples. Registration receipts, business challenges and verification are recorded separately. See registration sync below for connection configuration.",
    currentVersion: "Current dossier version", save: "Save version for registration", saving: "Saving…", alreadySaved: "Current version saved",
    saved: "Dossier version saved in DOSSIVO.", notSaved: "This version has not been saved for registration.",
    loading: "Loading records…", refresh: "Refresh records", retry: "Try loading again", reload: "Refresh workspace", signIn: "Sign in",
    errors: {
      auth: "Sign in to view or save your dossier.",
      conflict: "The dossier version has changed. Refresh the workspace to continue.",
      load: "PACIscan-related records are unavailable. Please try again.",
      action: "The result is not confirmed. Refresh the records before deciding whether to retry.",
      download: "The registration draft could not be downloaded. Please try again.",
      responseRequired: "Enter a reply of up to 1,000 characters.",
    },
    versions: "Saved versions", version: "Version", noVersions: "Save a version to view its record, download the draft or raise a challenge.",
    created: "Saved at", recordCount: "Records", source: "Source", sourceValue: "Self-reported by the business",
    coverage: "Coverage", coverageValue: "Partial", verification: "Verification", verificationValue: "Unverified",
    assessment: "Claim assessment", assessmentValue: "Unresolved", visibility: "Visibility", visibilityValue: "Private",
    download: "Download registration draft", downloading: "Preparing download…", exportNote: "The download contains the selected registration draft. It does not confirm PACIscan registration or verification.",
    pending: "Awaiting submission to PACIscan", pendingLabel: "Pending",
    operations: { REGISTER_DOSSIER: "Dossier registration", OPEN_CHALLENGE: "Open challenge", RESPOND_CHALLENGE: "Record reply", WITHDRAW_CHALLENGE: "Withdraw challenge" },
    challenges: "Challenges for this version", challengeNote: "These are business handling statuses in DOSSIVO, not PACIscan decisions. No independent reviewer is configured; a reply does not close a challenge.",
    noChallenges: "No local challenges have been recorded for this version.", newChallenge: "Challenge this version", reason: "Reason",
    reasons: { INCORRECT_DATA: "Incorrect data", OUTDATED_EVIDENCE: "Outdated evidence", MISSING_CONTEXT: "Missing context", OTHER: "Other" },
    comment: "Additional context (optional)", commentHint: "Identify the information to review. Use synthetic examples only.", characters: "characters",
    submitChallenge: "Save challenge", submittingChallenge: "Saving challenge…", challengeSaved: "Challenge saved in DOSSIVO. PACIscan registration is pending.",
    businessStatus: "Business status", states: { OPEN: "Awaiting reply", RESPONDED: "Business reply recorded", WITHDRAWN: "Withdrawn locally" },
    paciStatus: "PACIscan status", noDecision: "No decision received", responses: "Business replies", raised: "Raised at",
    history: "Replies and withdrawals", replyEntry: "Business reply", withdrawalEntry: "Local withdrawal",
    reply: "Add business reply", responseLabel: "Reply", responseHint: "Add facts or an explanation. This reply does not decide the challenge.", saveResponse: "Save reply", savingResponse: "Saving reply…", cancel: "Cancel",
    responseSaved: "Business reply saved; PACIscan registration is pending. No decision has been made on the challenge.",
    withdraw: "Withdraw this challenge", withdrawing: "Recording withdrawal…", withdrawalSaved: "Withdrawal recorded in DOSSIVO. PACIscan registration is pending.",
  },
  it: {
    title: "Registrazioni e contestazioni PACIscan", demo: "Demo sintetica", connection: "Preparazione registrazione PACIscan",
    intro: "Salva questa versione, consulta lo storico e contesta una versione specifica.",
    boundary: "La preparazione usa esempi sintetici. Ricevute, contestazioni operative e verifica sono separate. La configurazione è indicata nella sezione di sincronizzazione.",
    currentVersion: "Versione attuale del dossier", save: "Salva versione da registrare", saving: "Salvataggio…", alreadySaved: "Versione attuale salvata",
    saved: "Versione del dossier salvata in DOSSIVO.", notSaved: "Questa versione non è ancora stata salvata per la registrazione.",
    loading: "Caricamento delle registrazioni…", refresh: "Aggiorna registrazioni", retry: "Riprova a caricare", reload: "Aggiorna area di lavoro", signIn: "Accedi",
    errors: {
      auth: "Accedi per consultare o salvare il dossier.",
      conflict: "La versione del dossier è cambiata. Aggiorna l'area di lavoro per continuare.",
      load: "Le registrazioni relative a PACIscan non sono disponibili. Riprova.",
      action: "L'esito non è confermato. Aggiorna le registrazioni prima di decidere se riprovare.",
      download: "Impossibile scaricare la bozza da registrare. Riprova.",
      responseRequired: "Inserisci una risposta di massimo 1.000 caratteri.",
    },
    versions: "Versioni salvate", version: "Versione", noVersions: "Salva una versione per consultarla, scaricare la bozza o aprire una contestazione.",
    created: "Salvata il", recordCount: "Registrazioni", source: "Fonte", sourceValue: "Dichiarazione dell'impresa",
    coverage: "Copertura", coverageValue: "Parziale", verification: "Verifica", verificationValue: "Non verificata",
    assessment: "Valutazione delle dichiarazioni", assessmentValue: "Non conclusa", visibility: "Visibilità", visibilityValue: "Privata",
    download: "Scarica bozza da registrare", downloading: "Preparazione del download…", exportNote: "Il file contiene la bozza della versione selezionata. Non conferma la registrazione o la verifica in PACIscan.",
    pending: "In attesa di invio a PACIscan", pendingLabel: "In attesa",
    operations: { REGISTER_DOSSIER: "Registrazione dossier", OPEN_CHALLENGE: "Apertura contestazione", RESPOND_CHALLENGE: "Registrazione risposta", WITHDRAW_CHALLENGE: "Ritiro contestazione" },
    challenges: "Contestazioni su questa versione", challengeNote: "Gli stati indicano la gestione operativa in DOSSIVO, non decisioni di PACIscan. Non è configurato un revisore indipendente; una risposta non chiude la contestazione.",
    noChallenges: "Nessuna contestazione locale registrata per questa versione.", newChallenge: "Contesta questa versione", reason: "Motivo",
    reasons: { INCORRECT_DATA: "Dati inesatti", OUTDATED_EVIDENCE: "Prove non aggiornate", MISSING_CONTEXT: "Contesto mancante", OTHER: "Altro" },
    comment: "Ulteriori dettagli (facoltativi)", commentHint: "Indica quali informazioni verificare. Usa solo esempi sintetici.", characters: "caratteri",
    submitChallenge: "Salva contestazione", submittingChallenge: "Salvataggio…", challengeSaved: "Contestazione salvata in DOSSIVO. Registrazione PACIscan in attesa.",
    businessStatus: "Stato operativo", states: { OPEN: "In attesa di risposta", RESPONDED: "Risposta operativa registrata", WITHDRAWN: "Ritirata localmente" },
    paciStatus: "Stato PACIscan", noDecision: "Nessuna decisione ricevuta", responses: "Risposte operative", raised: "Aperta il",
    history: "Risposte e ritiri", replyEntry: "Risposta operativa", withdrawalEntry: "Ritiro locale",
    reply: "Aggiungi risposta operativa", responseLabel: "Risposta", responseHint: "Aggiungi fatti o spiegazioni. La risposta non decide la contestazione.", saveResponse: "Salva risposta", savingResponse: "Salvataggio…", cancel: "Annulla",
    responseSaved: "Risposta operativa salvata; registrazione PACIscan in attesa. Nessuna decisione sulla contestazione.",
    withdraw: "Ritira questa contestazione", withdrawing: "Registrazione del ritiro…", withdrawalSaved: "Ritiro registrato in DOSSIVO. Registrazione PACIscan in attesa.",
  },
} satisfies Record<ProductLang, unknown>;

const fieldClass = "w-full rounded-xl border border-white/12 bg-[#07110f] px-3 py-3 text-sm text-[#e8f3ef] placeholder:text-[#758d84] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79e1c1] disabled:opacity-50";
const secondaryButton = "h-auto min-h-11 whitespace-normal border-white/12 bg-white/[.035] text-[#c7d8d2] hover:bg-white/[.07] hover:text-white";
const primaryButton = "h-auto min-h-11 whitespace-normal bg-[#d7fff0] text-[#07382d] hover:bg-[#baf4dd]";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function isSnapshot(value: unknown): value is Snapshot {
  return isObject(value) && typeof value.id === "string" && isCount(value.case_version)
    && isDate(value.created_at) && value.source === "SELF_REPORTED" && value.coverage === "PARTIAL"
    && value.claim_assessment === "UNRESOLVED" && value.verification === "UNVERIFIED"
    && value.dispute === "NONE" && value.visibility === "PRIVATE" && isCount(value.record_count);
}

function isChallengeEvent(value: unknown): value is ChallengeEvent {
  return isObject(value) && typeof value.challenge_id === "string"
    && ["OPENED", "RESPONDED", "WITHDRAWN"].includes(value.kind as string)
    && typeof value.comment === "string" && isCount(value.sequence) && isDate(value.created_at);
}

function isBridgeState(value: unknown): value is BridgeState {
  if (!isObject(value) || value.error || value.connection !== "NOT_CONNECTED" || value.synthetic_demo !== true
    || !isCount(value.case_version) || !(value.current_snapshot === null || isSnapshot(value.current_snapshot))
    || !Array.isArray(value.snapshots) || !value.snapshots.every(isSnapshot)
    || !Array.isArray(value.requests) || !Array.isArray(value.challenges)) return false;
  return value.requests.every((item: unknown) => isObject(item) && typeof item.id === "string"
    && OPERATIONS.includes(item.operation as Operation) && ["PENDING", "REGISTERED"].includes(item.status as string)
    && isCount(item.case_version) && isDate(item.created_at))
    && value.challenges.every((item: unknown) => isObject(item) && typeof item.id === "string"
      && typeof item.snapshot_id === "string" && REASONS.includes(item.reason as ChallengeReason)
      && (item.comment == null || typeof item.comment === "string")
      && ["OPEN", "RESPONDED", "WITHDRAWN"].includes(item.business_status as string)
      && item.paci_status === null && isCount(item.response_count) && isDate(item.created_at)
      && (item.history === undefined || (Array.isArray(item.history) && item.history.every(isChallengeEvent))));
}

class BridgeError extends Error {
  constructor(readonly status: number) { super("PACI bridge request failed"); }
}

async function readJson(response: Response): Promise<unknown> {
  if (!response.ok) throw new BridgeError(response.status);
  return response.json();
}

function errorKey(error: unknown, fallback: ErrorKey): ErrorKey {
  if (error instanceof BridgeError && error.status === 401) return "auth";
  if (error instanceof BridgeError && error.status === 409) return "conflict";
  return fallback;
}

export function PaciPanel({ language, caseVersion }: { language: ProductLang; caseVersion: number }) {
  const t = COPY[language];
  const fieldId = useId();
  const [data, setData] = useState<BridgeState | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<ErrorKey | null>(null);
  const [notice, setNotice] = useState<NoticeKey | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [reason, setReason] = useState<ChallengeReason>("INCORRECT_DATA");
  const [comment, setComment] = useState("");
  const [replyId, setReplyId] = useState<string | null>(null);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const sequence = useRef(0);
  const readController = useRef<AbortController | null>(null);
  const actionLock = useRef(false);
  const attempts = useRef(new Map<string, string>());

  useEffect(() => {
    const controller = new AbortController();
    const requestSequence = ++sequence.current;
    readController.current = controller;
    async function load() {
      setLoading(true);
      setError(null);
      setNotice(null);
      try {
        const response = await fetch("/api/paci-bridge", { cache: "no-store", credentials: "same-origin", signal: controller.signal });
        const result = await readJson(response);
        if (!isBridgeState(result)) throw new Error("Invalid bridge response");
        if (requestSequence !== sequence.current || controller.signal.aborted) return;
        setData(result);
        if (result.case_version !== caseVersion) setError("conflict");
      } catch (caught) {
        if (controller.signal.aborted || requestSequence !== sequence.current) return;
        setData(null);
        setError(errorKey(caught, "load"));
      } finally {
        if (!controller.signal.aborted && requestSequence === sequence.current) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [caseVersion, refreshIndex]);

  const snapshots = data ? [...data.snapshots] : [];
  if (data?.current_snapshot && !snapshots.some((item) => item.id === data.current_snapshot?.id)) snapshots.push(data.current_snapshot);
  snapshots.sort((a, b) => b.case_version - a.case_version || Date.parse(b.created_at) - Date.parse(a.created_at));
  const savedCurrent = snapshots.find((item) => item.case_version === caseVersion);
  const selected = snapshots.find((item) => item.id === selectedId) ?? savedCurrent ?? snapshots[0];
  const challenges = data?.challenges.filter((item) => item.snapshot_id === selected?.id) ?? [];
  const versionMismatch = Boolean(data && data.case_version !== caseVersion);
  const disabled = loading || Boolean(busy) || !data || versionMismatch || error === "conflict" || error === "auth";
  const formatDate = (value: string) => new Intl.DateTimeFormat(
    { zh: "zh-CN", en: "en-GB", it: "it-IT" }[language],
    { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" },
  ).format(new Date(value)) + " (Europe/Berlin)";

  function refresh() { setRefreshIndex((value) => value + 1); }

  async function mutate(payload: Action, success: NoticeKey, busyKey: string): Promise<boolean> {
    if (actionLock.current || disabled) return false;
    actionLock.current = true;
    readController.current?.abort();
    const requestSequence = ++sequence.current;
    const fingerprint = JSON.stringify(payload);
    setBusy(busyKey);
    setNotice(null);
    setError(null);
    try {
      // An uncertain network result can be retried with the same operation key.
      const key = attempts.current.get(fingerprint) ?? crypto.randomUUID();
      attempts.current.set(fingerprint, key);
      const response = await fetch("/api/paci-bridge", {
        method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, idempotency_key: key }),
      });
      const result = await readJson(response);
      if (!isBridgeState(result)) throw new Error("Invalid bridge response");
      attempts.current.delete(fingerprint);
      if (requestSequence !== sequence.current) { refresh(); return false; }
      setData(result);
      if (result.case_version !== caseVersion) setError("conflict");
      else setNotice(success);
      if (payload.action === "prepare_registration") {
        const saved = result.snapshots.find((item) => item.case_version === payload.case_version) ?? result.current_snapshot;
        if (saved) setSelectedId(saved.id);
      }
      return true;
    } catch (caught) {
      if (requestSequence !== sequence.current) { refresh(); return false; }
      const nextError = errorKey(caught, "action");
      setError(nextError);
      if (nextError === "auth") setData(null);
      if (caught instanceof BridgeError && caught.status >= 400 && caught.status < 500) attempts.current.delete(fingerprint);
      return false;
    } finally {
      actionLock.current = false;
      setBusy(null);
    }
  }

  async function download(snapshotId: string) {
    if (actionLock.current || disabled) return;
    actionLock.current = true;
    setBusy(`download:${snapshotId}`);
    setError(null);
    setNotice(null);
    try {
      const response = await fetch(`/api/paci-bridge?export=snapshot&snapshot_id=${encodeURIComponent(snapshotId)}`, {
        cache: "no-store", credentials: "same-origin",
      });
      const result = await readJson(response);
      if (!isObject(result) || result.error || result.format !== "dossivo-registration-draft/0.1"
        || result.proof_package !== null || !isObject(result.manifest)
        || result.manifest.format !== "dossivo-paci-dossier/0.1" || result.manifest.dossier_id !== snapshotId
        || result.manifest.synthetic_demo !== true) throw new Error("Invalid registration draft");
      const url = URL.createObjectURL(new Blob([JSON.stringify(result, null, 2)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "dossivo-registration-draft.json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (caught) {
      const nextError = errorKey(caught, "download");
      setError(nextError);
      if (nextError === "auth") setData(null);
    } finally {
      actionLock.current = false;
      setBusy(null);
    }
  }

  async function openChallenge(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || comment.length > 1000) return;
    const saved = await mutate({ action: "open_challenge", snapshot_id: selected.id, reason, comment: comment.trim() || undefined }, "challengeSaved", "challenge");
    if (saved) setComment("");
  }

  async function respond(event: FormEvent<HTMLFormElement>, challengeId: string) {
    event.preventDefault();
    const reply = (replies[challengeId] ?? "").trim();
    if (!reply || reply.length > 1000) { setError("responseRequired"); return; }
    const saved = await mutate({ action: "record_response", challenge_id: challengeId, comment: reply }, "responseSaved", `reply:${challengeId}`);
    if (saved) {
      setReplies((previous) => ({ ...previous, [challengeId]: "" }));
      setReplyId(null);
    }
  }

  return <section id="paci-records" aria-labelledby={`${fieldId}-title`} className="mt-6 min-w-0 scroll-mt-24 rounded-[22px] border border-white/9 bg-[#0c1815]/92 p-5 sm:p-7">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <div className="mb-3 flex flex-wrap gap-2 text-xs font-medium text-amber-100">
          <span className="rounded-full border border-amber-200/20 bg-amber-200/8 px-3 py-1.5"><UIText>{t.demo}</UIText></span>
          <span className="rounded-full border border-white/12 bg-white/[.035] px-3 py-1.5 text-[#b7c9c2]"><UIText>{t.connection}</UIText></span>
        </div>
        <h2 id={`${fieldId}-title`} className="flex items-center gap-2 text-xl font-semibold text-white"><FileClock className="h-5 w-5 shrink-0 text-[#8fb5a8]" aria-hidden="true"/><UIText>{t.title}</UIText></h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[#a8bdb5]"><UIText>{t.intro}</UIText></p>
      </div>
      <Button type="button" variant="outline" className={secondaryButton} disabled={loading || Boolean(busy)} onClick={refresh} aria-busy={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true"/> : <RefreshCcw className="h-4 w-4" aria-hidden="true"/>}<UIText>{t.refresh}</UIText>
      </Button>
    </div>
    <p className="mt-4 rounded-xl border border-amber-200/15 bg-amber-200/[.035] px-4 py-3 text-xs leading-6 text-[#c7bd9f]"><UIText>{t.boundary}</UIText></p>

    {error && <div role="alert" className="mt-4 flex flex-col gap-3 rounded-xl border border-red-300/20 bg-red-300/[.055] p-4 text-sm leading-6 text-red-100 sm:flex-row sm:items-center sm:justify-between">
      <p><UIText>{t.errors[error]}</UIText></p>
      {error === "auth" ? <LocaleLink href="/signin-with-chatgpt?return_to=%2F%23paci-records" target="_top" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg border border-red-200/25 px-4 font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"><UIText>{t.signIn}</UIText></LocaleLink>
        : error === "conflict" ? <Button type="button" variant="outline" className={secondaryButton} disabled={Boolean(busy)} onClick={() => window.location.reload()}><UIText>{t.reload}</UIText></Button>
          : <Button type="button" variant="outline" className={secondaryButton} disabled={loading || Boolean(busy)} onClick={refresh}><UIText>{t.retry}</UIText></Button>}
    </div>}
    <div role="status" aria-live="polite" aria-atomic="true">
      {loading && <p className="mt-4 flex items-center gap-2 text-sm text-[#a8bdb5]"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true"/><UIText>{t.loading}</UIText></p>}
      {notice && <p className="mt-4 rounded-xl border border-white/12 bg-white/[.035] px-4 py-3 text-sm leading-6 text-[#dce9e3]"><UIText>{t[notice]}</UIText></p>}
    </div>

    {data && <div className="mt-5 space-y-5" aria-busy={loading || Boolean(busy)}>
      <div className="flex flex-col gap-4 rounded-2xl border border-white/8 bg-[#07110f]/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div><div className="text-xs text-[#95aba2]"><UIText>{t.currentVersion}</UIText></div><div className="mt-1 font-mono text-lg font-semibold text-white"><UIText>{"v"}</UIText><UIText>{caseVersion}</UIText></div><p className="mt-1 text-sm leading-6 text-[#a8bdb5]"><UIText>{savedCurrent ? t.saved : t.notSaved}</UIText></p></div>
        <Button type="button" className={primaryButton} disabled={disabled || Boolean(savedCurrent)} aria-busy={busy === "prepare"} onClick={() => void mutate({ action: "prepare_registration", case_version: caseVersion }, "saved", "prepare")}>
          {busy === "prepare" ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true"/> : <Save className="h-4 w-4" aria-hidden="true"/>}<UIText>{busy === "prepare" ? t.saving : savedCurrent ? t.alreadySaved : t.save}</UIText>
        </Button>
      </div>

      {selected ? <div className="rounded-2xl border border-white/8 p-4 sm:p-5">
        <label htmlFor={`${fieldId}-versions`} className="mb-2 flex items-center gap-2 text-sm font-medium text-white"><History className="h-4 w-4 text-[#99b3a8]" aria-hidden="true"/><UIText>{t.versions}</UIText></label>
        <select id={`${fieldId}-versions`} className={fieldClass} value={selected.id} disabled={loading || Boolean(busy)} onChange={(event) => { setSelectedId(event.target.value); setReplyId(null); setComment(""); setNotice(null); }}>
          {snapshots.map((item) => <option key={item.id} value={item.id}><UIText>{t.version}</UIText> <UIText>{item.case_version}</UIText> · <UIText>{formatDate(item.created_at)}</UIText></option>)}
        </select>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs leading-5 text-[#99b0a6]"><span><UIText>{t.created}</UIText>: <time dateTime={selected.created_at}><UIText>{formatDate(selected.created_at)}</UIText></time></span><span><UIText>{t.recordCount}</UIText>: <UIText>{selected.record_count}</UIText></span></div>
        <dl className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {[[t.source, t.sourceValue], [t.coverage, t.coverageValue], [t.verification, t.verificationValue], [t.assessment, t.assessmentValue], [t.visibility, t.visibilityValue]].map(([label, value]) => <div key={label} className="min-w-0 rounded-xl border border-white/7 bg-white/[.025] p-3"><dt className="text-xs leading-5 text-[#98aea4]"><UIText>{label}</UIText></dt><dd className="mt-1 break-words text-sm font-medium leading-6 text-[#e1eae5]"><UIText>{value}</UIText></dd></div>)}
        </dl>
        <div className="mt-4 flex flex-col gap-3 sm:items-start"><Button type="button" variant="outline" className={secondaryButton} disabled={disabled} aria-busy={busy === `download:${selected.id}`} onClick={() => void download(selected.id)}>{busy === `download:${selected.id}` ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true"/> : <Download className="h-4 w-4" aria-hidden="true"/>}<UIText>{busy === `download:${selected.id}` ? t.downloading : t.download}</UIText></Button><p className="text-xs leading-5 text-[#99aea5]"><UIText>{t.exportNote}</UIText></p></div>
      </div> : <p className="rounded-xl border border-dashed border-white/15 px-4 py-5 text-sm leading-6 text-[#a8bdb5]"><UIText>{t.noVersions}</UIText></p>}

      <RegistrationStatus key={`${caseVersion}:${refreshIndex}:${data.requests.length}`} language={language} requests={data.requests.filter(r=>r.operation === "REGISTER_DOSSIER")} onRefresh={refresh}/>

      {selected && <SnapshotInspector key={`${selected.id}:${refreshIndex}`} language={language} snapshots={snapshots} selectedId={selected.id} disabled={disabled}/>}

      {selected && <div className="rounded-2xl border border-white/8 p-4 sm:p-5">
        <h3 className="flex items-center gap-2 font-semibold text-white"><MessageSquare className="h-4 w-4 text-[#99b3a8]" aria-hidden="true"/><UIText>{t.challenges}</UIText></h3>
        <p className="mt-2 text-xs leading-6 text-[#b6bba7]"><UIText>{t.challengeNote}</UIText></p>
        <div className="mt-4 space-y-3">
          {challenges.length === 0 && <p className="text-sm leading-6 text-[#a8bdb5]"><UIText>{t.noChallenges}</UIText></p>}
          {challenges.map((challenge) => <article key={challenge.id} className="rounded-xl border border-white/10 bg-[#07110f]/60 p-4">
            <div className="flex flex-wrap items-start justify-between gap-2"><h4 className="font-medium text-[#e1eae5]"><UIText>{t.reasons[challenge.reason]}</UIText></h4><span className="rounded-lg border border-white/10 px-2.5 py-1 text-xs leading-5 text-[#c7d2cc]"><UIText>{t.businessStatus}</UIText>: <UIText>{t.states[challenge.business_status]}</UIText></span></div>
            {challenge.comment && <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-[#b7c9c0]"><UIText>{challenge.comment}</UIText></p>}
            <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs leading-5 text-[#99aea5]"><span><UIText>{t.raised}</UIText>: <time dateTime={challenge.created_at}><UIText>{formatDate(challenge.created_at)}</UIText></time></span><span><UIText>{t.responses}</UIText>: <UIText>{challenge.response_count}</UIText></span><span><UIText>{t.paciStatus}</UIText>: <UIText>{t.noDecision}</UIText></span></div>
            {challenge.history?.some((entry) => entry.kind !== "OPENED") && <div className="mt-4 border-t border-white/8 pt-3"><h5 className="text-xs font-medium text-[#a9bfb4]"><UIText>{t.history}</UIText></h5><ol className="mt-2 max-h-72 space-y-2 overflow-y-auto">{challenge.history.filter((entry) => entry.kind !== "OPENED").map((entry) => <li key={entry.sequence} className="rounded-lg border border-white/7 bg-white/[.025] p-3"><div className="flex flex-wrap justify-between gap-2 text-xs leading-5 text-[#a9bfb4]"><span><UIText>{entry.kind === "RESPONDED" ? t.replyEntry : t.withdrawalEntry}</UIText></span><time dateTime={entry.created_at}><UIText>{formatDate(entry.created_at)}</UIText></time></div>{entry.comment && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-[#d5e0d9]"><UIText>{entry.comment}</UIText></p>}</li>)}</ol></div>}
            {challenge.business_status !== "WITHDRAWN" && <div className="mt-3 flex flex-wrap gap-2"><Button type="button" variant="outline" className={secondaryButton} disabled={disabled} onClick={() => setReplyId(replyId === challenge.id ? null : challenge.id)} aria-expanded={replyId === challenge.id} aria-controls={`${fieldId}-reply-${challenge.id}`}><UIText>{t.reply}</UIText></Button><Button type="button" variant="ghost" className="h-auto min-h-11 whitespace-normal text-[#c8bcad] hover:bg-white/5 hover:text-white" disabled={disabled} aria-busy={busy === `withdraw:${challenge.id}`} onClick={() => void mutate({ action: "withdraw_challenge", challenge_id: challenge.id }, "withdrawalSaved", `withdraw:${challenge.id}`)}>{busy === `withdraw:${challenge.id}` && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true"/>}<UIText>{busy === `withdraw:${challenge.id}` ? t.withdrawing : t.withdraw}</UIText></Button></div>}
            {replyId === challenge.id && challenge.business_status !== "WITHDRAWN" && <form id={`${fieldId}-reply-${challenge.id}`} className="mt-4 border-t border-white/8 pt-4" onSubmit={(event) => void respond(event, challenge.id)}>
              <label htmlFor={`${fieldId}-reply-input-${challenge.id}`} className="mb-2 block text-sm font-medium text-[#dce9e3]"><UIText>{t.responseLabel}</UIText></label>
              <textarea id={`${fieldId}-reply-input-${challenge.id}`} className={fieldClass} rows={3} maxLength={1000} required disabled={disabled} value={replies[challenge.id] ?? ""} onChange={(event) => setReplies((previous) => ({ ...previous, [challenge.id]: event.target.value }))} aria-describedby={`${fieldId}-reply-hint-${challenge.id}`}/>
              <div id={`${fieldId}-reply-hint-${challenge.id}`} className="mt-2 flex flex-wrap justify-between gap-2 text-xs leading-5 text-[#99aea5]"><span><UIText>{t.responseHint}</UIText></span><span>{(replies[challenge.id] ?? "").length}/1000 <UIText>{t.characters}</UIText></span></div>
              <div className="mt-3 flex flex-wrap gap-2"><Button type="submit" className={primaryButton} disabled={disabled || !(replies[challenge.id] ?? "").trim()} aria-busy={busy === `reply:${challenge.id}`}>{busy === `reply:${challenge.id}` && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true"/>}<UIText>{busy === `reply:${challenge.id}` ? t.savingResponse : t.saveResponse}</UIText></Button><Button type="button" variant="ghost" className="min-h-11 text-[#b5c8bf] hover:bg-white/5 hover:text-white" disabled={Boolean(busy)} onClick={() => setReplyId(null)}><UIText>{t.cancel}</UIText></Button></div>
            </form>}
          </article>)}
        </div>
        <details className="mt-5 rounded-xl border border-white/10 bg-white/[.02] px-4">
          <summary className="cursor-pointer py-3 text-sm font-medium leading-6 text-[#dce9e3] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79e1c1]"><UIText>{t.newChallenge}</UIText><UIText>{"· v"}</UIText><UIText>{selected.case_version}</UIText></summary>
          <form className="space-y-4 pb-4 pt-1" onSubmit={(event) => void openChallenge(event)}>
            <div><label htmlFor={`${fieldId}-reason`} className="mb-2 block text-sm text-[#b9cdc3]"><UIText>{t.reason}</UIText></label><select id={`${fieldId}-reason`} className={fieldClass} value={reason} disabled={disabled} onChange={(event) => setReason(event.target.value as ChallengeReason)}>{REASONS.map((value) => <option key={value} value={value}><UIText>{t.reasons[value]}</UIText></option>)}</select></div>
            <div><label htmlFor={`${fieldId}-comment`} className="mb-2 block text-sm text-[#b9cdc3]"><UIText>{t.comment}</UIText></label><textarea id={`${fieldId}-comment`} className={fieldClass} rows={3} maxLength={1000} value={comment} disabled={disabled} onChange={(event) => setComment(event.target.value)} aria-describedby={`${fieldId}-comment-hint`}/><div id={`${fieldId}-comment-hint`} className="mt-2 flex flex-wrap justify-between gap-2 text-xs leading-5 text-[#99aea5]"><span><UIText>{t.commentHint}</UIText></span><span><UIText>{comment.length}</UIText>/1000 <UIText>{t.characters}</UIText></span></div></div>
            <Button type="submit" className={primaryButton} disabled={disabled} aria-busy={busy === "challenge"}>{busy === "challenge" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true"/>}<UIText>{busy === "challenge" ? t.submittingChallenge : t.submitChallenge}</UIText></Button>
          </form>
        </details>
      </div>}

      {data.requests.length > 0 && <details className="rounded-xl border border-white/8 px-4"><summary className="cursor-pointer py-3 text-sm leading-6 text-[#b7c9c0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#79e1c1]"><UIText>{t.pending}</UIText> · <UIText>{data.requests.length}</UIText></summary><ul className="max-h-72 space-y-2 overflow-y-auto pb-4">{data.requests.map((request) => <li key={request.id} className="flex flex-col gap-1 rounded-lg bg-white/[.025] px-3 py-2 text-xs leading-5 text-[#a4b9af] sm:flex-row sm:justify-between"><span><UIText>{t.operations[request.operation]}</UIText><UIText>{"· v"}</UIText><UIText>{request.case_version}</UIText> · <UIText>{request.status === "REGISTERED" ? ({zh:"已收到登记回执",en:"Registration receipt received",it:"Ricevuta di registrazione ricevuta"}[language]) : t.pendingLabel}</UIText></span><time dateTime={request.created_at}><UIText>{formatDate(request.created_at)}</UIText></time></li>)}</ul></details>}
    </div>}
  </section>;
}
