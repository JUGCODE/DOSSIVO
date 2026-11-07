import {validEvidenceScope,matchesEvidenceScope} from './evidence-scope.js';
// Material coverage, never a trust weight, independent audit or legal rating.
export const MATERIAL_CATALOG = [
 {code:'contract_sample',level:'L1',zh:'劳动合同样本',en:'Contract sample',it:'Campione di contratto',fields:[]},
 {code:'roster_headcount',level:'L1',zh:'员工名册人数汇总',en:'Roster headcount',it:'Numero di addetti',fields:['roster_headcount']},
 {code:'work_hours_policy',level:'L1',zh:'工时与加班制度',en:'Working-hours policy',it:'Politica orari',fields:[]},
 {code:'handbook',level:'L1',zh:'员工手册与招聘政策',en:'Handbook and recruitment policy',it:'Manuale e reclutamento',fields:[]},
 {code:'social_insurance',level:'L2',zh:'社保缴纳凭证与人数',en:'Social-insurance payment evidence',it:'Prove contributive',fields:['si_headcount']},
 {code:'payroll',level:'L2',zh:'工资代发凭证与汇总',en:'Payroll payment evidence',it:'Prove di pagamento salari',fields:['payroll_total','payroll_headcount']},
 {code:'revenue',level:'L2',zh:'营收与财务汇总',en:'Revenue summary',it:'Riepilogo ricavi',fields:['revenue']},
 {code:'attendance',level:'L2',zh:'考勤与加班汇总',en:'Attendance and overtime summary',it:'Presenze e straordinari',fields:[]},
 {code:'electricity',level:'L3',zh:'用电账单与月度用电量',en:'Electricity bills and monthly kWh',it:'Bollette e consumi elettrici',fields:['kwh_monthly']},
 {code:'production',level:'L3',zh:'产量、出货或生产记录',en:'Production or shipment records',it:'Produzione e spedizioni',fields:['output_qty']},
 {code:'audit_report',level:'L3',zh:'已有第三方审核报告',en:'Existing external audit report',it:'Rapporto di audit esistente',fields:[]},
];
export function coverageFor(state){
 const scope=state.outcome;
 const scoped=validEvidenceScope(scope);
 const matches=value=>matchesEvidenceScope(scope,value);
 const chosen=state.preparation_categories??MATERIAL_CATALOG.map(c=>c.code);
 const items=MATERIAL_CATALOG.map(c=>{
  const materials=state.materials.filter(m=>matches(m.scope)&&(m.categories??[]).includes(c.code));
  const submitted=materials.some(m=>m.mode!=='DIRECTORY'&&typeof m.text==='string'&&!!m.text.trim());
  const confirmed=materials.some(m=>m.mode!=='DIRECTORY'&&typeof m.text==='string'&&!!m.text.trim()&&m.review?.status==='COMPANY_CONFIRMED');
  const fieldConfirmed=c.fields.length>0&&c.fields.every(code=>state.fields.some(f=>f.code===code&&matches(f.scope)&&typeof f.confirmed_value==='number'&&Number.isFinite(f.confirmed_value)&&materials.some(m=>m.id===f.material_id&&m.mode!=='DIRECTORY'&&typeof m.text==='string'&&!!m.text.trim())));
  return {code:c.code,level:c.level,selected:chosen.includes(c.code),directory:materials.some(m=>m.mode==='DIRECTORY'),submitted,company_confirmed:submitted&&(confirmed||fieldConfirmed),checks:'UNASSESSED'};
 });
 const selected=items.filter(c=>c.selected),count=items.filter(c=>c.submitted).length;
 return {schema:'dossivo-material-coverage/0.2',scope:scoped?{facility:scope.facility,period:scope.period}:null,scope_status:scoped?'MATCHED_TASK_SCOPE':'SCOPE_UNAVAILABLE',excluded_material_count:state.materials.filter(m=>!matches(m.scope)).length,items,total_catalog:items.length,submitted:count,company_confirmed:items.filter(c=>c.company_confirmed).length,checked:0,
  percent:Math.round(count/items.length*100),selected_total:selected.length,selected_submitted:selected.filter(c=>c.submitted).length,
  levels:['L1','L2','L3'].map(level=>({level,submitted:items.filter(c=>c.level===level&&c.submitted).length,total:items.filter(c=>c.level===level).length})),
  interpretation:'MATERIAL_COVERAGE_ONLY',benchmark_status:'NOT_ASSESSED_NO_COMPARABLE_DATA',independent_verification:false};
}
