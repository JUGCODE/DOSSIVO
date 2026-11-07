// A public-metadata receipt, never a card export or a capability to access evidence.
export function verificationReceipt(value,retrievedAt){
 if(!value||typeof value!=='object'||typeof retrievedAt!=='string'||!Number.isFinite(Date.parse(retrievedAt)))return null;
 const {code,content_fingerprint,official_domain,verify_url,issued_at,expires_at}=value;
 if(typeof code!=='string'||!/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}(?:-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{4}){2}$/.test(code)||typeof content_fingerprint!=='string'||!/^[a-f0-9]{4}(?:-[a-f0-9]{4}){3}$/.test(content_fingerprint)||typeof official_domain!=='string'||official_domain.length>253||!/^([a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(official_domain)||verify_url!=='https://'+official_domain+'/verify?code='+code||typeof issued_at!=='string'||!Number.isFinite(Date.parse(issued_at))||typeof expires_at!=='string'||!Number.isFinite(Date.parse(expires_at))||Date.parse(expires_at)<=Date.parse(issued_at))return null;
 return {schema:'dossivo.verification-receipt.v1',code,content_fingerprint,official_domain,verify_url,issued_at,expires_at,retrieved_at:retrievedAt,current_status:'CHECK_OFFICIAL_PAGE',evidence_access_granted:false,certification:false};
}
