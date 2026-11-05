import {PrivateTaskStore} from './private-task-store.js';
import {BridgeError} from './paci-bridge-core.js';
import {COMMUNICATION_REGION_ENFORCEMENT} from './communication-config.js';
export const COMMUNICATION_DECLARATION_VERSION='intl-beta/0.1';
// actorSql is an internal SQL expression only; account values are always bound.
export function communicationAvailableSql(actorSql,regionEnforcement=COMMUNICATION_REGION_ENFORCEMENT){if(!regionEnforcement)return `(${actorSql} IS NOT NULL)`;return `EXISTS(SELECT 1 FROM dossivo_communication_regions communication_region WHERE communication_region.actor_id=${actorSql} AND communication_region.service_region='INTERNATIONAL' AND communication_region.declaration_version='${COMMUNICATION_DECLARATION_VERSION}')`;}
export class CommunicationPolicyStore extends PrivateTaskStore {
 constructor(db,options={}){super(db,options);this.regionEnforcement=options.regionEnforcement??COMMUNICATION_REGION_ENFORCEMENT;}
 async status(actor){
  this.actor(actor);const r=await this.q('SELECT service_region,declaration_version,confirmed_at FROM dossivo_communication_regions WHERE actor_id=?',actor).first();
  const current=r?.declaration_version===COMMUNICATION_DECLARATION_VERSION&&['CN_MAINLAND','INTERNATIONAL'].includes(r.service_region);
  return {service_region:current?r.service_region:'UNKNOWN',available:!this.regionEnforcement||!!current&&r.service_region==='INTERNATIONAL',region_enforcement:this.regionEnforcement,mode:this.regionEnforcement?'REGION_ENFORCED':'DEVELOPMENT_OPEN',declaration_version:COMMUNICATION_DECLARATION_VERSION,confirmed_at:current?r.confirmed_at:null,region_verified:false,synthetic_only:true};
 }
 async select(actor,data){
  this.actor(actor);if(!data||!['CN_MAINLAND','INTERNATIONAL'].includes(data.service_region)||data.confirmed!==true)throw new BridgeError('INVALID_INPUT','Choose and confirm your communication service region');
  if(Object.keys(data).some(k=>!['service_region','confirmed'].includes(k)))throw new BridgeError('INVALID_INPUT','Only your own service region may be selected');
  await this.db.batch([this.q('INSERT INTO dossivo_communication_regions(actor_id,service_region,declaration_version,confirmed_at) VALUES(?,?,?,?) ON CONFLICT(actor_id) DO UPDATE SET service_region=excluded.service_region,declaration_version=excluded.declaration_version,confirmed_at=excluded.confirmed_at',actor,data.service_region,COMMUNICATION_DECLARATION_VERSION,this.clock())]);return this.status(actor);
 }
 async require(actor){const s=await this.status(actor);if(!this.regionEnforcement)return s;if(s.service_region==='UNKNOWN')throw new BridgeError('COMMUNICATION_REGION_REQUIRED','Confirm your communication service region first',403);if(!s.available)throw new BridgeError('COMMUNICATION_NOT_AVAILABLE','Messaging is not enabled for mainland China; related formalities remain pending',403);return s;}
 async requirePeer(actor){if(!(await this.status(actor)).available)throw new BridgeError('COMMUNICATION_UNAVAILABLE','This contact is not currently available for messaging',403);}
 guard(...actors){return this.q(`INSERT INTO dossivo_task_guards(id,ok) SELECT ?,CASE WHEN ${actors.map(()=>communicationAvailableSql('?',this.regionEnforcement)).join(' AND ')} THEN 1 ELSE 0 END`,this.uuid(),...actors);}
}
