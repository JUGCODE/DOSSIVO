import test from 'node:test';
import assert from 'node:assert/strict';
import {privateFileAccess} from '../lib/private-file-access.js';
test('file access projection fails closed for missing identity, storage or malformed configuration',()=>{
 assert.equal(privateFileAccess(null,true,'["a"]').status,'SIGN_IN_REQUIRED');
 for(const value of [undefined,null,'','{}','null','["a",3]','[""]','["other"]'])assert.equal(privateFileAccess('a',true,value).can_test,false);
 assert.equal(privateFileAccess('a',false,'["a"]').can_test,false);
});
test('file access projection exposes only the current actor eligibility and never a real-data permission',()=>{
 assert.deepEqual(privateFileAccess('a',true,'["a","secret-other"]'),{status:'TEST_ENABLED',can_test:true,real_customer_intake:false});
 assert.deepEqual(privateFileAccess('b',true,'["a"]'),{status:'TEST_CLOSED',can_test:false,real_customer_intake:false});
});
