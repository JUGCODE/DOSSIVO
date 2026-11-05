import {MATERIAL_CATALOG,coverageFor} from './evidence-coverage.js';
import { BridgeError, fingerprint } from './paci-bridge-core.js';
export const TASK_SCHEMA = 'dossivo-private-task/0.2';
export const CHECKER = 'dossivo-preparation/0.2';
export const FIELD_CODES = ['roster_headcount','si_headcount','payroll_headcount','payroll_total','revenue','kwh_monthly','output_qty'];
// Synthetic fixtures are the only readable materials in this release. No model is invoked.
export const SAMPLES = Object.freeze({
  normal: { title:'合成汇总 · 正常口径', text:'工厂：合成工厂A\n期间：2026-10\n名册人数：10人\n参保人数：10人\n代发人数：10人\n代发总额：5万元\n营收：20万元\n用电量：2000kWh\n产量：1000件\n制度：不得扣押证件。实际执行未评估。' },
  missing: { title:'合成汇总 · 缺项与零分母', text:'工厂：合成工厂A\n期间：2026-10\n名册人数：0人\n参保人数：0人\n代发人数：0人\n代发总额：0元\n说明：营收、用电、产量未提供；附件未取得。' },
  issue: { title:'合成汇总 · 待解释差异', text:'工厂：合成工厂A\n期间：2026-10\n名册人数：10人\n参保人数：7人\n代发人数：8人\n代发总额：4万元\n营收：20万元\n用电量：2000kWh\n产量：1000件\n说明：差异原因及补付情况尚未核实。' },
});
const labels = ['名册人数','参保人数','代发人数','代发总额','营收','用电量','产量'];
export function required(v, label, max=500) { if(typeof v!=='string'||!v.trim()||v.length>max) throw new BridgeError('INVALID_INPUT',`${label} is required (max ${max})`); return v.trim(); }
function numeric(v) { if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>1e12) throw new BridgeError('INVALID_VALUE','A finite non-negative value is required'); return v; }
export function initialTask(data,id,now) {
  if(data.synthetic_only!==true) throw new BridgeError('REAL_DATA_DISABLED','Only synthetic materials are enabled',403);
  return {schema_version:TASK_SCHEMA, task_id:id, version:1, synthetic_only:true, visibility:'PRIVATE', created_at:now,
    outcome:{purpose:required(data.purpose,'purpose'),organization:required(data.organization,'organization'),facility:required(data.facility,'facility'),period:required(data.period,'period'),recipient:typeof data.recipient==='string'?data.recipient.slice(0,320):''},
    materials:[],fields:[],flags:[],assessments:[],cards:[],events:[],
    versions:{dossivo_version:'0.2.0',protocol_version:null,profile_version:null,schema_version:TASK_SCHEMA,api_version:'dossivo-task-api/0.2',paciscan_version:null,benchmark_version:null},
  };
}
function mutable(state) { if(state.materials.length>100||state.fields.length>500||state.events.length>=500) throw new BridgeError('TASK_LIMIT','Start a new task; this sandbox task has reached its bounded capacity',409); }
function field(state,id) { const f=state.fields.find(x=>x.id===id); if(!f) throw new BridgeError('FIELD_NOT_FOUND','Field not found',404); return f; }
export async function transitionTask(before,cmd,actor,now,uuid) {
  const s=structuredClone(before), d=cmd.data??{}; mutable(s);
  switch(cmd.action) {
    case 'choose_materials': {
      if(!Array.isArray(d.categories)||d.categories.length>11||d.categories.some(c=>!MATERIAL_CATALOG.some(x=>x.code===c)))throw new BridgeError('INVALID_CATEGORY','Choose recognised material categories');
      s.preparation_categories=[...new Set(d.categories)];break;
    }
    case 'import_text': {
      if(d.synthetic_only!==true)throw new BridgeError('REAL_DATA_DISABLED','Real labour originals remain disabled',403);
      const text=required(d.text,'synthetic UTF-8 text',10000),title=required(d.title,'title',150);
      if(typeof d.period!=='string'||!/^\d{4}-(0[1-9]|1[0-2])$/.test(d.period))throw new BridgeError('INVALID_SCOPE','A YYYY-MM source period is required');
      if(!Array.isArray(d.categories)||!d.categories.length||d.categories.length>11||d.categories.some(c=>!MATERIAL_CATALOG.some(x=>x.code===c)))throw new BridgeError('INVALID_CATEGORY','Select the actual material categories');
      const id=uuid();s.materials.push({id,version:1,mode:'SYNTHETIC_TEXT',synthetic:true,title,text,text_sha256:await fingerprint({text}),categories:[...new Set(d.categories)],scope:{facility:required(d.facility,'source facility'),period:d.period},source:'SELF_REPORTED',original_seen:false,root_id:id,created_at:now,review:null});break;
    }
    case 'confirm_material': {
      const m=s.materials.find(m=>m.id===d.material_id);if(!m||m.mode==='DIRECTORY')throw new BridgeError('SOURCE_NOT_READABLE','A directory is not submitted evidence',409);
      m.review={status:'COMPANY_CONFIRMED',actor,at:now,basis:required(d.reason,'review basis')};break;
    }
    case 'add_material': {
      const id=uuid();
      const categories=Array.isArray(d.categories)?[...new Set(d.categories)]:[];
      if(categories.some(c=>!MATERIAL_CATALOG.some(x=>x.code===c)))throw new BridgeError('INVALID_CATEGORY','Unknown material category');
      if(d.mode==='DIRECTORY') {
        s.materials.push({id,version:1,mode:'DIRECTORY',categories,title:required(d.title,'title'),custodian:required(d.custodian,'custodian'),scope:{...s.outcome},source:'SELF_REPORTED',original_seen:false,root_id:id,created_at:now});
      } else {
        const sample=Object.hasOwn(SAMPLES,d.sample)?SAMPLES[d.sample]:null;
        if(!sample) throw new BridgeError('SYNTHETIC_SAMPLE_REQUIRED','Choose a bundled synthetic sample',403);
        s.materials.push({id,version:1,mode:'SYNTHETIC_TEXT',categories:categories.length?categories:['roster_headcount','social_insurance','payroll','revenue','electricity','production'],title:sample.title,text:sample.text,text_sha256:await fingerprint({text:sample.text}),scope:{facility:'合成工厂A',period:'2026-10'},source:'SELF_REPORTED',original_seen:false,synthetic:true,root_id:id,created_at:now});
      }
      break;
    }
    case 'locate_fields': {
      const m=s.materials.find(x=>x.id===d.material_id);
      if(!m||m.mode!=='SYNTHETIC_TEXT') throw new BridgeError('SOURCE_NOT_READABLE','A directory entry is not a readable original',409);
      if(s.fields.some(x=>x.material_id===m.id)) throw new BridgeError('ALREADY_LOCATED','Fields already located',409);
      for(let i=0;i<labels.length;i++) {
        const re=new RegExp(labels[i]+'：([0-9]+(?:\\.[0-9]+)?)(万元|元|人|kWh|件)'); const match=re.exec(m.text);
        if(!match) continue;
        const raw=Number(match[1]), unit=match[2], scale=unit==='万元'?10000:1;
        s.fields.push({id:uuid(),code:FIELD_CODES[i],material_id:m.id,material_version:1,root_id:m.root_id,
          locator:{page:1,line:m.text.slice(0,match.index).split('\n').length,start_utf16:match.index,end_utf16:match.index+match[0].length,quote:match[0]},
          raw_value:raw,raw_unit:unit,extracted_value:raw*scale,unit:unit==='万元'||unit==='元'?'CNY':unit,
          conversion:{factor:scale,basis:scale===10000?'1万元=10000元':'identity'},scope:{facility:m.scope.facility,period:m.scope.period},
          expression:'QUOTE',method:CHECKER+'/fixture-regex',model:null,located_at:now,confirmed_value:null,confirmations:[]});
      }
      break;
    }
    case 'confirm_field': {
      const f=field(s,d.field_id), value=numeric(d.value),reason=required(d.reason,'reason');
      f.confirmations.push({value,reason,actor,at:now,previous_value:f.confirmed_value}); f.confirmed_value=value; break;
    }
    case 'open_flag': {
      s.flags.push({id:uuid(),rule_code:'X1',title:required(d.title,'title'),severity:['yellow','red'].includes(d.severity)?d.severity:'yellow',status:'open',target_version:before.version,history:[{status:'open',actor,at:now,comment:required(d.comment,'comment')}],independent_adjudication:'PENDING_REVIEWER'});break;
    }
    case 'flag_response': {
      const f=s.flags.find(x=>x.id===d.flag_id); if(!f) throw new BridgeError('FLAG_NOT_FOUND','Flag not found',404);
      if(!['explained','remediating'].includes(d.status)||f.status==='resolved') throw new BridgeError('INVALID_TRANSITION','Only pending explanation/remediation is enabled');
      f.status=d.status;f.history.push({status:d.status,actor,at:now,comment:required(d.comment,'comment')});break;
    }
    case 'assess': s.assessments.push({...await assessTask(s),id:uuid(),input_version:before.version,checker_version:CHECKER,profile_version:null,at:now});break;
    case 'freeze_card': {
      const a=s.assessments.at(-1);
      if(!a||a.input_version!==before.version-1||s.events.at(-1)?.action!=='assess') throw new BridgeError('ASSESSMENT_STALE','Run a fresh assessment before freezing',409);
      const body={format:'dossivo-preparation-card/0.2',task_id:s.task_id,task_version:before.version,outcome:s.outcome,versions:s.versions,
        materials:s.materials,fields:s.fields,flags:s.flags,coverage:coverageFor(s),assessment:a,visibility:'PRIVATE',synthetic_only:true,
        registration_status:'NOT_REGISTERED',chain_status:'NOT_CONNECTED',formal_card:false,signature:null,proof_package:null,created_at:now};
      s.cards.push({id:uuid(),body,sha256:await fingerprint(body)});break;
    }
    case 'publish_formal': throw new BridgeError('PROTOCOL_NOT_VERIFIED','Formal publication requires a signed card, verified PACI receipt and actual Protocol execution proof',409);
    default: throw new BridgeError('INVALID_ACTION','Unsupported task action');
  }
  s.version=before.version+1;s.events.push({id:uuid(),action:cmd.action,actor,at:now,input_version:before.version,output_version:s.version});return s;
}
export async function assessTask(s) {
  const found = new Map(), missing=[],metrics=[];
  for(const code of FIELD_CODES) {
    const candidates=s.fields.filter(f=>f.code===code&&f.confirmed_value!==null);
    if(candidates.length===1&&candidates[0].scope.facility===s.outcome.facility&&candidates[0].scope.period===s.outcome.period) found.set(code,candidates[0]); else missing.push({code,reason:candidates.length?'AMBIGUOUS_INPUT':'MISSING_CONFIRMED_INPUT'});
  }
  const formulas=[['R1','si_headcount','roster_headcount'],['R2','payroll_headcount','roster_headcount'],['R3','output_qty','roster_headcount'],['R4','revenue','roster_headcount'],['R5a','payroll_total','payroll_headcount'],['R5b','payroll_total','revenue'],['R6a','kwh_monthly','roster_headcount'],['R6b','kwh_monthly','output_qty']];
  const units={roster_headcount:'人',si_headcount:'人',payroll_headcount:'人',payroll_total:'CNY',revenue:'CNY',kwh_monthly:'kWh',output_qty:'件'};
  for(const [code,num,den] of formulas) {
    const n=found.get(num),d=found.get(den);let reason=null;
    if(!n||!d) reason='MISSING_CONFIRMED_INPUT';
    else if(n.unit!==units[num]||d.unit!==units[den]) reason='UNIT_MISMATCH';
    else if(n.scope.facility!==d.scope.facility||n.scope.period!==d.scope.period) reason='SCOPE_MISMATCH';
    else if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(n.scope.period)) reason='MONTHLY_SCOPE_REQUIRED';
    else if(d.confirmed_value===0) reason='ZERO_DENOMINATOR';
    const value=reason?null:Number(((n.confirmed_value/d.confirmed_value)*(code==='R4'?12:1)).toPrecision(12));
    metrics.push({code,value,status:reason?'INCONCLUSIVE':'CALCULATED',reason,input_fields:[n?.id,d?.id].filter(Boolean),input_roots:[...new Set([n?.root_id,d?.root_id].filter(Boolean))],formula:code==='R4'?'monthly_revenue * 12 / monthly_headcount':`${num} / ${den}`,scope:n?.scope??null});
  }
  const incomplete=metrics.some(m=>m.value===null)||s.fields.some(f=>f.confirmed_value===null)||s.materials.some(m=>m.mode==='DIRECTORY');
  return {input_digest:await fingerprint({materials:s.materials,fields:s.fields,flags:s.flags}),metrics,missing,
    unresolved:s.flags.filter(f=>['open','explained','remediating'].includes(f.status)).map(f=>({id:f.id,severity:f.severity,status:f.status,title:f.title})),
    incomplete,summary:{unresolved:s.flags.some(f=>f.status!=='resolved'),insufficient:incomplete,unassessed:['H1–H7 applicability and substantive review','P1–P7 calibrated independent benchmark','Actual working conditions and legal assessment'],no_anomaly:false},
    rule_policy:'PREPARATION_ONLY_NO_ADOPTED_PROFILE',independent_source_count:null};
}
