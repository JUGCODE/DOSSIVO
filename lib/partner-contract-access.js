import {PARTNER_DRAFT_VERSION,validPartnerDocument,validPartnerVersion} from './partner-contracts.js';
import {PARTNER_TYPES} from './partner-catalog.js';
export async function approvedPartnerContract(db,actor,type,clock=()=>new Date().toISOString(),version=PARTNER_DRAFT_VERSION){
 if(!actor||!PARTNER_TYPES.includes(type)||!validPartnerVersion(version))return null;
 // No self-service approval. Provisioning requires an explicitly configured administrator.
 const now=clock();
 const approval=await db.prepare(`SELECT recipient_id,contract_type,contract_version,approved_by,approved_at,expires_at,revoked_at
 FROM dossivo_partner_contract_access WHERE recipient_id=? AND contract_type=? AND contract_version=?
 AND revoked_at IS NULL AND expires_at>? AND EXISTS (SELECT 1 FROM dossivo_partner_applications a WHERE a.actor_id=recipient_id AND a.partner_type=contract_type AND a.status='approved')`).bind(actor,type,version,now).first();
 if(!approval||typeof approval.approved_by!=="string"||!approval.approved_by.trim()||!Number.isFinite(Date.parse(approval.approved_at))||Date.parse(approval.approved_at)>Date.parse(now)||!Number.isFinite(Date.parse(approval.expires_at))||Date.parse(approval.expires_at)<=Date.parse(now))return null;
 return approval;
}

export async function approvedPartnerDocument(db,actor,type,language='zh',clock=()=>new Date().toISOString(),version=PARTNER_DRAFT_VERSION){
 const approval=await approvedPartnerContract(db,actor,type,clock,version);
 if(!approval)return null;
 const row=await db.prepare('SELECT body_json FROM dossivo_partner_contract_documents WHERE contract_type=? AND contract_version=? AND language=?').bind(type,approval.contract_version,language).first();
 let document=null;
 try{const parsed=row&&JSON.parse(row.body_json);if(validPartnerDocument(parsed,type,language,version))document=parsed;}catch{/* Invalid stored data must not be released. */}
 return {approval,document};
}

// List only the caller's still-authorized versions with a document in the selected language.
export async function approvedPartnerVersions(db,actor,type,language='zh',clock=()=>new Date().toISOString()){
 if(!actor||!PARTNER_TYPES.includes(type)||!['zh','en','it'].includes(language))return [];
 const now=clock();
 const rows=await db.prepare(`SELECT g.contract_version,g.expires_at,g.approved_at,g.approved_by FROM dossivo_partner_contract_access g
 WHERE g.recipient_id=? AND g.contract_type=? AND g.revoked_at IS NULL AND g.expires_at>?
 AND EXISTS (SELECT 1 FROM dossivo_partner_applications a WHERE a.actor_id=g.recipient_id AND a.partner_type=g.contract_type AND a.status='approved')
 AND EXISTS (SELECT 1 FROM dossivo_partner_contract_documents d WHERE d.contract_type=g.contract_type AND d.contract_version=g.contract_version AND d.language=?)
 ORDER BY g.contract_version LIMIT 100`).bind(actor,type,now,language).all();
 return rows.results.filter(r=>validPartnerVersion(r.contract_version)&&typeof r.approved_by==='string'&&r.approved_by.trim()&&Number.isFinite(Date.parse(r.approved_at))&&Date.parse(r.approved_at)<=Date.parse(now)&&Number.isFinite(Date.parse(r.expires_at))&&Date.parse(r.expires_at)>Date.parse(now)).map(r=>({version:r.contract_version,expiresAt:r.expires_at}));
}
