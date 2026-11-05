/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarDays, CheckCircle2, ChevronDown, ExternalLink, FileClock, Globe2, Mail, Newspaper, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LanguageFlag } from "@/components/country-flag";
import { PREVIEW_NEWSLETTER_ISSUE } from "@/lib/newsletter-core";

type Lang = "zh" | "en" | "it";
type Issue = Pick<typeof PREVIEW_NEWSLETTER_ISSUE, "slug" | "editionDate" | "sourceCutoffAt" | "sources" | "translations">;
type Subscription = { locale: Lang; status: string; consentedAt: string; confirmedAt: string | null; unsubscribedAt: string | null };
type PreferenceResponse = { subscription: Subscription | null; email?: string; canSubscribe?: boolean };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIssueTranslation(value: unknown): value is Issue["translations"]["en"] {
  if (!isObject(value)) return false;
  const textFields = ["eyebrow", "subject", "title", "summary", "focusTitle", "practiceLabel", "practiceTitle", "practiceText", "practiceDisclaimer", "checklistTitle", "disclaimer"];
  return textFields.every((field) => typeof value[field] === "string")
    && Array.isArray(value.checklist) && value.checklist.every((item: unknown) => typeof item === "string")
    && Array.isArray(value.actions) && value.actions.every((item: unknown) => isObject(item)
      && ["audience", "action", "why", "evidence", "basis"].every((field) => typeof item[field] === "string"));
}

function isIssue(value: unknown): value is Issue {
  if (!isObject(value) || typeof value.slug !== "string" || typeof value.editionDate !== "string"
    || typeof value.sourceCutoffAt !== "string" || !isObject(value.translations)) return false;
  const translations = value.translations;
  return ["zh", "en", "it"].every((language) => isIssueTranslation(translations[language]))
    && Array.isArray(value.sources) && value.sources.every((source: unknown) => isObject(source)
      && typeof source.label === "string" && typeof source.url === "string");
}

function isSubscription(value: unknown): value is Subscription {
  return isObject(value) && (value.locale === "zh" || value.locale === "en" || value.locale === "it")
    && typeof value.status === "string" && typeof value.consentedAt === "string"
    && (value.confirmedAt === null || typeof value.confirmedAt === "string")
    && (value.unsubscribedAt === null || typeof value.unsubscribedAt === "string");
}

function isPreferenceResponse(value: unknown): value is PreferenceResponse {
  return isObject(value) && (value.subscription === null || isSubscription(value.subscription))
    && (value.email === undefined || typeof value.email === "string")
    && (value.canSubscribe === undefined || typeof value.canSubscribe === "boolean");
}

function responseError(value: unknown, fallback: string) {
  return isObject(value) && typeof value.error === "string" ? value.error : fallback;
}

