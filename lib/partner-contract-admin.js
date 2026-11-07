import {validPartnerVersion,validPartnerDocument} from './partner-contracts.js';
import {PARTNER_TYPES} from './partner-catalog.js';
import {isPartnerAdmin} from './partner-admin-auth.js';
export {isPartnerAdmin} from './partner-admin-auth.js';
const headers={'cache-control':'private, no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer'};
const reply=(status,error)=>Response.json({error},{status,headers});
import {boundedJson} from './partner-http.js';
export async function partnerAdminRequest(db,actor,configuration,request,clock=()=>new Date().toISOString()){
 if(!actor)return reply(401,'AUTH_REQUIRED');
 if(!isPartnerAdmin(actor,configuration))return reply(403,'ADMIN_REQUIRED');
 if(request.method==='GET'){
 const documents=await db.prepare('SELECT contract_type,contract_version,language FROM dossivo_partner_contract_documents ORDER BY contract_type,contract_version,language LIMIT 100').all();
 const grants=await db.prepare('SELECT recipient_id,contract_type,contract_version,approved_at,expires_at,revoked_at FROM dossivo_partner_contract_access ORDER BY approved_at DESC LIMIT 100').all();
 const audit=await db.prepare('SELECT operation_id,actor_id,action,contract_type,contract_version,language,recipient_id,created_at FROM dossivo_partner_contract_audit ORDER BY created_at DESC LIMIT 100').all();
 return Response.json({documents:documents.results,grants:grants.results,audit:audit.results},{headers});
 }
 if(request.method!=='POST')return reply(405,'METHOD_NOT_ALLOWED');
 if(request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('sec-fetch-site')==='cross-site')return reply(403,'ORIGIN_REQUIRED');
 if(!request.headers.get('content-type')?.toLowerCase().startsWith('application/json'))return reply(415,'JSON_REQUIRED');
 let body;try{body=await boundedJson(request);}catch{return reply(400,'INVALID_INPUT');}
 if(!body||!['upload','grant','revoke'].includes(body.action)||!PARTNER_TYPES.includes(body.type)||!validPartnerVersion(body.version)||typeof body.operationId!=='string'||!/^[a-zA-Z0-9-]{16,80}$/.test(body.operationId))return reply(400,'INVALID_INPUT');
 const now=clock();let mutation,recipient='',language='',eligibility=null;
 if(body.action==='upload'){
 const d=body.document;language=d?.language;
 if(body.reviewed!==true||!validPartnerDocument(d,body.type,language,body.version)||!d.title.trim()||!d.clauses.length)return reply(400,'INVALID_DOCUMENT');
 // A released language/version is immutable. No overwrite endpoint exists.
 mutation=db.prepare('INSERT INTO dossivo_partner_contract_documents(contract_type,contract_version,language,body_json) VALUES(?,?,?,?)').bind(body.type,body.version,language,JSON.stringify(d));
 }else{
 recipient=body.recipientId;
 if(typeof recipient!=='string'||!recipient.trim()||recipient!==recipient.trim()||recipient.length>200)return reply(400,'INVALID_RECIPIENT');
 if(body.action==='grant'){
 if(body.qualified!==true||!Number.isFinite(Date.parse(body.expiresAt))||Date.parse(body.expiresAt)<=Date.parse(now))return reply(400,'INVALID_APPROVAL');
 eligibility=await db.prepare("SELECT revision FROM dossivo_partner_applications WHERE actor_id=? AND partner_type=? AND status='approved'").bind(recipient,body.type).first();
 if(!eligibility)return reply(409,'APPLICATION_APPROVAL_REQUIRED');
 const exists=await db.prepare('SELECT language FROM dossivo_partner_contract_documents WHERE contract_type=? AND contract_version=? LIMIT 1').bind(body.type,body.version).first();
 if(!exists)return reply(409,'DOCUMENT_REQUIRED');
 mutation=db.prepare(`INSERT INTO dossivo_partner_contract_access(recipient_id,contract_type,contract_version,approved_by,approved_at,expires_at,revoked_at) SELECT ?,?,?,?,?,?,NULL FROM dossivo_partner_applications WHERE actor_id=? AND partner_type=? AND status='approved' AND revision=?
 ON CONFLICT(recipient_id,contract_type,contract_version) DO UPDATE SET approved_by=excluded.approved_by,approved_at=excluded.approved_at,expires_at=excluded.expires_at,revoked_at=NULL`).bind(recipient,body.type,body.version,actor,now,new Date(body.expiresAt).toISOString(),recipient,body.type,eligibility.revision);
 }else{
 mutation=db.prepare('UPDATE dossivo_partner_contract_access SET revoked_at=? WHERE recipient_id=? AND contract_type=? AND contract_version=?').bind(now,recipient,body.type,body.version);
 }
 }
 const auditBase='INSERT INTO dossivo_partner_contract_audit(operation_id,actor_id,action,contract_type,contract_version,language,recipient_id,created_at) ';
 const audit=eligibility?db.prepare(auditBase+"SELECT ?,?,?,?,?,?,?,? FROM dossivo_partner_applications WHERE actor_id=? AND partner_type=? AND status='approved' AND revision=?").bind(body.operationId,actor,body.action,body.type,body.version,language,recipient,now,recipient,body.type,eligibility.revision):db.prepare(auditBase+'VALUES(?,?,?,?,?,?,?,?)').bind(body.operationId,actor,body.action,body.type,body.version,language,recipient,now);
 try{const results=await db.batch([audit,mutation]);if(eligibility&&results[1]?.meta?.changes!==1)return reply(409,'STALE_APPLICATION');}catch{return reply(409,'CONFLICT');}
 return Response.json({ok:true},{headers});
}
