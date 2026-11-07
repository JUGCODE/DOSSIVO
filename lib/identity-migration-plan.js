// Offline migration preflight only. This module does NOT verify login tokens,
// establish sessions, prove dual-account control or authorize account linking.
export function validateIdentityMigrationPlan(plan){
 const fail=code=>{throw Object.assign(Error(code),{code});};
 const text=v=>typeof v==='string'&&v.length>0&&v.length<=500&&v.trim()===v&&!/[\u0000-\u001f\u007f]/.test(v);
 if(!plan||plan.format!=='dossivo-identity-migration/1'||!Array.isArray(plan.allowed_issuers)||!Array.isArray(plan.legacy_actor_ids)||!Array.isArray(plan.bindings))fail('INVALID_PLAN');
 if(plan.bindings.length>10000||plan.legacy_actor_ids.length>10000||plan.allowed_issuers.length>20)fail('PLAN_TOO_LARGE');
 const issuers=new Set();for(const issuer of plan.allowed_issuers){if(!text(issuer))fail('INVALID_ISSUER');let url;try{url=new URL(issuer);}catch{fail('INVALID_ISSUER');}if(url.protocol!=='https:'||url.username||url.password||url.search||url.hash)fail('INVALID_ISSUER');if(issuers.has(issuer))fail('DUPLICATE_ISSUER');issuers.add(issuer);}
 const actors=new Set();for(const actor of plan.legacy_actor_ids){if(!text(actor))fail('INVALID_ACTOR');if(actors.has(actor))fail('DUPLICATE_ACTOR');actors.add(actor);}
 const identities=new Set(),assigned=new Set(),bindings=[];
 for(const binding of plan.bindings){
  if(!binding||!issuers.has(binding.issuer))fail('ISSUER_NOT_ALLOWED');
  if(!text(binding.subject))fail('INVALID_SUBJECT');
  if(!actors.has(binding.actor_id))fail('UNKNOWN_ACTOR');
  const key=JSON.stringify([binding.issuer,binding.subject]);
  if(identities.has(key))fail('DUPLICATE_PROVIDER_IDENTITY');
  if(assigned.has(binding.actor_id))fail('ACTOR_MULTIPLE_BINDINGS');
  identities.add(key);assigned.add(binding.actor_id);
  // Deliberately exclude email/profile data and arbitrary input fields.
  bindings.push({issuer:binding.issuer,subject:binding.subject,actor_id:binding.actor_id});
 }
 if(assigned.size!==actors.size)fail('UNMAPPED_LEGACY_ACTOR');
 return {format:plan.format,bindings,actor_count:actors.size,identity_count:bindings.length,ownership_rewrites:0,activation_allowed:false,requires_verified_sessions:true,requires_dual_control_review:true};
}
