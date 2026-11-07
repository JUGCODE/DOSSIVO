import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeTaskCursor,decodeTaskCursor,mergeTaskPage} from '../lib/task-list-page.js';
test('task cursor validates bounded structure and round-trips stable ordering tuple',()=>{
 const tuple={updated_at:'2026-11-07T00:00:00.000Z',id:'task-A_1'};assert.deepEqual(decodeTaskCursor(encodeTaskCursor(tuple)),tuple);assert.equal(decodeTaskCursor(''),null);
 for(const value of [null,'x'.repeat(513),'not!base64',btoa('{}'),btoa('["bad-date","id"]'),btoa('["2026-11-07","../other"]')])assert.throws(()=>decodeTaskCursor(value),{code:'INVALID_CURSOR'});
});
test('appended task pages do not duplicate existing tasks or mutate earlier rows',()=>{
 const original=[{id:'a',version:2}],next=[{id:'a',version:1},{id:'b',version:1},{id:'b',version:1}];
 assert.deepEqual(mergeTaskPage(original,next),[{id:'a',version:2},{id:'b',version:1}]);assert.deepEqual(original,[{id:'a',version:2}]);
});