const UI = {
  zh: {
    back: "返回 Dossivo", eyebrow: "全球企业 · 每周行动情报", title: "全球企业欧盟强制劳动法规行动简报", intro: "每期回答一个问题：进入欧盟市场的企业现在应该做什么，并应留下哪些证据。这里不是 Dossivo 产品更新栏。",
    cadence: "计划每周五更新", preview: "当前为创刊预览", latest: "最新一期", archive: "往期归档", cutoff: "资料核验截止", why: "为什么现在做", evidence: "应留下的证据", basis: "依据性质", sources: "官方来源", practice: "同行实践观察", noMore: "正式期刊将在内容更新与审核链路启用后按期归档。",
    subscribeTitle: "用你选择的语言接收简报", subscribeText: "注册不等于订阅。请主动选择首选简报语言；我们不会根据国籍、姓名或浏览器推断母语。", language: "首选简报语言", languages: { zh: "中文", en: "English", it: "Italiano" }, consent: "我愿意每周五通过电子邮件接收 Dossivo《欧盟强制劳动法规行动简报》。我可以随时退订；退订不影响账户或产品功能。", save: "保存订阅偏好", update: "更新接收语言", cancel: "撤回订阅偏好", signIn: "登录后保存订阅偏好", pending: "偏好已保存。邮件发送基础设施尚未启用；启用时将先发送确认邮件，确认前不会发送周刊。", active: "简报订阅已启用。", unsubscribed: "订阅偏好已撤回，不会发送简报。", saved: "订阅偏好已保存。", removed: "订阅偏好已撤回。", sendingOff: "当前不发送邮件 · 不进行打开或点击追踪", disclaimer: "简报提供合规准备信息，不构成法律意见或认证。",
  },
  en: {
    back: "Back to Dossivo", eyebrow: "Global businesses · weekly action intelligence", title: "EU Forced Labour Action Briefing for Global Businesses", intro: "Each issue answers one question: what should businesses serving the EU market do now, and what evidence should they retain? This is not a Dossivo product-update feed.",
    cadence: "Planned every Friday", preview: "Founding preview", latest: "Latest issue", archive: "Issue archive", cutoff: "Sources checked through", why: "Why now", evidence: "Evidence to retain", basis: "Basis", sources: "Official sources", practice: "Peer-practice observation", noMore: "Formal issues will be archived here after the update and editorial-review workflow is enabled.",
    subscribeTitle: "Receive the briefing in the language you choose", subscribeText: "Registration is not subscription. Choose your preferred briefing language; we do not infer a mother tongue from nationality, name or browser settings.", language: "Preferred briefing language", languages: { zh: "中文", en: "English", it: "Italiano" }, consent: "I agree to receive Dossivo’s EU Forced Labour Action Briefing by email every Friday. I can unsubscribe at any time without affecting my account or product access.", save: "Save subscription preference", update: "Update delivery language", cancel: "Withdraw subscription preference", signIn: "Sign in to save a subscription preference", pending: "Your preference is saved. Email delivery is not yet enabled; an activation message will require confirmation before any weekly issue is sent.", active: "Weekly briefing delivery is active.", unsubscribed: "Your preference was withdrawn. No briefing will be sent.", saved: "Subscription preference saved.", removed: "Subscription preference withdrawn.", sendingOff: "No email is currently sent · no open or click tracking", disclaimer: "The briefing provides compliance-readiness information, not legal advice or certification.",
  },
  it: {
    back: "Torna a Dossivo", eyebrow: "Imprese globali · intelligence operativa settimanale", title: "Brief operativo sul Regolamento UE sul lavoro forzato per le imprese globali", intro: "Ogni numero risponde a una domanda: che cosa dovrebbero fare ora le imprese che operano sul mercato UE e quali prove dovrebbero conservare? Non è un bollettino sugli aggiornamenti di Dossivo.",
    cadence: "Aggiornamento previsto ogni venerdì", preview: "Anteprima inaugurale", latest: "Ultimo numero", archive: "Archivio", cutoff: "Fonti verificate fino al", why: "Perché ora", evidence: "Prove da conservare", basis: "Fondamento", sources: "Fonti ufficiali", practice: "Osservazione delle prassi d’impresa", noMore: "I numeri ufficiali saranno archiviati qui dopo l’attivazione del flusso di aggiornamento e revisione editoriale.",
    subscribeTitle: "Ricevi il brief nella lingua che scegli", subscribeText: "La registrazione non equivale all’iscrizione. Scegli la lingua preferita; non deduciamo la lingua madre da nazionalità, nome o browser.", language: "Lingua preferita del brief", languages: { zh: "中文", en: "English", it: "Italiano" }, consent: "Acconsento a ricevere ogni venerdì via e-mail il Brief operativo di Dossivo sul Regolamento UE sul lavoro forzato. Posso annullare l’iscrizione in qualsiasi momento senza effetti sull’account o sull’accesso al prodotto.", save: "Salva la preferenza", update: "Aggiorna lingua di invio", cancel: "Revoca la preferenza", signIn: "Accedi per salvare la preferenza", pending: "La preferenza è salvata. L’invio e-mail non è ancora attivo; prima di ricevere i numeri settimanali sarà richiesta una conferma via e-mail.", active: "L’invio settimanale è attivo.", unsubscribed: "La preferenza è stata revocata. Non verrà inviato alcun brief.", saved: "Preferenza salvata.", removed: "Preferenza revocata.", sendingOff: "Nessuna e-mail viene inviata ora · nessun tracciamento di aperture o clic", disclaimer: "Il brief offre informazioni per la preparazione, non consulenza legale né certificazione.",
  },
} as const;

