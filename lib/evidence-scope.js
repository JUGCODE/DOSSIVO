// Exact task scope only. Missing scope is never a wildcard.
export function validEvidenceScope(scope){
 return !!scope&&typeof scope.facility==='string'&&!!scope.facility.trim()&&typeof scope.period==='string'&&/^\d{4}-(0[1-9]|1[0-2])$/.test(scope.period);
}
export function matchesEvidenceScope(scope,value){
 return validEvidenceScope(scope)&&value?.facility===scope.facility&&value?.period===scope.period;
}
