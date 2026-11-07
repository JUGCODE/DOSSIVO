import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {resolveLanguage,localizedHref,uiText} from '../lib/ui-locale.ts';
import {cardHtml} from '../lib/basic-evidence-card.js';
const require=createRequire(import.meta.url),root=path.resolve(import.meta.dirname,'..');
let route='/en/',query='';const cache=new Map();
function load(file){
 file=path.resolve(root,file);if(cache.has(file))return cache.get(file).exports;
 const module={exports:{}};cache.set(file,module);
 const source=readFileSync(file,'utf8');
 const output=ts.transpileModule(source,{fileName:file,compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,esModuleInterop:true}}).outputText;
 const localRequire=name=>{
  if(name==='next/navigation')return {usePathname:()=>route,useSearchParams:()=>new URLSearchParams(query),useRouter:()=>({push(){}})};
  if(name==='@/app/chatgpt-auth')return {getChatGPTUser:async()=>null,chatGPTSignInPath:p=>'/signin-with-chatgpt?return_to='+encodeURIComponent(p)};
  if(name==='cloudflare:workers')return {env:{}};
  if(name.endsWith('ui-locale'))return {resolveLanguage,localizedHref,uiText};
  if(name.startsWith('@/')||name.startsWith('.')){
   const base=name.startsWith('@/')?path.join(root,name.slice(2)):path.resolve(path.dirname(file),name);
   const resolved=['','.tsx','.ts','.js','.json','/index.tsx'].map(e=>base+e).find(p=>existsSync(p));
   if(resolved){if(/\.(tsx|ts)$/.test(resolved))return load(resolved);return require(resolved);}
  }
  return require(name);
 };
 new Function('require','module','exports',output)(localRequire,module,module.exports);return module.exports;
}
const {UILanguageProvider,UIText,StructuredMessage}=load('app/ui-language.tsx');
const render=(element,lang='en',pathname='/conversations')=>{route=pathname;query='lang='+lang;return renderToStaticMarkup(React.createElement(UILanguageProvider,null,element));};
test('language URL is authoritative; deep links, login return paths and fragments preserve it',()=>{
 assert.equal(resolveLanguage('/en/','lang=zh'),'en');assert.equal(resolveLanguage('/conversations','lang=en'),'en');
 for(const p of ['/conversations','/eu-buyer','/protocol','/privacy','/account','/partners','/connect/DS-abc'])assert.equal(new URL(localizedHref(p,'en'),'https://test').searchParams.get('lang'),'en');
 assert.equal(localizedHref('/#workspace','en'),'/en/#workspace');
 const signin=new URL(localizedHref('/signin-with-chatgpt?return_to=%2Fconversations','en'),'https://test');assert.equal(signin.searchParams.get('return_to'),'/conversations?lang=en');
 assert.equal(localizedHref('/account?lang=zh','en'),'/account?lang=zh');assert.equal(localizedHref('https://outside.test/','zh'),'https://outside.test/');
});
test('shared public pages actually render in English without Chinese UI text',async()=>{
 for(const file of ['app/conversations/page.tsx','app/eu-buyer/page.tsx','app/protocol/page.tsx','app/privacy/page.tsx','app/partners/page.tsx','app/account/page.tsx','app/briefings/page.tsx']){
  const Page=load(file).default,element=await Page({searchParams:Promise.resolve({lang:'en'})});
  const html=render(element).replace(/中文/g,'');assert.doesNotMatch(html,/[\u3400-\u9fff]/,file);
  if(file.includes('partners'))assert.doesNotMatch(html,/SYNTHETIC_CONFIDENTIAL|Markdown|下载可打印合同/);
 }
});
test('shared Chinese pages use Chinese labels and never show parallel English headings',async()=>{
 for(const file of ['app/conversations/page.tsx','app/eu-buyer/page.tsx','app/protocol/page.tsx','app/privacy/page.tsx']){
  const element=await load(file).default({searchParams:Promise.resolve({lang:'zh'})}),html=render(element,'zh');
  assert.doesNotMatch(html,/Direct messaging|EU BUYER|Register or sign in|Privacy notice|Access code/);
  assert.match(html,/[\u3400-\u9fff]/);
 }
});
test('structured system messages are localised; free text remains byte-for-byte content',()=>{
 const system=render(React.createElement(StructuredMessage,{message:{body:'中文系统消息',structured:{type:'REQUEST',topic:'electricity',period:'2026-11'}}}));assert.doesNotMatch(system,/[\u3400-\u9fff]/);assert.match(system,/Electricity evidence/);
 assert.equal(render(React.createElement(StructuredMessage,{message:{body:'买方自己的中文消息'}})),'买方自己的中文消息');
 assert.equal(render(React.createElement(UIText,null,'直接通信')),'Direct messaging');
});
test('download cards localise labels without translating or executing evidence data',()=>{
 const card={scope:{organization:'<script>公司</script>',facility:'Factory',period:'2026-11'},coverage:{percent:0,submitted:0,total_catalog:11,company_confirmed:0,checked:0},parameters:[],materials:[],issues:{unresolved_count:0,red_count:0},assessment:{insufficient:0},created_at:'2026-11-06',synthetic_only:true};
 const en=cardHtml(card,'en'),zh=cardHtml(card,'zh');assert.doesNotMatch(en.replaceAll('公司',''),/[\u3400-\u9fff]/);assert.match(en,/&lt;script&gt;公司/);assert.doesNotMatch(en,/<script>/);assert.match(zh,/基本证据卡/);assert.doesNotMatch(zh,/Material coverage|Basic evidence card/);
});

