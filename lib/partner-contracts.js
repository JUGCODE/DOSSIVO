import {PARTNER_TYPES} from './partner-catalog.js';
export const PARTNER_DRAFT_VERSION='partners-draft/0.1-2026-11-06';
export function validPartnerVersion(version){return typeof version==='string'&&/^partners-draft\/[0-9]{1,4}\.[0-9]{1,4}(?:\.[0-9]{1,4})?-[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(version);}
// Confidential documents are runtime records, never bundled source.
const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const draftLabel=d=>d.language==='zh'?'草案 · 未生效 · 所有比例待确认':d.language==='it'?'Bozza · Non efficace · Compensi da approvare':'Draft · Not effective · All commercial terms subject to approval';
export function partnerContractMarkdown(d){return `# DOSSIVO · ${d.title}\n\n**${draftLabel(d)}**\n\n${d.language==='zh'?'版本':'Version'}: ${d.version}\n\n${d.summary}\n\n`+d.clauses.map(([title,text],i)=>`## ${i+1}. ${title}\n\n${text}`).join('\n\n')+'\n';}
export function partnerContractHtml(d){return `<!doctype html><html lang="${esc(d.language)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(d.title)}</title><style>body{font:16px/1.8 system-ui;max-width:860px;margin:40px auto;padding:24px;color:#234337;overflow-wrap:anywhere}aside{background:#fff6da;padding:20px;border:1px solid #c2a253}h1{font-size:28px}h2{font-size:20px;margin-top:30px}@media print{body{margin:0}h2{break-after:avoid}}</style></head><body><h1>DOSSIVO · ${esc(d.title)}</h1><aside>${esc(draftLabel(d))}<br>${esc(d.version)}<br>${esc(d.summary)}</aside>${d.clauses.map(([title,text],i)=>`<h2>${i+1}. ${esc(title)}</h2><p>${esc(text)}</p>`).join('')}</body></html>`;}
export function validPartnerDocument(d,type,language,version=PARTNER_DRAFT_VERSION){
 return !!d&&['zh','en','it'].includes(language)&&PARTNER_TYPES.includes(type)&&d.type===type&&validPartnerVersion(version)&&d.version===version&&d.language===language&&d.status==='DRAFT_NOT_EFFECTIVE'&&typeof d.title==='string'&&d.title.length<=500&&typeof d.summary==='string'&&d.summary.length<=10000&&Array.isArray(d.clauses)&&d.clauses.length<=100&&d.clauses.every(row=>Array.isArray(row)&&row.length===2&&row.every(v=>typeof v==='string'&&v.length<=50000));
}
/** @param {any} actor @param {string} url @param {any} approval @param {any} document */
export function partnerContractResponse(actor,url,approval=null,document=null){
 const headers={'cache-control':'private, no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
 if(!actor)return Response.json({error:'AUTH_REQUIRED'},{status:401,headers});
 const u=new URL(url),type=u.searchParams.get('type'),language=u.searchParams.get('lang')??'zh',d=document,format=u.searchParams.get('format')??'html',version=u.searchParams.get('version')??PARTNER_DRAFT_VERSION;
 if(!approval||approval.recipient_id!==actor||approval.contract_type!==type||!validPartnerVersion(version)||approval.contract_version!==version||approval.revoked_at||!approval.approved_by||!Number.isFinite(Date.parse(approval.expires_at))||Date.parse(approval.expires_at)<=Date.now())return Response.json({error:'APPROVAL_REQUIRED'},{status:403,headers});
 if(!validPartnerDocument(d,type,language,version))return Response.json({error:'DOCUMENT_NOT_RELEASED'},{status:404,headers});
 if(!['html','md'].includes(format))return Response.json({error:'INVALID_CONTRACT'},{status:400,headers});
 return new Response(format==='html'?partnerContractHtml(d):partnerContractMarkdown(d),{headers:{...headers,'content-type':format==='html'?'text/html; charset=utf-8':'text/markdown; charset=utf-8','content-disposition':`attachment; filename="DOSSIVO_Partner_${d.type}_${d.version.replace(/[^a-zA-Z0-9.-]/g,'_')}_DRAFT.${format}"`,'content-security-policy':"sandbox; default-src 'none'; style-src 'unsafe-inline'"}});
}
