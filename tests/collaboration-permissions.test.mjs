import test from 'node:test';
import assert from 'node:assert/strict';
import {requireConversationMember,requireConversationWrite,contactRecommendationView} from '../lib/collaboration-permissions.js';
const c={id:'c1',party_ids:['supplier','buyer-a'],status:'ACTIVE'};
const members=[{conversation_id:'c1',actor_id:'alice',party_id:'buyer-a',status:'ACTIVE',role:'CONTRIBUTOR'},{conversation_id:'c1',actor_id:'bob',party_id:'buyer-b',status:'ACTIVE',role:'OWNER'},{conversation_id:'c1',actor_id:'removed',party_id:'supplier',status:'REMOVED',role:'OWNER'},{conversation_id:'c1',actor_id:'reader',party_id:'supplier',status:'ACTIVE',role:'READER'}];
test('conversation membership excludes other buyers, removed members and company-only membership',()=>{
 assert.equal(requireConversationMember('alice',c,members).party_id,'buyer-a');
 for(const actor of ['bob','removed','company-admin',''])assert.throws(()=>requireConversationMember(actor,c,members),{code:'CONVERSATION_UNAVAILABLE'});
 assert.throws(()=>requireConversationMember('alice',{...c,id:'c2'},members),{code:'CONVERSATION_UNAVAILABLE'});
});
test('conversation write permission is distinct from membership and closed conversations remain read-only',()=>{
 assert.equal(requireConversationWrite('alice',c,members).role,'CONTRIBUTOR');
 assert.throws(()=>requireConversationWrite('reader',c,members),{code:'CONVERSATION_READ_ONLY'});
 assert.throws(()=>requireConversationWrite('alice',{...c,status:'CLOSED'},members),{code:'CONVERSATION_READ_ONLY'});
});
test('contact recommendation identifies recommender without exposing contact details or granting evidence/conversation access',()=>{
 const r={id:'r1',recipient_actor_id:'alice',recommender_label:'介绍人甲',contact_label:'供应商乙',status:'PENDING',email:'private@example.test',phone:'private',grant_id:'secret'};
 const v=contactRecommendationView('alice',r);assert.equal(v.recommender_label,'介绍人甲');assert.equal(v.evidence_access,false);assert.equal(v.conversation_access,false);assert.ok(!JSON.stringify(v).includes('private'));assert.ok(!JSON.stringify(v).includes('secret'));
 assert.throws(()=>contactRecommendationView('bob',r),{code:'RECOMMENDATION_UNAVAILABLE'});
});
