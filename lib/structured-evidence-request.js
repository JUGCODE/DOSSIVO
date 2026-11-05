import {BridgeError} from './paci-bridge-core.js';
export const EVIDENCE_TOPICS={electricity:'用电凭证',social_insurance:'社保缴纳凭证',workforce:'人员汇总',audit:'审核报告',evidence_card:'证据卡片摘要'};
export const EVIDENCE_RESPONSES={PREPARING:'正在准备',UNAVAILABLE:'暂无法提供',CARD_SHARED:'已回应授权卡片'};
const invalid=()=>{throw new BridgeError('INVALID_INPUT','Invalid structured evidence request');};
// Only fixed fields are accepted. No filenames, worker data or exact commercial values.
export function normalizeEvidenceRequest(value){
 if(!value||typeof value!=='object'||Array.isArray(value))return invalid();
 if(value.type==='REQUEST'){
  if(Object.keys(value).some(k=>!['type','topic','period'].includes(k))||!Object.hasOwn(EVIDENCE_TOPICS,value.topic)||typeof value.period!=='string'||!/^20\d{2}-(0[1-9]|1[0-2])$/.test(value.period))return invalid();
  return {type:'REQUEST',topic:value.topic,period:value.period};
 }
 if(value.type==='RESPONSE'){
  if(Object.keys(value).some(k=>!['type','status'].includes(k))||!Object.hasOwn(EVIDENCE_RESPONSES,value.status))return invalid();
  return {type:'RESPONSE',status:value.status};
 }
 return invalid();
}
export function evidenceRequestText(value){return value.type==='REQUEST'?`请求补充：${EVIDENCE_TOPICS[value.topic]} · ${value.period}。材料须单独授权。`:`证据请求回应：${EVIDENCE_RESPONSES[value.status]}。此回应不表示验证通过或事项解决。`;}
