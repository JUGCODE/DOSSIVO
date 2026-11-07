export const SYNTHETIC_PARSER_VERSION='dossivo-synthetic-parser/1.2';
const definitions=[
 ['roster_headcount',['名册人数','Roster headcount','Addetti in elenco'],'people'],
 ['si_headcount',['参保人数','Insured headcount','Addetti assicurati'],'people'],
 ['payroll_headcount',['代发人数','Payroll headcount','Addetti retribuiti'],'people'],
 ['payroll_total',['代发总额','Payroll total','Totale retribuzioni'],'money'],
 ['revenue',['营收','Revenue','Ricavi'],'money'],
 ['kwh_monthly',['用电量','Monthly electricity','Elettricità mensile'],'energy'],
 ['output_qty',['产量','Production quantity','Quantità prodotta'],'quantity']
];
const units={people:'人|people|persons|persone',money:'万元|元|CNY',energy:'kWh',quantity:'件|units|pezzi'};
export function parseSyntheticFields(text){
 if(typeof text!=='string'||text.length>10000)throw Error('INVALID_SYNTHETIC_TEXT');
 const fields=[];
 for(const [code,labels,kind] of definitions){
  const pattern=new RegExp(String.raw`(^|[\s;；])(${labels.join('|')})[\t ]*[:：][\t ]*([0-9]+(?:\.[0-9]+)?)[\t ]*(${units[kind]})(?![\p{L}\p{N}_])`,'giu');
  for(const match of text.matchAll(pattern)){
   const start=match.index+match[1].length,quote=match[0].slice(match[1].length),raw=Number(match[3]),rawUnit=match[4],factor=rawUnit==='万元'?10000:1,value=raw*factor;
   if(!Number.isFinite(value)||value>1e12)continue;
   fields.push({code,raw_value:raw,raw_unit:rawUnit,extracted_value:value,unit:kind==='people'?'人':kind==='money'?'CNY':kind==='energy'?'kWh':'件',conversion:{factor,basis:factor===10000?'1万元=10000元':'identity'},locator:{page:1,line:text.slice(0,start).split('\n').length,start_utf16:start,end_utf16:start+quote.length,quote},method:SYNTHETIC_PARSER_VERSION,model:null});
  }
 }
 return fields.sort((a,b)=>a.locator.start_utf16-b.locator.start_utf16);
}

export function inspectSyntheticText(text){
 const fields=parseSyntheticFields(text),located=new Set(fields.map(f=>f.locator.start_utf16));
 const labels=definitions.flatMap(([code,names,kind])=>names.map(label=>({code,label,kind}))),byLabel=new Map(labels.map(item=>[item.label.toLowerCase(),item]));
 const pattern=new RegExp(String.raw`(^|[\s;；])(${labels.map(item=>item.label).join('|')})(?![\p{L}\p{N}_])`,'giu');
 const candidates=[...text.matchAll(pattern)],issues=[],issue_counts={};let issue_count=0;
 for(let i=0;i<candidates.length;i++){
  const match=candidates[i],start=match.index+match[1].length;if(located.has(start))continue;
  const definition=byLabel.get(match[2].toLowerCase()),tailStart=start+match[2].length;
  const lineEnd=text.slice(tailStart).search(/[\r\n;；]/),next=candidates[i+1];
  const end=Math.min(lineEnd<0?text.length:tailStart+lineEnd,next?next.index+next[1].length:text.length);
  const tail=text.slice(tailStart,end).trim();let reason='FORMAT_UNSUPPORTED';
  if(/^[:：]/u.test(tail)){
   const value=tail.slice(1).trim(),number=value.match(/^([0-9]+(?:\.[0-9]+)?)[\t ]*(.*)$/u);
   if(!number||/^[0-9.,]*,/u.test(value))reason='NUMBER_FORMAT_UNSUPPORTED';
   else if(!number[2])reason='UNIT_MISSING';
   else if(!new RegExp('^(?:'+units[definition.kind]+')$','iu').test(number[2]))reason='UNIT_UNSUPPORTED';
   else reason='VALUE_OUT_OF_RANGE';
  }
  issue_count++;issue_counts[definition.code]=(issue_counts[definition.code]??0)+1;if(issues.length<100)issues.push({code:definition.code,reason,locator:{page:1,line:text.slice(0,start).split('\n').length,start_utf16:start,end_utf16:end,quote:text.slice(start,end)}});
 }
 return {fields,report:{parser_version:SYNTHETIC_PARSER_VERSION,field_count:fields.length,recognised_labels:candidates.length,issue_count,issue_counts,issues,truncated:issue_count>issues.length,model:null}};
}