test('work panels render English labels with representative empty task state',()=>{
 const state={task_id:'test',version:1,outcome:{organization:'Company',facility:'Factory',period:'2026-11'},materials:[],fields:[],cards:[],flags:[],events:[],assessments:[]};
 const cases=[
 ['app/evidence-materials.tsx','EvidenceMaterials',{state,send:async()=>{},busy:false,language:'en'}],
 ['app/basic-share-panel.tsx','BasicSharePanel',{state}],
 ['app/conversation-panel.tsx','ConversationPanel',{grantId:'grant',expanded:true}],
 ['app/contact-panel.tsx','ContactPanel',{}],
 ['app/eu-buyer/portal.tsx','BuyerPortal',{}],
 ['app/private-task-panel.tsx','PrivateTaskPanel',{language:'en'}],
 ['app/workbench-request-queue.tsx','WorkbenchRequestQueue',{}],
 ];
 for(const [file,name,props] of cases){const Component=load(file)[name];assert.ok(Component,file);const html=render(React.createElement(Component,props)).replace(/中文/g,'');assert.doesNotMatch(html,/[\u3400-\u9fff]/,file);}
});

test('English homepage renders English content and locale-preserving sidebar links',()=>{
 const Workbench=load('app/workbench.tsx').Workbench;
 const html=render(React.createElement(Workbench,{userName:'Test user',initialLanguage:'en'}),'en','/en/');
 assert.doesNotMatch(html.replace(/中文/g,''),/[\u3400-\u9fff]/);
 assert.match(html,/href="\/conversations\?lang=en"/);assert.match(html,/href="\/protocol\?lang=en"/);
});

test('shared page browser titles use the requested language',async()=>{for(const file of ['app/partners/page.tsx','app/protocol/page.tsx','app/conversations/page.tsx','app/eu-buyer/page.tsx','app/account/page.tsx','app/briefings/page.tsx']){const page=load(file);const en=await page.generateMetadata({searchParams:Promise.resolve({lang:'en'})});const zh=await page.generateMetadata({searchParams:Promise.resolve({lang:'zh'})});assert.doesNotMatch(en.title,/[\u3400-\u9fff]/);assert.match(zh.title,/[\u3400-\u9fff]/);}});

