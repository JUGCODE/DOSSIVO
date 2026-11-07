// Safe projection for this actor only. Never expose configured IDs or bindings.
export function privateFileAccess(actor,bucketAvailable,allowedIds){
 if(typeof actor!=='string'||!actor)return {status:'SIGN_IN_REQUIRED',can_test:false,real_customer_intake:false};
 let allowed;try{allowed=JSON.parse(allowedIds??'[]');}catch{}
 const canTest=!!bucketAvailable&&Array.isArray(allowed)&&allowed.every(id=>typeof id==='string'&&id.length>0)&&allowed.includes(actor);
 return {status:canTest?'TEST_ENABLED':'TEST_CLOSED',can_test:canTest,real_customer_intake:false};
}
