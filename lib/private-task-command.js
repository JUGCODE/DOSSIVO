export function createTaskCommand(uuid=()=>crypto.randomUUID()){
 let pending=null,uncertain=false;
 return {
  prepare(body){
   if(uncertain)throw Error('TASK_SAVE_UNCERTAIN');
   // Snapshot form values: later edits must not alter a retry's payload.
   pending={body:JSON.parse(JSON.stringify(body)),key:uuid()};return pending;
  },
  retry(){if(!uncertain||!pending)throw Error('NO_PENDING_TASK_SAVE');return pending;},
  failed(error){
   const status=error?.status;
   uncertain=!(Number.isInteger(status)&&status>=400&&status<500&&status!==408&&status!==429);
   if(!uncertain)pending=null;
   return uncertain;
  },
  clear(){pending=null;uncertain=false;},
  isUncertain(){return uncertain;}
 };
}
