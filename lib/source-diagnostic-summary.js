import {inspectSyntheticText,SYNTHETIC_PARSER_VERSION} from './synthetic-field-parser.js';
// A fresh assessment pass; never rewrite stored parser reports or choose winners.
export function sourceDiagnosticSummary(state){
 const materials=[],codes=new Set();let issue_count=0;
 for(const material of state.materials??[]){
  if(material.mode!=='SYNTHETIC_TEXT')continue;
  const {report}=inspectSyntheticText(material.text);
  if(!report.issue_count)continue;
  issue_count+=report.issue_count;
  for(const code of Object.keys(report.issue_counts))codes.add(code);
  materials.push({material_id:material.id,issue_count:report.issue_count,issue_counts:report.issue_counts});
 }
 return {parser_version:SYNTHETIC_PARSER_VERSION,issue_count,affected_codes:[...codes],materials};
}
