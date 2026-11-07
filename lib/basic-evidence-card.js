import {coverageFor,MATERIAL_CATALOG} from './evidence-coverage.js';
import {BridgeError} from './paci-bridge-core.js';
export const PARAMETER_LABELS={roster_headcount:'名册人数',si_headcount:'参保人数',payroll_headcount:'代发人数',payroll_total:'代发工资总额',revenue:'营收',kwh_monthly:'月度用电量',output_qty:'产量'};
export const BASIC_FIELD_CODES=['roster_headcount','si_headcount','payroll_headcount','payroll_total','revenue','kwh_monthly','output_qty'];
export function chooseDisclosure(data){
 const fields=data.fields??[],categories=data.categories??[];
 if(!Array.isArray(fields)||fields.length>7||fields.some(c=>!BASIC_FIELD_CODES.includes(c))||!Array.isArray(categories)||categories.length>11||categories.some(c=>!MATERIAL_CATALOG.some(x=>x.code===c)))throw new BridgeError('INVALID_DISCLOSURE','Only recognised basic parameters may be shared');
 return {fields:[...new Set(fields)],categories:[...new Set(categories)]};
}
export function basicProjection(card,choice){
 const b=card.body??card,coverage=b.coverage??coverageFor(b);
 return {format:'dossivo-basic-evidence/0.1',source_card_id:card.id??null,synthetic_only:b.synthetic_only===true,formal_card:false,task_version:b.task_version,created_at:b.created_at,
  scope:{organization:b.outcome.organization,facility:b.outcome.facility,period:b.outcome.period},
  coverage:{percent:coverage.percent,submitted:coverage.submitted,total_catalog:coverage.total_catalog,company_confirmed:coverage.company_confirmed,checked:coverage.checked,levels:coverage.levels,interpretation:'MATERIAL_COVERAGE_ONLY'},
  materials:coverage.items.filter(x=>choice.categories.includes(x.code)).map(x=>({code:x.code,level:x.level,submitted:x.submitted,company_confirmed:x.company_confirmed,checks:x.checks})),
  parameters:b.fields.filter(f=>choice.fields.includes(f.code)&&f.confirmed_value!==null).map(f=>({code:f.code,value:f.confirmed_value,unit:f.unit,scope:f.scope,source:'SELF_REPORTED',confirmation:'COMPANY_CONFIRMED'})),
  assessment:{checker_version:b.assessment.checker_version,profile_version:b.assessment.profile_version,insufficient:b.assessment.summary.insufficient,unassessed:b.assessment.summary.unassessed,benchmark_status:'NOT_ASSESSED_NO_COMPARABLE_DATA'},
  issues:issueSummary(b.flags),chain_status:'NOT_CONNECTED',notice:'Material coverage and company confirmation are not independent authentication, a legal certification or a guarantee of working conditions. No originals are disclosed.'};
}
export function issueSummary(flags){const unresolved=flags.filter(f=>f.status!=='resolved');return {unresolved_count:unresolved.length,red_count:unresolved.filter(f=>f.severity==='red').length,stages:[...new Set(unresolved.map(f=>f.status))]};}
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function cardHtml(view,language='en'){
 const p=view.snapshot??view,zh=language==='zh',lang=zh?'zh-CN':'en';
 const t=(cn,en)=>zh?cn:en;
 const labels={roster_headcount:'Roster headcount',si_headcount:'Insured headcount',payroll_headcount:'Payroll headcount',payroll_total:'Total payroll',revenue:'Revenue',kwh_monthly:'Monthly electricity use',output_qty:'Production output'};
 const stage=s=>zh?({open:'待处理',explained:'说明待审',remediating:'整改中',resolved:'已解决',red:'红色',yellow:'黄色',green:'绿色'}[s]??s):s;
 return `<!doctype html><html lang="${lang}"><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${t('DOSSIVO 证据卡','DOSSIVO Evidence Card')}</title><style>body{font:16px/1.7 system-ui;color:#25382d;max-width:900px;margin:40px auto;padding:24px}h1{color:#8a6b2a}table{border-collapse:collapse;width:100%}td,th{border-bottom:1px solid #ddd;padding:10px;text-align:left}p{overflow-wrap:anywhere}@media print{body{margin:0}}</style>
 <h1>DOSSIVO · ${t('基本证据卡','Basic evidence card')}</h1><p>${esc(p.scope.organization)} · ${esc(p.scope.facility)} · ${esc(p.scope.period)} · v${esc(p.task_version)}</p>
 <p>${t('固定卡标识','Source card ID')}: ${esc(p.source_card_id??t('历史版本未提供','Not recorded in historical version'))}. ${t('仅用于对应固定版本，不是认证或链上证明。','Identifies a fixed version; not certification or on-chain proof.')}</p>
 <p>${t('材料覆盖','Material coverage')}: ${esc(p.coverage.submitted)} / ${esc(p.coverage.total_catalog)} (${esc(p.coverage.percent)}%)</p><p>${t('企业确认','Company confirmed')}: ${esc(p.coverage.company_confirmed)} · ${t('已检查','Checked')}: ${esc(p.coverage.checked)}</p>
 <h2>${t('获准基本参数','Authorised parameters')}</h2><table><tr><th>${t('参数','Parameter')}</th><th>${t('数值','Value')}</th><th>${t('期间与场所','Period / facility')}</th></tr>${p.parameters.map(x=>`<tr><td>${esc((zh?PARAMETER_LABELS:labels)[x.code]??x.code)}</td><td>${esc(x.value)} ${esc(x.unit)}</td><td>${esc(x.scope.period)} / ${esc(x.scope.facility)}</td></tr>`).join('')}</table>
 <h2>${t('获准材料状态','Authorised material status')}</h2><table>${p.materials.map(x=>`<tr><td>${esc(MATERIAL_CATALOG.find(c=>c.code===x.code)?.[zh?'zh':'en']??x.code)}</td><td>${x.submitted?t('已提交','Submitted'):t('未提交','Not submitted')}</td><td>${x.company_confirmed?t('企业已确认','Company confirmed'):t('待确认','Unconfirmed')}</td></tr>`).join('')}</table>
 <h2>${t('范围与未解决事项','Scope and unresolved matters')}</h2><p>${t('固定卡未解决事项','Snapshot unresolved')}: ${esc(p.issues.unresolved_count)}; ${t('红色','red')}: ${esc(p.issues.red_count)}. ${t('下载时授权范围内事项数','Authorised issue count at download')}: ${esc(view.current_status?.unresolved_count??t('未检查','not checked'))}. ${t('资料不足项','Scope incomplete')}: ${esc(p.assessment.insufficient)}.</p>
 <p>${t('后续任务变更需要复核；本副本不包含未发布资料。','Subsequent task changes require review. This copy excludes unpublished material.')}</p>
 ${view.version_policy==='FOLLOW_PUBLISHED'?`<h2>${t('已发布历史','Published history')}</h2><p>${t('所选发布序号','Selected publication')}: ${esc(view.publication_sequence)}; ${t('下载时最新序号','latest at download')}: ${esc(view.latest_publication_sequence)}.</p>${(view.publication_history??[]).map(h=>`<p>#${esc(h.sequence)} · v${esc(h.task_version)} · ${esc(h.published_at)} · ${t('卡片','Card')} ${esc(h.card_id)} · ${t('未解决','unresolved')} ${esc(h.issues.unresolved_count)} / ${t('红色','red')} ${esc(h.issues.red_count)}${h.issue_states.map(f=>`<br>${t('事项','Issue')} ${esc(f.id)}: ${esc(stage(f.severity))} / ${esc(stage(f.status))}`).join('')}</p>`).join('')}`:''}
 <p>${t('同行比较：无可比基准，未评估。','Peer comparison: no comparable benchmark; not assessed.')}</p>
 <p>${t('材料覆盖与企业确认不是独立核验、法律认证或工作条件保障。不包含原件。','Material coverage and company confirmation are not independent authentication, legal certification or assurance of working conditions. No originals are disclosed.')}</p>
 <p>${t('定版时间','Snapshot created')}: ${esc(p.created_at)}. ${t('在线授权到期','Online access expires')}: ${esc(view.expires_at??(view.access_mode==='CONTINUOUS_SUMMARY'?t('持续至撤销','Until revoked'):t('不适用','not applicable')))}. ${t('在线授权到期不会使已下载的历史卡片失效或无法阅读。','This deadline does not invalidate or disable this downloaded historical snapshot.')}</p>
 <p>${t('合成资料','Synthetic')}: ${p.synthetic_only?t('是','Yes'):t('否','No')} · ${t('正式链上卡：否','Formal on-chain card: false')} · ${t('下载时间','Downloaded')}: ${esc(view.downloaded_at??new Date().toISOString())}. ${t('离线副本不能查询后续撤销或更新，已下载副本无法远程收回。','Offline copies cannot check later revocation or updates and cannot be recalled remotely.')}</p></html>`;
}
