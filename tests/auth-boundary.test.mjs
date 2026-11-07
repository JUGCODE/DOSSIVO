import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import ts from 'typescript';
function load(source,replacements){
 const output=ts.transpileModule(readFileSync(new URL(source,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};
 new Function('require','module','exports',output)(name=>{if(!(name in replacements))throw Error('Unexpected dependency '+name);return replacements[name];},module,module.exports);
 return module.exports;
}
function fixture(){
 let headers=new Headers();
 const navigation={redirect:(path)=>{throw Object.assign(Error('redirect'),{destination:path});}};
 const provider=load('../app/chatgpt-auth.ts',{'next/headers':{headers:async()=>headers},'next/navigation':navigation});
 const auth=load('../app/auth.ts',{'./chatgpt-auth':provider,'next/navigation':navigation});
 return {auth,set(values){headers=new Headers(values);}};
}
test('application identity ignores untrusted identity hints and incomplete hosted identity',async()=>{
 const f=fixture();
 for(const values of [{},{cookie:'userId=victim; email=owner@example.test',authorization:'Bearer arbitrary','x-user-id':'victim'},{'oai-authenticated-user-id':'actor'},{'oai-authenticated-user-email':'owner@example.test'}]){f.set(values);assert.equal(await f.auth.getCurrentUser(),null);}
});
test('same email never merges distinct hosted actor IDs; contact changes never change actor ID',async()=>{
 const f=fixture();
 for(const [id,email] of [['actor-A','same@example.test'],['actor-B','same@example.test'],['actor-A','changed@example.test']]){f.set({'oai-authenticated-user-id':id,'oai-authenticated-user-email':email});assert.equal((await f.auth.getCurrentUser()).userId,id);}
});
test('hosted name handling and identity survive application boundary without new claims',async()=>{
 const f=fixture();f.set({'oai-authenticated-user-id':'legacy-actor','oai-authenticated-user-email':'contact@example.test','oai-authenticated-user-full-name':encodeURIComponent('企业甲'),'oai-authenticated-user-full-name-encoding':'percent-encoded-utf-8'});
 const user=await f.auth.requireCurrentUser('/partners');assert.deepEqual(user,{userId:'legacy-actor',email:'contact@example.test',displayName:'企业甲',fullName:'企业甲'});assert.equal('email_verified' in user,false);
});
test('anonymous protected pages use hosted sign-in with safe return and sign-out',async()=>{
 const f=fixture();await assert.rejects(()=>f.auth.requireCurrentUser('/partners?lang=en'),e=>e.destination==='/signin-with-chatgpt?return_to=%2Fpartners%3Flang%3Den');
 assert.equal(f.auth.signInPath('https://evil.example'),'/signin-with-chatgpt?return_to=%2F');assert.equal(f.auth.signOutPath('//evil.example'),'/signout-with-chatgpt?return_to=%2F');
});
test('business pages and APIs cannot bypass the application identity boundary',()=>{
 function walk(dir){return readdirSync(dir,{withFileTypes:true}).flatMap(x=>x.isDirectory()?walk(new URL(x.name+'/',dir)):[new URL(x.name,dir)]);}
 for(const file of walk(new URL('../app/',import.meta.url))){if(!/\.(ts|tsx)$/.test(file.pathname)||/\/(auth|chatgpt-auth)\.ts$/.test(file.pathname))continue;
 const source=readFileSync(file,'utf8');assert.doesNotMatch(source,/from\s+['"][^'"]*chatgpt-auth['"]|oai-authenticated-user-(?:id|email)/,file.pathname);}
});

test('malformed encoded display name falls back without crashing identity lookup',async()=>{
 const f=fixture();f.set({'oai-authenticated-user-id':'actor','oai-authenticated-user-email':'contact@example.test','oai-authenticated-user-full-name':'%zz','oai-authenticated-user-full-name-encoding':'percent-encoded-utf-8'});
 const user=await f.auth.getCurrentUser();assert.equal(user.fullName,null);assert.equal(user.displayName,'contact@example.test');
});