test('contract admin denial and console render localized labels without exposing configured identities',async()=>{
 const Page=load('app/partners/admin/page.tsx').default,Panel=load('app/partners/admin/panel.tsx').default;
 const html=render(await Page({searchParams:Promise.resolve({lang:'en'})}));assert.doesNotMatch(html,/[\u3400-\u9fff]/);assert.match(html,/restricted/);
 const en=render(React.createElement(Panel,{zh:false}));assert.doesNotMatch(en,/[\u3400-\u9fff]/);assert.match(en,/Approve access/);
 const zh=render(React.createElement(Panel,{zh:true}),'zh');assert.match(zh,/批准访问/);assert.doesNotMatch(zh,/Approve access|Upload reviewed|Recipient account/);
});
test('partnership application and review queue keep Chinese and English UI separate',()=>{
 const Applicant=load('app/partners/application-panel.tsx').default,Queue=load('app/partners/admin/application-queue.tsx').default;
 for(const lang of ['en','zh']){
  const html=render(React.createElement(React.Fragment,null,React.createElement(Applicant,{type:'promotion',language:lang}),React.createElement(Queue,{zh:lang==='zh',onSelect(){}})),lang);
  if(lang==='en'){assert.doesNotMatch(html,/[\u3400-\u9fff]/);assert.match(html,/Partnership application/);}else{assert.match(html,/合作申请/);assert.doesNotMatch(html,/Partnership application|Pending review|More information needed/);}
 }
});
test('partner language switching and sign-in return preserve an explicitly requested contract version',async()=>{
 const version='partners-draft/0.2-2026-11-07';const Page=load('app/partners/page.tsx').default;
 const html=render(await Page({searchParams:Promise.resolve({lang:'en',type:'promotion',version})}),'en','/partners');
 assert.match(html,/version=partners-draft%2F0\.2-2026-11-07/);
 assert.match(html,/return_to=[^"]*version%3Dpartners-draft%252F0\.2-2026-11-07/);
 assert.doesNotMatch(html,/SYNTHETIC_ONLY|Authorized contract versions/);
});
test('application history translates system events and escapes administrator identifiers',()=>{
 const {HistoryEntries}=load('app/partners/application-history.tsx');
 const events=[{revision:2,action:'review',status:'needs_changes',reason:'scope',createdAt:'2026-11-07T10:00:00Z',role:'reviewer',actorId:'<script>test</script>'}];
 const en=render(React.createElement(HistoryEntries,{events,language:'en'}));assert.doesNotMatch(en,/[\u3400-\u9fff]|<script>/);assert.match(en,/More information needed|Eligibility review/);assert.match(en,/&lt;script&gt;/);
 const zh=render(React.createElement(HistoryEntries,{events:[{...events[0],actorId:undefined}],language:'zh'}),'zh');assert.match(zh,/资格审核|待补充资料/);assert.doesNotMatch(zh,/Eligibility|Reviewer|scope/);
});
test('material lineage renders localized caveats and preserves escaped source text',()=>{
 const Panel=load('app/material-lineage-panel.tsx').default;
 const state={materials:[{id:'a',root_id:'a',mode:'SYNTHETIC_TEXT',text:'synthetic',title:'Original source',lineage:{relation:'original'}},{id:'b',root_id:'a',mode:'SYNTHETIC_TEXT',text:'summary',title:'Summary',lineage:{relation:'summary',parent_material_id:'a',basis:'<script>not executable</script>'}}]};
 const en=render(React.createElement(Panel,{state,language:'en'}));assert.doesNotMatch(en,/[\u3400-\u9fff]|<script>/);assert.match(en,/not independent corroboration/);assert.match(en,/&lt;script&gt;/);
 const zh=render(React.createElement(Panel,{state:{materials:[]},language:'zh'}),'zh');assert.match(zh,/来源组不等于独立佐证/);assert.doesNotMatch(zh,/Material sources|Source groups/);
});
