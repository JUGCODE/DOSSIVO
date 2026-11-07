// Shared with the write guard: readiness is not a compliance/verification verdict.
export function assessmentReadiness(state){
 const assessment=state.assessments.at(-1),event=state.events.at(-1),card=state.cards.at(-1);
 const can_freeze=!!assessment&&assessment.input_version===state.version-1&&event?.action==='assess';
 const frozen=!!assessment&&event?.action==='freeze_card'&&card?.body.task_version===state.version-1&&card.body.assessment?.id===assessment.id;
 return {status:!assessment?'missing':can_freeze?'ready':frozen?'frozen':'needs_check',can_freeze,input_version:assessment?.input_version??null,task_version:state.version,card_version:card?.body.task_version??null};
}