export function BriefingCenter() {
  const [language, setLanguageState] = useState<Lang>("zh");
  const [issues, setIssues] = useState<Issue[]>([PREVIEW_NEWSLETTER_ISSUE]);
  const [selectedSlug, setSelectedSlug] = useState(PREVIEW_NEWSLETTER_ISSUE.slug);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [canSubscribe, setCanSubscribe] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState("");
  const [preferredLanguage, setPreferredLanguage] = useState<Lang>("zh");
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const t = UI[language];

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem("dossivo-language");
      if (saved === "zh" || saved === "en" || saved === "it") { setLanguageState(saved); setPreferredLanguage(saved); }
    }, 0);
    void fetch("/api/newsletters", { cache: "no-store" }).then((response) => { if (!response.ok) throw new Error("Unable to load briefings"); return response.json(); }).then((data: unknown) => { if (isObject(data) && Array.isArray(data.issues) && data.issues.length && data.issues.every(isIssue)) { setIssues(data.issues); setSelectedSlug(data.issues[0].slug); } }).catch(() => undefined);
    void fetch("/api/newsletter-preferences", { cache: "no-store" }).then((response) => { if (!response.ok) throw new Error("Unable to load preferences"); return response.json(); }).then((data: unknown) => {
      if (!isPreferenceResponse(data)) return;
      setCanSubscribe(Boolean(data.canSubscribe));
      setMaskedEmail(data.email ?? "");
      if (data.subscription) { setSubscription(data.subscription); setPreferredLanguage(data.subscription.locale); }
    }).catch(() => undefined);
    return () => window.clearTimeout(timer);
  }, []);

  const setLanguage = (next: Lang) => { setLanguageState(next); window.localStorage.setItem("dossivo-language", next); if (!subscription || subscription.status === "unsubscribed") setPreferredLanguage(next); };
  const selected = useMemo(() => issues.find((issue) => issue.slug === selectedSlug) ?? issues[0], [issues, selectedSlug]);
  const content = selected.translations[language] ?? selected.translations.en;

  const savePreference = async (action: "subscribe" | "update_language" = "subscribe") => {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/newsletter-preferences", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, language: preferredLanguage, consent: action === "subscribe" ? consent : undefined }) });
      const data: unknown = await response.json();
      if (!response.ok) throw new Error(responseError(data, "Unable to save preference"));
      if (!isPreferenceResponse(data) || !data.subscription) throw new Error("Unable to save preference");
      setSubscription(data.subscription); setMaskedEmail(data.email ?? maskedEmail); setConsent(false); setMessage(t.saved);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to save preference"); }
    finally { setBusy(false); }
  };

  const withdrawPreference = async () => {
    setBusy(true); setError(""); setMessage("");
    try {
      const response = await fetch("/api/newsletter-preferences", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "unsubscribe" }) });
      const data: unknown = await response.json();
      if (!response.ok) throw new Error(responseError(data, "Unable to withdraw preference"));
      if (!isPreferenceResponse(data)) throw new Error("Unable to withdraw preference");
      setSubscription(data.subscription); setMessage(t.removed);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to withdraw preference"); }
    finally { setBusy(false); }
  };

  const statusText = subscription?.status === "active" ? t.active : subscription?.status === "pending_delivery" ? t.pending : subscription?.status === "unsubscribed" ? t.unsubscribed : "";

  return <main className="min-h-screen bg-[#07110f] px-4 py-5 text-[#e8f3ef] sm:px-6 lg:px-8 lg:py-8">
    <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_70%_-10%,rgba(30,193,151,.18),transparent_34%),linear-gradient(135deg,rgba(255,255,255,.025),transparent_35%)]"/>
    <div className="relative mx-auto max-w-[1220px]">
      <header className="flex flex-wrap items-center justify-between gap-3"><Link href="/" className="inline-flex min-h-11 items-center gap-2 rounded-xl px-2 text-sm font-medium text-[#9debd3] hover:bg-white/5 hover:text-white"><ArrowLeft className="h-4 w-4"/>{t.back}</Link><div className="relative"><label className="sr-only" htmlFor="briefing-language">Language</label><select id="briefing-language" value={language} onChange={(event) => setLanguage(event.target.value as Lang)} className="min-h-11 appearance-none rounded-xl border border-white/10 bg-[#10201b] py-2 pl-11 pr-10 text-sm text-white outline-none focus:ring-2 focus:ring-[#79e1c1]"><option value="zh">中文</option><option value="en">English</option><option value="it">Italiano</option></select><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"><LanguageFlag language={language}/></span><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#82978f]"/></div></header>

      <section className="mt-4 overflow-hidden rounded-[28px] border border-[#65d9b6]/18 bg-[linear-gradient(125deg,#10251f_0%,#0a1714_62%,#0e211c_100%)] p-6 shadow-[0_30px_90px_rgba(0,0,0,.24)] sm:p-9">
        <div className="flex flex-wrap gap-2 text-xs font-semibold"><span className="inline-flex min-h-8 items-center gap-2 rounded-full border border-[#79e1c1]/25 bg-[#79e1c1]/10 px-3 text-[#aaf2dc]"><Newspaper className="h-3.5 w-3.5"/>{t.eyebrow}</span><span className="inline-flex min-h-8 items-center rounded-full border border-amber-200/20 bg-amber-200/8 px-3 text-amber-100">{t.cadence} · {t.preview}</span></div>
        <h1 className="mt-5 max-w-5xl text-[clamp(2.2rem,5vw,4.6rem)] font-semibold leading-[1.04] tracking-[-.05em] text-white">{t.title}</h1><p className="mt-5 max-w-3xl text-base leading-7 text-[#aec2bb] sm:text-lg">{t.intro}</p>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <article className="rounded-[24px] border border-white/9 bg-[#0c1815]/92 p-6 sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><div className="text-xs font-semibold uppercase tracking-[.15em] text-[#78dfc0]">{t.latest}</div><h2 className="mt-2 max-w-3xl text-3xl font-semibold tracking-[-.035em] text-white">{content.title}</h2></div><div className="rounded-xl border border-white/8 bg-white/[.035] px-3 py-2 text-xs text-[#91a69f]"><CalendarDays className="mr-2 inline h-4 w-4 text-[#78dfc0]"/>{selected.editionDate}</div></div>
          <p className="mt-4 text-base leading-7 text-[#99aea7]">{content.summary}</p><div className="mt-3 text-xs text-[#61786f]">{t.cutoff}: {selected.sourceCutoffAt.slice(0,10)}</div>
          <h3 className="mt-8 text-xl font-semibold text-white">{content.focusTitle}</h3><div className="mt-4 space-y-4">{content.actions.map((item: any, index: number) => <section key={item.action} className="rounded-2xl border border-white/8 bg-white/[.025] p-5"><div className="flex gap-3"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#58d8b1]/12 text-sm font-semibold text-[#8ce8cc]">{index + 1}</span><div><div className="text-xs font-semibold text-[#79dcbf]">{item.audience}</div><h4 className="mt-1 text-base font-semibold leading-6 text-white">{item.action}</h4></div></div><div className="mt-4 grid gap-3 md:grid-cols-3"><BriefFact label={t.why} value={item.why}/><BriefFact label={t.evidence} value={item.evidence}/><BriefFact label={t.basis} value={item.basis}/></div></section>)}</div>

          <section className="mt-6 rounded-2xl border border-sky-300/18 bg-sky-300/[.055] p-5"><div className="flex flex-wrap items-center gap-2"><Sparkles className="h-4 w-4 text-sky-200"/><span className="text-xs font-semibold uppercase tracking-[.12em] text-sky-200">{t.practice}</span><span className="rounded-full bg-white/7 px-2.5 py-1 text-[10px] font-semibold text-[#bfdbd2]">{content.practiceLabel}</span></div><h3 className="mt-3 text-xl font-semibold text-white">{content.practiceTitle}</h3><p className="mt-3 text-sm leading-6 text-[#9fb3ad]">{content.practiceText}</p><p className="mt-3 text-xs leading-5 text-[#718880]">{content.practiceDisclaimer}</p></section>

          <section className="mt-6"><h3 className="text-xl font-semibold text-white">{content.checklistTitle}</h3><ul className="mt-3 grid gap-3 sm:grid-cols-3">{content.checklist.map((item: string) => <li key={item} className="flex gap-2 rounded-xl border border-white/7 bg-[#07110f]/65 p-4 text-sm leading-6 text-[#abc0b9]"><CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-[#6fdcbb]"/>{item}</li>)}</ul></section>
          <section className="mt-6 border-t border-white/8 pt-5"><h3 className="text-sm font-semibold text-white">{t.sources}</h3><div className="mt-3 flex flex-wrap gap-3">{selected.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/8 px-3 text-xs text-[#8fe4ca] hover:border-white/18 hover:text-white">{source.label}<ExternalLink className="h-3.5 w-3.5"/></a>)}</div><p className="mt-4 text-xs leading-5 text-[#687f76]">{content.disclaimer}</p></section>
        </article>

        <aside className="space-y-6">
          <section className="rounded-[22px] border border-white/9 bg-[#0c1815]/92 p-5"><div className="flex items-center gap-2 text-white"><FileClock className="h-4 w-4 text-[#7ce0c1]"/><h2 className="font-semibold">{t.archive}</h2></div><div className="mt-4 space-y-2">{issues.map((issue) => <button key={issue.slug} type="button" onClick={() => setSelectedSlug(issue.slug)} aria-pressed={selectedSlug === issue.slug} className={`min-h-14 w-full rounded-xl border p-3 text-left text-sm transition ${selectedSlug === issue.slug ? "border-[#6bddbb]/40 bg-[#6bddbb]/10 text-white" : "border-white/7 bg-white/[.02] text-[#95aaa3] hover:border-white/15"}`}><span className="block text-xs text-[#6dd6b6]">{issue.editionDate}</span><span className="mt-1 line-clamp-2 block">{(issue.translations[language] ?? issue.translations.en).title}</span></button>)}</div><p className="mt-4 text-xs leading-5 text-[#61776f]">{t.noMore}</p></section>

          <section className="rounded-[22px] border border-[#69ddba]/20 bg-[#10241e] p-5"><div className="flex items-center gap-2"><Mail className="h-4 w-4 text-[#83e7c8]"/><h2 className="font-semibold text-white">{t.subscribeTitle}</h2></div><p className="mt-3 text-sm leading-6 text-[#91a79f]">{t.subscribeText}</p>{maskedEmail && <div className="mt-3 text-xs text-[#6f877e]">{maskedEmail}</div>}
            {statusText && <div className="mt-4 rounded-xl border border-amber-200/14 bg-amber-200/[.055] p-3 text-xs leading-5 text-amber-100">{statusText}</div>}
            {canSubscribe ? <div className="mt-5"><label htmlFor="preferred-language" className="text-xs font-semibold text-[#a9bbb5]">{t.language}</label><select id="preferred-language" value={preferredLanguage} onChange={(event) => setPreferredLanguage(event.target.value as Lang)} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 bg-[#07110f] px-3 text-sm text-white outline-none focus:ring-2 focus:ring-[#79e1c1]"><option value="zh">{t.languages.zh}</option><option value="en">{t.languages.en}</option><option value="it">{t.languages.it}</option></select>
              {subscription?.status !== "pending_delivery" && subscription?.status !== "active" && <label className="mt-4 flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-white/8 bg-white/[.025] p-3 text-xs leading-5 text-[#9db1aa]"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-1 h-4 w-4 accent-[#65dcb9]"/><span>{t.consent}</span></label>}
              {subscription?.status === "pending_delivery" || subscription?.status === "active" ? <div className="mt-4 grid gap-2"><Button onClick={() => void savePreference("update_language")} disabled={busy || preferredLanguage === subscription.locale} className="min-h-11 w-full bg-[#d7fff0] font-semibold text-[#07382d] hover:bg-[#baf4dd] disabled:opacity-45">{t.update}</Button><Button onClick={() => void withdrawPreference()} disabled={busy} variant="outline" className="min-h-11 w-full border-white/12 bg-transparent text-white hover:bg-white/5 hover:text-white">{t.cancel}</Button></div> : <Button onClick={() => void savePreference()} disabled={busy || !consent} className="mt-4 min-h-11 w-full bg-[#d7fff0] font-semibold text-[#07382d] hover:bg-[#baf4dd] disabled:opacity-45">{t.save}</Button>}
            </div> : <a href="/signin-with-chatgpt?return_to=%2Fbriefings" className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#d7fff0] px-4 text-sm font-semibold text-[#07382d] hover:bg-[#baf4dd]">{t.signIn}</a>}
            {message && <p className="mt-3 text-xs text-[#8ce8cc]" role="status">{message}</p>}{error && <p className="mt-3 text-xs text-red-200" role="alert">{error}</p>}
            <div className="mt-4 flex gap-2 border-t border-white/8 pt-4 text-[11px] leading-5 text-[#62786f]"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0"/><span>{t.sendingOff}</span></div>
          </section>
          <div className="flex gap-2 px-2 text-xs leading-5 text-[#60766e]"><Globe2 className="mt-0.5 h-4 w-4 shrink-0"/><span>{t.disclaimer}</span></div>
        </aside>
      </div>
    </div>
  </main>;
}

function BriefFact({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-[#07110f]/60 p-3"><div className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#60776e]">{label}</div><p className="mt-1.5 text-xs leading-5 text-[#96aaa3]">{value}</p></div>; }
