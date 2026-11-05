// Consumer-side registry only. Filled from the Protocol release, never from browser input.
export const PROTOCOL_REGISTRY = Object.freeze({
  registry_version:'dossivo-protocol-consumer/0.1',
  application_protocol:{title:'DOSSIVO Evidence Presentation Protocol',version:'draft-0.1',href:'/protocol',status:'DRAFT_APPLICATION_MAPPING'},
  paci_protocol:{title:'PACI Protocol',version:null,text_sha256:null,contract_address:null,chain_id:null,deployment_tx:null,status:'AWAITING_AUTHORITATIVE_RELEASE'},
  domain_protocol:{title:'PACI-DOSSIVO-FL',canonical_profile_name:'PACI-FLR',version:null,contract_address:null,chain_id:null,deployment_tx:null,status:'NAME_MAPPING_PENDING_PROTOCOL_WINDOW'},
  integration:{api_version:'paci-http/0.4',paciscan_core_reference:'0.4.2-alpha.1',onchain_execution_verified:false,formal_publication_enabled:false},
});
// Merely supplying an address, wallet, hash, or self-asserted bool can never enable formal cards.
export function formalPublicationStatus(){return {enabled:false,reason:'MISSING_AUTHORITY_RELEASE_AND_VERIFIED_EXECUTION',required:['authoritative text/code/test mapping','authenticated deployment manifest for both layers','contract code and transaction/event verification','signed card and exact-version PACI receipt','finality and current status verification']};}
