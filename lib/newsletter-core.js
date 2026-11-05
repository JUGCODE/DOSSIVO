export const NEWSLETTER_LANGUAGES = ["zh", "en", "it"];
export const NEWSLETTER_CONSENT_VERSION = "weekly-action-brief-v1-2026-10-04";

const OFFICIAL_SOURCES = [
  {
    label: "Regulation (EU) 2024/3015",
    url: "https://eur-lex.europa.eu/eli/reg/2024/3015/oj/eng",
  },
  {
    label: "European Commission · Forced Labour Regulation",
    url: "https://single-market-economy.ec.europa.eu/single-market/goods/forced-labour-regulation_en",
  },
];

export const PREVIEW_NEWSLETTER_ISSUE = {
  id: "founding-preview-2026-10-04",
  slug: "founding-preview-2026-10-04",
  editionDate: "2026-10-04",
  sourceCutoffAt: "2026-10-04T00:00:00Z",
  publishedAt: "2026-10-04T00:00:00Z",
  status: "preview",
  sources: OFFICIAL_SOURCES,
  translations: {
    zh: {
      eyebrow: "创刊预览 · 场景化内容",
      subject: "Dossivo 全球企业欧盟强制劳动法规行动简报 · 创刊预览",
      title: "把法规准备变成本周可以完成的企业动作",
      summary: "本期展示简报的固定方法：把法规与官方信息转化为全球制造商、供应商、品牌方和进口商可以执行、可以留痕的行动。",
      focusTitle: "本期企业行动清单",
      actions: [
        { audience: "所有进入欧盟市场的企业", action: "列出进入欧盟市场的产品、实际工厂、直接供应商与关键原料，并为每项未知信息指定负责人。", why: "法规适用于所有产品、行业和原产国；很小比例的零部件或原料也可能进入核查范围。", evidence: "范围清单、负责人、数据来源与最后核验日期。", basis: "法规适用事实" },
        { audience: "制造商与零部件供应商", action: "检查关键证据是否有有效期起止、版本和生产批次关联，并立即标出断档。", why: "日后问询可能针对历史生产期间，而不是问询当天的材料。", evidence: "证据时间线、历史版本、断档清单与补齐任务。", basis: "证据准备建议" },
        { audience: "品牌方与欧盟进口商", action: "做一次买方、海关或主管机关问询演练，明确谁收集材料、谁审核、谁批准披露。", why: "缺少证据本身不等于违法，但无法及时合作会提高调查与不利判断风险。", evidence: "回应责任矩阵、批准记录和一套受控披露样稿。", basis: "商业准备建议 · 非法定期限" },
      ],
      practiceLabel: "场景化示例 · 非真实客户",
      practiceTitle: "一家零部件供应商如何让同一套证据服务多个买方",
      practiceText: "企业先建立一套由自己掌控的证据主档，按供应商和原料保存有效期与历史版本；收到不同买方问卷时，再为每位接收方选择披露字段，并只出示与相关期间匹配的版本。这样可以重复利用同一事实基础，同时保留未关闭缺口。",
      practiceDisclaimer: "这是方法示例，不代表任何具体企业、Dossivo 客户或合规结论。",
      checklistTitle: "本周应留下的证据",
      checklist: ["产品—工厂—供应商—原料关系清单", "证据有效期和版本断档记录", "问询响应职责与披露批准记录"],
      disclaimer: "本简报提供合规准备信息，不构成法律意见，也不构成合规认证。最终判断由欧委会或成员国主管机关依法作出。",
    },
    en: {
      eyebrow: "Founding preview · scenario content",
      subject: "Dossivo EU Forced Labour Action Briefing for Global Businesses · Preview",
      title: "Turn regulatory readiness into actions a company can complete this week",
      summary: "This preview shows the briefing method: turn regulation and official information into practical, documented actions for manufacturers, suppliers, brand owners and importers worldwide.",
      focusTitle: "Actions for businesses this week",
      actions: [
        { audience: "Every business serving the EU market", action: "List EU-bound products, actual facilities, direct suppliers and critical inputs, then assign an owner to every unknown.", why: "The Regulation covers all products, sectors and origins; even a small component or material may remain in scope.", evidence: "Scope register, accountable owner, source and last verification date.", basis: "Regulatory scope fact" },
        { audience: "Manufacturers and component suppliers", action: "Check that critical evidence has validity dates, versions and production-batch links, and flag every gap immediately.", why: "A later inquiry may concern the historical production period rather than the documents current on the inquiry date.", evidence: "Evidence timeline, historical versions, gap register and follow-up tasks.", basis: "Evidence-readiness practice" },
        { audience: "Brand owners and EU importers", action: "Run one buyer, customs or authority response drill and define who collects, reviews and approves disclosure.", why: "Missing evidence is not itself the violation, but inability to cooperate promptly increases inquiry and adverse-decision risk.", evidence: "Response matrix, approval record and one controlled disclosure draft.", basis: "Business-readiness estimate · not a statutory deadline" },
      ],
      practiceLabel: "Scenario example · not a real customer",
      practiceTitle: "How a component supplier can use one evidence file for several buyers",
      practiceText: "The company builds one company-controlled evidence master, preserving validity and history by supplier and material. When different buyer questionnaires arrive, it selects fields for each recipient and shows only the version relevant to the period. The same factual base can be reused while open gaps remain visible.",
      practiceDisclaimer: "This is a method example, not a claim about a specific company, Dossivo customer or compliance outcome.",
      checklistTitle: "Evidence to retain this week",
      checklist: ["Product–facility–supplier–material relationship register", "Evidence validity and version-gap record", "Inquiry responsibilities and disclosure approvals"],
      disclaimer: "This briefing provides compliance-readiness information, not legal advice or certification. The Commission or competent Member State authority makes the final legal determination.",
    },
    it: {
      eyebrow: "Anteprima inaugurale · contenuto esemplificativo",
      subject: "Brief operativo Dossivo sul Regolamento UE sul lavoro forzato · Anteprima",
      title: "Trasformare la preparazione normativa in azioni completabili questa settimana",
      summary: "Questa anteprima mostra il metodo del brief: tradurre norme e informazioni ufficiali in azioni concrete e documentabili per produttori, fornitori, titolari di marchi e importatori di tutto il mondo.",
      focusTitle: "Azioni per le imprese questa settimana",
      actions: [
        { audience: "Ogni impresa che opera sul mercato UE", action: "Elenca prodotti destinati all’UE, stabilimenti effettivi, fornitori diretti e input critici, assegnando un responsabile a ogni dato mancante.", why: "Il Regolamento copre tutti i prodotti, settori e paesi d’origine; anche un componente o materiale di piccola incidenza può rientrare nell’ambito.", evidence: "Registro dell’ambito, responsabile, fonte e data dell’ultima verifica.", basis: "Fatto sull’ambito normativo" },
        { audience: "Produttori e fornitori di componenti", action: "Verifica che le prove critiche abbiano date di validità, versioni e collegamenti ai lotti di produzione, evidenziando subito ogni interruzione.", why: "Una richiesta futura può riguardare il periodo storico di produzione, non soltanto i documenti validi nel giorno della richiesta.", evidence: "Cronologia delle prove, versioni storiche, registro delle interruzioni e attività di integrazione.", basis: "Prassi di preparazione probatoria" },
        { audience: "Titolari di marchi e importatori UE", action: "Simula una risposta a buyer, dogana o autorità e definisci chi raccoglie, verifica e approva la divulgazione.", why: "La mancanza di prove non costituisce da sola la violazione, ma l’incapacità di collaborare tempestivamente aumenta il rischio di richieste e decisioni sfavorevoli.", evidence: "Matrice di risposta, registro delle approvazioni e una bozza di divulgazione controllata.", basis: "Stima di preparazione commerciale · non è un termine legale" },
      ],
      practiceLabel: "Esempio di scenario · non è un cliente reale",
      practiceTitle: "Come un fornitore di componenti può usare lo stesso fascicolo per più buyer",
      practiceText: "L’impresa crea un fascicolo probatorio principale sotto il proprio controllo, conservando validità e cronologia per fornitore e materiale. Quando arrivano questionari diversi, seleziona i campi per ciascun destinatario e mostra solo la versione pertinente al periodo. La stessa base fattuale può essere riutilizzata mantenendo visibili le lacune aperte.",
      practiceDisclaimer: "È un esempio di metodo, non un’affermazione su una specifica impresa, un cliente Dossivo o un esito di conformità.",
      checklistTitle: "Prove da conservare questa settimana",
      checklist: ["Registro prodotto–stabilimento–fornitore–materiale", "Validità delle prove e interruzioni tra versioni", "Responsabilità di risposta e approvazioni alla divulgazione"],
      disclaimer: "Il brief fornisce informazioni per la preparazione alla conformità, non consulenza legale né certificazione. La decisione finale spetta alla Commissione o all’autorità competente dello Stato membro.",
    },
  },
};

export function normalizeNewsletterLanguage(value) {
  return NEWSLETTER_LANGUAGES.includes(value) ? value : "en";
}

export function localizeNewsletterIssue(issue, language) {
  const locale = normalizeNewsletterLanguage(language);
  return {
    id: issue.id,
    slug: issue.slug,
    editionDate: issue.editionDate,
    sourceCutoffAt: issue.sourceCutoffAt,
    publishedAt: issue.publishedAt,
    status: issue.status,
    sources: issue.sources ?? [],
    language: locale,
    ...issue.translations[locale],
  };
}

export function validatePublishableNewsletter(issue) {
  const errors = [];
  if (!issue?.slug || !issue?.editionDate || !issue?.sourceCutoffAt) errors.push("issue metadata is incomplete");
  for (const language of NEWSLETTER_LANGUAGES) {
    const copy = issue?.translations?.[language];
    if (!copy?.title || !copy?.summary || !Array.isArray(copy?.actions) || copy.actions.length === 0) errors.push(`${language} translation is incomplete`);
  }
  return { ok: errors.length === 0, errors };
}

export function maskEmail(email) {
  const [name, domain] = String(email ?? "").split("@");
  if (!name || !domain) return "";
  return `${name.slice(0, 1)}***@${domain}`;
}
