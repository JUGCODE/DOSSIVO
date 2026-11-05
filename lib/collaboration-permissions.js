import {BridgeError} from './paci-bridge-core.js';
// Pure policy boundary; callers must load membership from trusted storage, never request JSON.
export function requireConversationMember(actor,conversation,memberships){
 const member=memberships.find(m=>m.actor_id===actor&&m.conversation_id===conversation.id&&m.status==='ACTIVE');
 if(!actor||!member||!conversation.party_ids.includes(member.party_id))throw new BridgeError('CONVERSATION_UNAVAILABLE','Conversation unavailable',404);
 return member;
}
export function requireConversationWrite(actor,conversation,memberships){
 const member=requireConversationMember(actor,conversation,memberships);
 if(conversation.status!=='ACTIVE'||!['OWNER','CONTRIBUTOR'].includes(member.role))throw new BridgeError('CONVERSATION_READ_ONLY','Sending is not permitted',403);
 return member;
}
export function contactRecommendationView(actor,recommendation){
 if(!actor||recommendation.recipient_actor_id!==actor)throw new BridgeError('RECOMMENDATION_UNAVAILABLE','Recommendation unavailable',404);
 return {id:recommendation.id,recommender_label:recommendation.recommender_label,contact_label:recommendation.contact_label,status:recommendation.status,identity_verified:false,conversation_access:false,evidence_access:false};
}
