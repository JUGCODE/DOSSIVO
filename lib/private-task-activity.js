// Separate list/detail/download lanes, invalidated together on session loss.
export function createTaskActivity(onSessionLost=()=>{}){
 let active=true,epoch=0;const lanes=new Map();
 return {
  activate(){active=true;epoch++;lanes.clear();},
  dispose(){active=false;epoch++;lanes.clear();},
  begin(lane){const generation=(lanes.get(lane)??0)+1,session=epoch;lanes.set(lane,generation);return ()=>active&&epoch===session&&lanes.get(lane)===generation;},
  async request(fetcher,url,options={}){
   const session=epoch,response=await fetcher(url,{...options,cache:'no-store'});
   if(response.status===401){if(active&&session===epoch){epoch++;lanes.clear();onSessionLost();}throw Error('AUTH_REQUIRED');}
   const data=await response.json();if(!response.ok)throw Object.assign(Error(data.code??data.error??'REQUEST_FAILED'),{status:response.status});return data;
  }
 };
}
