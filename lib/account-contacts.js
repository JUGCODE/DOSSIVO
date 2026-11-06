import {BridgeError} from './paci-bridge-core.js';
import {CONTACT_CONSENT_VERSION} from './account-contact-policy.js';
export {CONTACT_CONSENT_VERSION} from './account-contact-policy.js';
export function normalizeContacts(data){
 if(!data||Object.keys(data).some(k=>!['email','phone','expected_version','consent_version'].includes(k))||!Number.isSafeInteger(data.expected_version)||data.expected_version<0||typeof data.email!=='string'||typeof data.phone!=='string')throw new BridgeError('INVALID_INPUT','Invalid contact fields');
 const email=data.email.trim(),phone=data.phone.trim().replace(/[ ()-]/g,'');
 // Deliberately format validation only: not mailbox ownership, delivery or mobile capability.
 if(email&&(email.length>254||!(/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/).test(email)||email.split('@')[0].length>64||email.split('@')[0].startsWith('.')||email.split('@')[0].endsWith('.')||email.split('@')[0].includes('..')))throw new BridgeError('INVALID_EMAIL','Check email format');
 if(phone&&!/^\+[1-9]\d{6,14}$/.test(phone))throw new BridgeError('INVALID_PHONE','Use +country code and 7–15 digits');
 return {email:email?email.slice(0,email.lastIndexOf('@')+1)+email.slice(email.lastIndexOf('@')+1).toLowerCase():'',phone,expected_version:data.expected_version,consent_version:data.consent_version??null};
}
export class AccountContacts {
 constructor(db){this.db=db;}
 actor(actor){if(typeof actor!=='string'||!actor||actor.length>200)throw new BridgeError('AUTH_REQUIRED','Sign in first',401);}
 async read(actor){this.actor(actor);const row=await this.db.prepare('SELECT email,phone,version,updated_at,consent_version,confirmed_at FROM dossivo_account_contacts WHERE actor_id=?').bind(actor).first();return {...(row??{email:'',phone:'',version:0,updated_at:null,consent_version:null,confirmed_at:null}),email_verified:false,phone_verified:false,verification_status:'NOT_CONNECTED',contact_only:true};}
 async save(actor,input){this.actor(actor);const d=normalizeContacts(input),now=new Date().toISOString();
  const populated=!!(d.email||d.phone);if(populated&&d.consent_version!==CONTACT_CONSENT_VERSION)throw new BridgeError('CONSENT_REQUIRED','Confirm contact storage before saving');
  const consent=populated?CONTACT_CONSENT_VERSION:null,confirmed=populated?now:null;
  const row=d.expected_version===0
   ?await this.db.prepare('INSERT INTO dossivo_account_contacts(actor_id,email,phone,version,updated_at,consent_version,confirmed_at) VALUES(?,?,?,1,?,?,?) ON CONFLICT(actor_id) DO NOTHING RETURNING version').bind(actor,d.email,d.phone,now,consent,confirmed).first()
   :await this.db.prepare('UPDATE dossivo_account_contacts SET email=?,phone=?,version=version+1,updated_at=?,consent_version=?,confirmed_at=? WHERE actor_id=? AND version=? RETURNING version').bind(d.email,d.phone,now,consent,confirmed,actor,d.expected_version).first();
  if(!row){const current=await this.read(actor);if(current.version===d.expected_version+1&&current.email===d.email&&current.phone===d.phone&&current.consent_version===consent)return current;throw new BridgeError('VERSION_CONFLICT','Reload before saving',409);}
  return this.read(actor);
 }
}
