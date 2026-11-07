'use client';
import {ProofSecurityNotice} from '@/app/proof-security-notice';
import {verificationReceipt} from '@/lib/proof-verification-receipt';
import {UIText,UIButton,useUILanguage} from '@/app/ui-language';
import { useEffect, useState } from "react";
import {useRouter,usePathname} from "next/navigation";
import { CheckCircle2, Clock3, Loader2, ShieldCheck } from "lucide-react";
import { LanguageFlag } from "@/components/country-flag";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Lang = "zh" | "en" | "it";
type AccessFailure = "unavailable" | "snapshot_required";
type Card = { title: string; summary: string; verifiedFacts: number; openGaps: number; disclaimer: string };
type Verification = {code:string;content_fingerprint:string;official_domain:string;verify_url:string;issued_at:string;expires_at:string};
type Payload = {
  verification?: Verification | null;
  viewedAt?: string;
  card: Record<Lang, Card>;
  scope: { product: string; facility: string; period: string };
  recipient: string;
  expiresAt: string;
  remainingViews: number;
  cardVersion: number;
  syntheticDemo: true;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isCard(value: unknown): value is Card {
  return isObject(value) && typeof value.title === "string" && typeof value.summary === "string"
    && typeof value.disclaimer === "string" && isCount(value.verifiedFacts) && isCount(value.openGaps);
}

function isPayload(value: unknown): value is Payload {
  if (!isObject(value) || !isObject(value.card) || !isObject(value.scope)) return false;
  const cards = value.card;
  return ["zh", "en", "it"].every((language) => isCard(cards[language]))
    && typeof value.scope.product === "string" && typeof value.scope.facility === "string"
    && typeof value.scope.period === "string" && typeof value.recipient === "string"
    && typeof value.expiresAt === "string" && Number.isFinite(Date.parse(value.expiresAt))
    && isCount(value.remainingViews) && isCount(value.cardVersion) && value.syntheticDemo === true;
}

async function requestProof(token: string, signal: AbortSignal, onLoaded: (payload: Payload) => void, onFailed: (reason: AccessFailure) => void) {
  try {
    const response = await fetch(`/api/proof/${encodeURIComponent(token)}`, { cache: "no-store", signal });
    const data: unknown = await response.json();
    if (!response.ok) {
      if (!signal.aborted) onFailed(isObject(data) && data.code === "FROZEN_SNAPSHOT_REQUIRED" ? "snapshot_required" : "unavailable");
      return;
    }
    if (!isPayload(data)) throw new Error("access");
    if (!signal.aborted) onLoaded(data);
  } catch {
    if (!signal.aborted) onFailed("unavailable");
  }
}

const VERIFY_COPY={
 zh:{title:'签发核验信息',code:'核验码',fingerprint:'内容指纹',domain:'官方核验域名',check:'查询当前状态',download:'下载核验信息',notice:'核验信息可被复制，不等于材料真实或已通过合规审查。下载记录保留本次签发信息；授权到期或撤销后，仍须到官方核验页查询当前状态。',version:'证据卡版本',saved:'已交给浏览器下载，请检查下载列表。'},
 en:{title:'Issuance verification',code:'Verification code',fingerprint:'Content fingerprint',domain:'Official verification domain',check:'Check current status',download:'Download verification information',notice:'Verification information can be copied. It does not certify evidence truth or compliance. The download records this issuance; check the official page for current status after expiry or revocation.',version:'Card version',saved:'Sent to your browser. Check your downloads.'},
 it:{title:'Verifica dell’emissione',code:'Codice di verifica',fingerprint:'Impronta del contenuto',domain:'Dominio ufficiale di verifica',check:'Controlla lo stato attuale',download:'Scarica informazioni di verifica',notice:'Le informazioni di verifica possono essere copiate. Non certificano la veridicità delle prove o la conformità. Il file documenta questa emissione; consulta la pagina ufficiale per lo stato attuale dopo scadenza o revoca.',version:'Versione della scheda',saved:'Inviato al browser. Controlla i download.'}
} as const;

const COPY = {
  zh: { evidenceCard: "授权证据卡", demo: "合成数据示例", authorized: "授权给", facts: "已确认事实", gaps: "待补缺口", expires: "有效期至", views: "次授权查看剩余", loading: "正在载入授权证据卡", unavailable: "暂时无法访问", fallbackError: "链接可能已过期、撤销或用尽", disclaimer: "Dossivo 提供合规准备工具，不构成法律意见；欧盟不颁发强制劳动合规证书，最终判断由主管机关作出。" },
  en: { evidenceCard: "Authorised evidence card", demo: "Synthetic data example", authorized: "Authorised for", facts: "Confirmed facts", gaps: "Open gaps", expires: "Expires", views: "authorised views remaining", loading: "Loading authorised evidence card", unavailable: "Access unavailable", fallbackError: "This link may be expired, revoked or exhausted", disclaimer: "Dossivo provides readiness tools, not legal advice. The EU issues no forced-labour compliance certificate; authorities make the final determination." },
  it: { evidenceCard: "Scheda prove autorizzata", demo: "Esempio con dati sintetici", authorized: "Autorizzata per", facts: "Fatti confermati", gaps: "Lacune aperte", expires: "Scade il", views: "visualizzazioni autorizzate rimanenti", loading: "Caricamento della scheda autorizzata", unavailable: "Accesso non disponibile", fallbackError: "Il link potrebbe essere scaduto, revocato o esaurito", disclaimer: "Dossivo offre strumenti di preparazione, non consulenza legale. L'UE non rilascia certificati di conformità sul lavoro forzato; la decisione finale spetta alle autorità." },
} as const;

const SNAPSHOT_REQUIRED = {
  zh: "此旧链接没有冻结的证据版本，已停止展示。请联系发送方重新生成授权链接。",
  en: "This older link has no frozen evidence version and cannot be displayed. Ask the sender to issue a new authorised link.",
  it: "Questo vecchio link non dispone di una versione congelata delle prove e non può essere mostrato. Chiedi al mittente un nuovo link autorizzato.",
} as const;

export function ProofViewer({ token }: { token: string }) {
  const [result, setResult] = useState<{ token: string; payload: Payload | null; error: AccessFailure | null }>({ token, payload: null, error: null });
  const payload = result.token === token ? result.payload : null;
  const error = result.token === token ? result.error : null;
  const language=useUILanguage(),router=useRouter(),pathname=usePathname();
  const t=COPY[language],v=VERIFY_COPY[language];
  const [downloaded,setDownloaded]=useState(false);
  const receipt=payload?verificationReceipt(payload.verification,payload.viewedAt):null;
  const downloadVerification=()=>{if(!receipt)return;const url=URL.createObjectURL(new Blob([JSON.stringify(receipt,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='DOSSIVO-verification.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setDownloaded(true);};

  useEffect(() => {
    const controller = new AbortController();
    setResult({ token, payload: null, error: null });
    setDownloaded(false);
    void requestProof(token, controller.signal,
      (payload) => setResult({ token, payload, error: null }),
      (error) => setResult({ token, payload: null, error }));
    return () => controller.abort();
  }, [token]);

  const changeLanguage = (next: Lang) => {router.push(pathname+'?lang='+next);};

  if (!payload && !error) return <main className="grid min-h-screen place-items-center bg-[#eef5f1] text-[#1e4036]"><Loader2 className="h-6 w-6 animate-spin"/><span className="sr-only"><UIText>{t.loading}</UIText></span></main>;
  if (error || !payload) return <main className="grid min-h-screen place-items-center bg-[#eef5f1] p-6"><div className="max-w-md text-center"><ShieldCheck className="mx-auto h-9 w-9 text-[#8a9b95]"/><h1 className="mt-4 text-xl font-semibold text-[#183a30]"><UIText>{t.unavailable}</UIText></h1><p className="mt-2 text-sm text-[#64776f]"><UIText>{error === "snapshot_required" ? SNAPSHOT_REQUIRED[language] : t.fallbackError}</UIText></p></div></main>;

  return <main className="min-h-screen bg-[#eef5f1] px-4 py-8 text-[#15372d] sm:px-6 sm:py-12"><div className="mx-auto max-w-3xl">
    <header className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#143f33] text-white"><ShieldCheck className="h-5 w-5"/></div><div><div className="font-semibold"><UIText>{"Dossivo"}</UIText></div><div className="text-xs text-[#668077]"><UIText>{t.evidenceCard}</UIText></div></div></div><div className="flex flex-wrap items-center gap-2"><div className="rounded-full border border-[#cbd9d4] bg-white p-1 text-xs">{(["zh","en","it"] as Lang[]).map((lang) => { const labels = { zh: "中文", en: "English", it: "Italiano" } as const; return <UIButton key={lang} aria-label={labels[lang]} title={labels[lang]} aria-pressed={language === lang} className={`inline-flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 ${language === lang ? "bg-[#143f33] text-white" : "text-[#60756d]"}`} onClick={() => changeLanguage(lang)}><LanguageFlag language={lang}/></UIButton>; })}</div><span className="rounded-full border border-amber-500/20 bg-amber-100 px-3 py-2 text-xs font-medium text-amber-800"><UIText>{t.demo}</UIText></span></div></header>
    <section className="mt-8 overflow-hidden rounded-[24px] border border-[#cad9d3] bg-white shadow-[0_24px_70px_rgba(22,64,51,.10)]"><div className="border-b border-[#dce7e2] bg-[#f8fbfa] p-6 sm:p-8"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="text-xs font-semibold uppercase tracking-[.14em] text-[#2c8b6d]"><UIText>{v.version}</UIText> <UIText>{payload.cardVersion}</UIText></div><h1 className="mt-2 text-2xl font-semibold tracking-tight"><UIText>{payload.scope.product}</UIText></h1><p className="mt-2 text-sm text-[#647970]">{payload.scope.facility} · <UIText>{payload.scope.period}</UIText></p></div><div className="flex items-center gap-2 text-xs text-[#587067]"><CheckCircle2 className="h-4 w-4 text-[#2b9a76]"/><UIText>{t.authorized}</UIText> <UIText>{payload.recipient}</UIText></div></div></div><div className="p-6 sm:p-8"><Tabs key={language} defaultValue={language}><TabsList className="min-h-11 bg-[#e8efec]"><TabsTrigger className="min-h-11 gap-2 text-[#60756d] data-[state=active]:bg-[#143f33] data-[state=active]:text-white" value="zh"><LanguageFlag language="zh"/><UIText>{"中文"}</UIText></TabsTrigger><TabsTrigger className="min-h-11 gap-2 text-[#60756d] data-[state=active]:bg-[#143f33] data-[state=active]:text-white" value="en"><LanguageFlag language="en"/><UIText>{"English"}</UIText></TabsTrigger><TabsTrigger className="min-h-11 gap-2 text-[#60756d] data-[state=active]:bg-[#143f33] data-[state=active]:text-white" value="it"><LanguageFlag language="it"/><UIText>{"Italiano"}</UIText></TabsTrigger></TabsList>{(["zh", "en", "it"] as const).map((lang) => { const card = payload.card[lang]; return <TabsContent key={lang} value={lang} className="mt-6"><h2 className="text-xl font-semibold"><UIText>{card.title}</UIText></h2><p className="mt-3 text-base leading-7 text-[#526b62]"><UIText>{card.summary}</UIText></p><div className="mt-6 grid gap-3 sm:grid-cols-2"><Metric label={t.facts} value={card.verifiedFacts}/><Metric label={t.gaps} value={card.openGaps}/></div><div className="mt-6 rounded-xl border border-[#d7e3de] bg-[#f5f9f7] p-4 text-sm leading-6 text-[#64776f]"><UIText>{card.disclaimer}</UIText></div></TabsContent>; })}</Tabs></div></section>
    {receipt?<section aria-label={v.title} className="mt-5 rounded-2xl border border-[#cad9d3] bg-white p-5"><h2 className="font-semibold">{v.title}</h2><dl className="mt-3 grid gap-3 sm:grid-cols-2"><div><dt>{v.code}</dt><dd className="break-all font-mono">{receipt.code}</dd></div><div><dt>{v.fingerprint}</dt><dd className="break-all font-mono">{receipt.content_fingerprint}</dd></div><div className="sm:col-span-2"><dt>{v.domain}</dt><dd className="break-all">{receipt.official_domain}</dd></div></dl><div className="mt-4 flex flex-wrap gap-3"><a className="inline-flex min-h-11 items-center rounded-lg border px-3" href={receipt.verify_url+'&lang='+language} target="_blank" rel="noreferrer">{v.check}</a><button className="min-h-11 rounded-lg border px-3" onClick={downloadVerification}>{v.download}</button></div><p className="mt-3 text-sm leading-6">{v.notice}</p>{downloaded&&<p role="status" className="mt-2 text-sm">{v.saved}</p>}</section>:<ProofSecurityNotice/>}
    <footer className="mt-5 text-sm leading-6 text-[#687d75]"><div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><span className="flex items-center gap-2"><Clock3 className="h-4 w-4"/><UIText>{t.expires}</UIText> <UIText>{new Date(payload.expiresAt).toLocaleDateString(language === "zh" ? "zh-CN" : language)}</UIText></span><span><UIText>{payload.remainingViews}</UIText> <UIText>{t.views}</UIText></span></div><p className="mt-4 border-t border-[#cfddd8] pt-4"><UIText>{t.disclaimer}</UIText></p></footer>
  </div></main>;
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-2xl border border-[#d8e4df] p-5"><div className="text-sm text-[#71867e]"><UIText>{label}</UIText></div><div className="mt-1 text-3xl font-semibold"><UIText>{value}</UIText></div></div>; }
