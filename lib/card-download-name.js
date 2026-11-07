// Use stored snapshot identity, never company names, grant IDs or access codes.
export function cardDownloadName(view,language='en',format='html'){
 const p=view.snapshot??view.body??view,id=view.snapshot?p.source_card_id:view.body?view.id:p.source_card_id;
 const safeId=typeof id==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(id)?id:'legacy';
 const version=Number.isSafeInteger(p.task_version)&&p.task_version>0?String(p.task_version):'unknown';
 const publication=Number.isSafeInteger(view.publication_sequence)&&view.publication_sequence>=0?`_p${view.publication_sequence}`:'';
 if(format==='json')return `DOSSIVO_private_${safeId}_v${version}.json`;
 const locale=['zh','en','it'].includes(language)?language:'en';
 return `DOSSIVO_basic_${safeId}_v${version}${publication}_${locale}.html`;
}
