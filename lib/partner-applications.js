import {PARTNER_TYPES} from './partner-catalog.js';
import {isPartnerAdmin,partnerAdminIds} from './partner-admin-auth.js';
import {boundedJson} from './partner-http.js';
const headers={'cache-control':'private, no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
const error=(status,code)=>Response.json({error:code},{status,headers});
const view=row=>{if(!row)return null;let profile;try{profile=JSON.parse(row.profile_json);}catch{profile={};}const {profile_json,...rest}=row;return {...rest,profile};};
export function validatePartnerProfile(profile,type){
 if(!profile||typeof profile!=='object'||Array.isArray(profile))return null;
 const limits={organization:180,contact:120,email:254,country:80,services:1500,qualification:1200};const result={};
 for(const [key,max] of Object.entries(limits)){const v=profile[key];if(typeof v!=='string'||v.trim().length>max||(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/).test(v))return null;result[key]=v.trim();}
 if(!result.organization||!result.contact||!result.country||!result.services||!/^\S+@\S+\.\S+$/.test(result.email)||(type==='professional'&&!result.qualification))return null;
 return result;
}
export async function partnerApplicationRequest(db,actor,configuration,request,{admin=false,clock=()=>new Date().toISOString()}={}){
 if(!actor)return error(401,'AUTH_REQUIRED');
 if(admin&&!isPartnerAdmin(actor,configuration))return error(403,'ADMIN_REQUIRED');
 const url=new URL(request.url),enabled=partnerAdminIds(configuration).length>0;
 if(request.method==='GET'){
 if(url.searchParams.has('history')){
 const type=url.searchParams.get('history'),owner=admin?url.searchParams.get('recipientId'):actor;
 const cursor=url.searchParams.get('before'),before=cursor===null?Number.MAX_SAFE_INTEGER:Number(cursor);
 if(!PARTNER_TYPES.includes(type)||typeof owner!=='string'||!owner.trim()||owner!==owner.trim()||owner.length>200||(cursor!==null&&!/^[1-9][0-9]*$/.test(cursor))||!Number.isSafeInteger(before)||before<1)return error(400,'INVALID_INPUT');
 const rows=await db.prepare(`SELECT revision,actor_id,action,status,reason,created_at FROM dossivo_partner_application_events
 WHERE owner_id=? AND partner_type=? AND revision<? ORDER BY revision DESC LIMIT 26`).bind(owner,type,before).all();
 const page=rows.results.slice(0,25);
 // Explicit projection: never return profile text, operation IDs, or reviewer IDs to applicants.
 const events=page.map(r=>({revision:r.revision,action:r.action,status:r.status,reason:r.reason,createdAt:r.created_at,role:r.action==='review'?'reviewer':'applicant',...(admin?{actorId:r.actor_id}:{})}));
 return Response.json({events,hasMore:rows.results.length>25,nextBefore:rows.results.length>25?page[page.length-1].revision:null},{headers});
 }
 if(admin){
 const status=url.searchParams.get('status')||'pending',offset=Number(url.searchParams.get('offset')||0);
 if(!['pending','needs_changes','approved','rejected','withdrawn'].includes(status)||!Number.isSafeInteger(offset)||offset<0||offset>100000)return error(400,'INVALID_INPUT');
 const rows=await db.prepare('SELECT * FROM dossivo_partner_applications WHERE status=? ORDER BY updated_at,actor_id,partner_type LIMIT 26 OFFSET ?').bind(status,offset).all();
 return Response.json({applications:rows.results.slice(0,25).map(view),hasMore:rows.results.length>25,offset},{headers});
 }
 const rows=await db.prepare('SELECT * FROM dossivo_partner_applications WHERE actor_id=? ORDER BY partner_type').bind(actor).all();
 return Response.json({applications:rows.results.map(view),reviewAvailable:enabled},{headers});
 }
 if(request.method!=='POST')return error(405,'METHOD_NOT_ALLOWED');
 if(request.headers.get('origin')!==url.origin||request.headers.get('sec-fetch-site')==='cross-site')return error(403,'ORIGIN_REQUIRED');
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return error(415,'JSON_REQUIRED');
 let body;try{body=await boundedJson(request,16384);}catch{return error(400,'INVALID_INPUT');}
 if(!body||!PARTNER_TYPES.includes(body.type)||typeof body.operationId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(body.operationId)||!Number.isSafeInteger(body.revision)||body.revision<0)return error(400,'INVALID_INPUT');
 const owner=admin?body.recipientId:actor;
 if(typeof owner!=='string'||!owner.trim()||owner.length>200)return error(400,'INVALID_INPUT');
 const current=await db.prepare('SELECT * FROM dossivo_partner_applications WHERE actor_id=? AND partner_type=?').bind(owner,body.type).first();
 if((current?.revision??0)!==body.revision)return error(409,'STALE_APPLICATION');
 let status,reason='',profile=current?.profile_json;
 if(admin){
 if(body.action!=='review'||!current||!['pending','approved'].includes(current.status)||!['approved','needs_changes','rejected'].includes(body.decision)||(current.status==='approved'&&body.decision==='approved'))return error(409,'INVALID_TRANSITION');
 if(owner===actor)return error(403,'SELF_REVIEW_FORBIDDEN');
 status=body.decision;
 if(status==='approved'&&body.verified!==true)return error(400,'VERIFICATION_REQUIRED');
 if(status!=='approved'){
 if(!['identity','scope','credentials','other'].includes(body.reason))return error(400,'REASON_REQUIRED');reason=body.reason;
 }
 }else if(body.action==='submit'){
 if(!enabled)return error(503,'REVIEW_UNAVAILABLE');
 if(current&&!['needs_changes','rejected','withdrawn'].includes(current.status))return error(409,'INVALID_TRANSITION');
 const clean=validatePartnerProfile(body.profile,body.type);if(!clean||body.consent!==true)return error(400,'INVALID_PROFILE');
 profile=JSON.stringify(clean);status='pending';
 }else if(body.action==='withdraw'){
 if(!current||current.status==='withdrawn')return error(409,'INVALID_TRANSITION');status='withdrawn';
 }else return error(400,'INVALID_INPUT');
 const now=clock(),revision=body.revision+1;
 // Unique owner/type/revision provides optimistic concurrency inside the atomic batch.
 const event=db.prepare('INSERT INTO dossivo_partner_application_events(operation_id,owner_id,partner_type,revision,actor_id,action,status,reason,created_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(body.operationId,owner,body.type,revision,actor,body.action,status,reason,now);
 const update=db.prepare(`INSERT INTO dossivo_partner_applications(actor_id,partner_type,revision,status,profile_json,reason,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?)
 ON CONFLICT(actor_id,partner_type) DO UPDATE SET revision=excluded.revision,status=excluded.status,profile_json=excluded.profile_json,reason=excluded.reason,updated_at=excluded.updated_at WHERE dossivo_partner_applications.revision=?`).bind(owner,body.type,revision,status,profile,reason,current?.created_at??now,now,body.revision);
 const statements=[event,update];
 // Any loss of approved eligibility revokes every contract version for this track.
 if(status!=='approved')statements.push(db.prepare('UPDATE dossivo_partner_contract_access SET revoked_at=? WHERE recipient_id=? AND contract_type=? AND revoked_at IS NULL').bind(now,owner,body.type));
 try{await db.batch(statements);}catch{return error(409,'CONFLICT');}
 return Response.json({ok:true,status,revision},{headers});
}
