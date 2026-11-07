export const REVIEW_FILTERS=['all','pending','unchanged','corrected','ever_changed','history_missing','source_unlinked','scope_mismatch'];
export function filterFieldReviews(report,filter='all'){
 if(!REVIEW_FILTERS.includes(filter))throw Error('INVALID_REVIEW_FILTER');
 return report.fields.filter(f=>filter==='all'||(filter==='ever_changed'?f.ever_changed:filter==='source_unlinked'?!f.source_linked:filter==='scope_mismatch'?!f.scope_matches:f.review_state===filter));
}
