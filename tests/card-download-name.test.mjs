import test from 'node:test';
import assert from 'node:assert/strict';
import {cardDownloadName} from '../lib/card-download-name.js';
test('snapshot filenames distinguish card version locale publication and private JSON',()=>{
 const card={id:'abc-123',body:{task_version:7}};
 assert.equal(cardDownloadName(card,'it'),'DOSSIVO_basic_abc-123_v7_it.html');
 assert.equal(cardDownloadName(card,'zh','json'),'DOSSIVO_private_abc-123_v7.json');
 assert.equal(cardDownloadName({snapshot:{source_card_id:'abc-123',task_version:7},publication_sequence:0},'en'),'DOSSIVO_basic_abc-123_v7_p0_en.html');
 assert.notEqual(cardDownloadName(card,'en'),cardDownloadName({...card,body:{task_version:8}},'en'));
});
test('hostile and legacy metadata cannot inject headers paths or filenames',()=>{
 for(const id of ['../../secret','name\r\nX-Injected: yes','"bad"','公司','a'.repeat(81)]){
  const name=cardDownloadName({id,body:{task_version:-1}},'../evil');assert.equal(name,'DOSSIVO_basic_legacy_vunknown_en.html');assert.doesNotMatch(name,/[\r\n/\\"]/);
 }
 assert.equal(cardDownloadName({}), 'DOSSIVO_basic_legacy_vunknown_en.html');
});
test('download filenames do not include customer metadata or authorization tokens',()=>{
 const view={id:'grant-secret',code:'access-secret',snapshot:{source_card_id:'card-1',task_version:2,scope:{organization:'Private Company',email:'private@example.com'}}};
 const before=structuredClone(view),name=cardDownloadName(view,'zh');assert.equal(name,'DOSSIVO_basic_card-1_v2_zh.html');assert.doesNotMatch(name,/grant-secret|access-secret|Private|@/);assert.deepEqual(view,before);delete view.snapshot.source_card_id;assert.equal(cardDownloadName(view,'zh'),'DOSSIVO_basic_legacy_v2_zh.html');
});
