import {readFileSync,statSync} from 'node:fs';
import {validateIdentityMigrationPlan} from '../lib/identity-migration-plan.js';
// Offline input only. Never exports identities, emails, tokens or binding rows.
try{
 if(process.argv.length!==3)throw Object.assign(Error(),{code:'PLAN_FILE_REQUIRED'});
 if(statSync(process.argv[2]).size>5*1024*1024)throw Object.assign(Error(),{code:'PLAN_FILE_TOO_LARGE'});
 const result=validateIdentityMigrationPlan(JSON.parse(readFileSync(process.argv[2],'utf8')));
 console.log(JSON.stringify({result:'PASS',actor_count:result.actor_count,identity_count:result.identity_count,ownership_rewrites:0,activation_allowed:false,note:'Offline structural preflight only; no identity verified or account linked.'}));
}catch(error){console.error(JSON.stringify({result:'FAIL',code:error.code??'INVALID_PLAN_FILE',activation_allowed:false}));process.exitCode=1;}
