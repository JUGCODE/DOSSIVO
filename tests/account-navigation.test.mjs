import test from 'node:test';
import assert from 'node:assert/strict';
import {safeReturnPath,accountNavigation} from '../lib/account-navigation.js';
test('account return refuses external, encoded and authentication-loop targets',()=>{
 for(const value of [undefined,null,[], 'https://evil.example','//evil.example','/\\evil.example','/\nevil','/%2f%2fevil','/%5cevil','/%252f%252fevil','/%zz','/callback?code=x','/account?return_to=/account','/api/private-tasks','/x/../callback','/%63allback','/SIGNOUT-WITH-CHATGPT','/'+ 'x'.repeat(2048)]) assert.equal(safeReturnPath(value), '/',String(value));
});
test('account return retains internal route, query and fragment through sign-in nesting',()=>{
 const target='/conversations?contact=example&lang=en#messages';
 const n=accountNavigation('en',target);
 assert.equal(n.destination,target);
 const account=new URL(new URL(n.signInPath,'https://app.local').searchParams.get('return_to'),'https://app.local');
 assert.equal(account.pathname,'/account');assert.equal(account.searchParams.get('return_to'),target);assert.equal(account.searchParams.get('lang'),'en');
});
test('language switch retains destination and invalid returns use local workspace',()=>{
 const target='/partners?version=3';
 for(const lang of ['zh','en','it']){assert.equal(accountNavigation(lang,target).destination,target);assert.equal(accountNavigation(lang,'//evil').destination,`/${lang}/#private-tasks`);}
 assert.equal(accountNavigation('unknown').destination,'/zh/#private-tasks');
});
