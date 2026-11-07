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
  if(name==='@/app/auth')return {getCurrentUser:async()=>null,signInPath:p=>'/signin-with-chatgpt?return_to='+encodeURIComponent(p)};
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

test('candidate comparison localizes system copy, escapes raw evidence and links each review record',()=>{
 const Panel=load('app/field-candidates-panel.tsx').default;
 const state={materials:[{id:'m',title:'<script>source</script>'}],fields:[{id:'one',material_id:'m',code:'revenue',extracted_value:20,confirmed_value:0,unit:'CNY',scope:{facility:'A',period:'2026-10'},locator:{page:1,line:2,quote:'<img src=x onerror=alert(1)>'}},{id:'two',material_id:'m',code:'revenue',extracted_value:30,confirmed_value:null,unit:'CNY',scope:{facility:'A',period:'2026-10'},locator:{page:1,line:3,quote:'Revenue:30'}}]};
 for(const lang of ['zh','en','it']){const html=render(React.createElement(Panel,{state,language:lang}),lang);assert.doesNotMatch(html,/<script>|<img/);assert.match(html,/&lt;script&gt;/);assert.match(html,/href="#field-review-one"/);assert.match(html,/href="#field-review-two"/);if(lang!=='zh')assert.doesNotMatch(html,/[\u3400-\u9fff]/);else{assert.match(html,/待核对的重复指标/);assert.doesNotMatch(html,/Repeated metrics|Company-confirmed/);}}
 assert.equal(render(React.createElement(Panel,{state:{materials:[],fields:[]},language:'en'})),'');
});

test('preparation overview renders all four groups and localized capability boundaries',()=>{
 const Panel=load('app/preparation-overview.tsx').default,state={outcome:{facility:'<script>A</script>',period:'2026-10'},materials:[],fields:[]};
 for(const language of ['zh','en','it']){const html=render(React.createElement(Panel,{state,language,onPrepare(){},onPlan(){}}),language);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/<progress/);if(language==='zh'){for(const word of ['已提交','待补充','待核对','可进一步补强','用电账单','社保缴纳','不是合规分数'])assert.ok(html.includes(word),word);assert.doesNotMatch(html,/Submitted|To provide|Evidence preparation/);}else assert.doesNotMatch(html,/[\u3400-\u9fff]/);}
});

test('overview links individual pending materials and renders reasons in each language',()=>{
 const Panel=load('app/preparation-overview.tsx').default,scope={facility:'A',period:'2026-10'},state={outcome:scope,materials:[{id:'source-1',title:'<script>sample</script>',scope,mode:'SYNTHETIC_TEXT',text:'synthetic',categories:['electricity']}],fields:[]};
 for(const language of ['zh','en','it']){const html=render(React.createElement(Panel,{state,language,onPrepare(){},onPlan(){}}),language);assert.match(html,/href="#material-review-source-1"/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>|MISSING_FIELDS|MATERIAL_CONFIRMATION/);if(language==='zh')assert.match(html,/材料内容待企业确认/);else assert.doesNotMatch(html,/[\u3400-\u9fff]/);}
});

test('material gap forms and history localize controls and escape private user text',()=>{
 const {default:Form,MaterialGapHistory}=load('app/material-gap-form.tsx');
 for(const language of ['zh','en','it']){const html=render(React.createElement(Form,{category:'electricity',language,send:async()=>{},busy:false}),language);assert.match(html,/disabled/);const history=render(React.createElement(MaterialGapHistory,{language,gaps:[{id:'gap1',title:'<script>x</script>',reason:'<img src=x>',custodian:'Synthetic HR',recorded_at:'2026-11-07'}]}),language);assert.doesNotMatch(history,/<script>|<img/);assert.match(history,/&lt;script&gt;/);assert.match(history,/#material-review-gap1/);if(language!=='zh')assert.doesNotMatch(html+history,/[\u3400-\u9fff]/);else assert.match(html,/不提高材料覆盖进度/);}
});

test('gap receipt controls require reviewed source and localize status and history',()=>{
 const {default:Panel}=load('app/material-gap-resolution.tsx');const scope={facility:'A',period:'2026-10'},state={task_id:'t',version:1,materials:[{id:'g',title:'<script>gap</script>',mode:'DIRECTORY',scope,categories:['electricity'],gap:{status:'NOT_OBTAINED'}},{id:'s',title:'Synthetic bill',mode:'SYNTHETIC_TEXT',text:'test',scope,categories:['electricity'],review:{status:'COMPANY_CONFIRMED'}}]};for(const language of ['zh','en','it']){const html=render(React.createElement(Panel,{state,language,send:async()=>{},busy:false}),language);assert.match(html,/Synthetic bill/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/disabled/);if(language==='zh')assert.match(html,/不表示字段无冲突/);else assert.doesNotMatch(html,/[\u3400-\u9fff]/);}
});

test('gap overview distinguishes pending receipts from coverage and invalid links can be reopened',()=>{
 const Overview=load('app/gap-overview.tsx').default,{GapReceiptRow}=load('app/material-gap-resolution.tsx');const overview={gaps:[{id:'g',title:'<script>gap</script>',receipt_state:'READY_FOR_REVIEW'}],gap_pending_count:1,gap_confirmed_count:0};
 for(const language of ['zh','en','it']){const html=render(React.createElement(Overview,{overview,language}),language);assert.match(html,/#gap-receipt-g/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>|READY_FOR_REVIEW/);if(language!=='zh')assert.doesNotMatch(html,/[\u3400-\u9fff]/);}
 const gap={id:'g',title:'Synthetic gap',mode:'DIRECTORY',scope:{facility:'A',period:'2026-10'},categories:['electricity'],gap:{status:'RECEIPT_CONFIRMED',resolution:{material_id:'missing',material_version:1}}};const html=render(React.createElement(GapReceiptRow,{gap,state:{materials:[gap]},language:'en',send:async()=>{},busy:false}));assert.match(html,/Reopen gap/);assert.match(html,/recorded link needs review/);assert.doesNotMatch(html,/<select/);
});

test('field review blocks blank values and reasons while accepting deliberate zero',()=>{const {FieldReviewForm}=load('app/field-review-form.tsx');const base={fieldId:'f',onChange(){},send:async()=>{},busy:false,language:'en'};for(const draft of [{value:'',reason:'Reviewed'},{value:'0',reason:' '},{value:'Infinity',reason:'Reviewed'}]){const html=render(React.createElement(FieldReviewForm,{...base,draft}));assert.match(html,/<button[^>]*disabled/);}const html=render(React.createElement(FieldReviewForm,{...base,draft:{value:'0',reason:'Checked source'}}));assert.doesNotMatch(html,/<button[^>]*disabled/);assert.match(html,/never saved as zero/);});
test('field confirmation history retains zero and escapes reasons in all interface languages',()=>{const {FieldConfirmationHistory}=load('app/field-review-form.tsx');for(const language of ['zh','en','it']){const html=render(React.createElement(FieldConfirmationHistory,{language,events:[{previous_value:0,value:10,reason:'<script>test</script>',at:'2026-11-07'}]}),language);assert.match(html,/0 →/);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);if(language!=='zh')assert.doesNotMatch(html,/[\u3400-\u9fff]/);else assert.match(html,/确认与更正历史/);}});
test('account renders localized privacy and preserves the return target in all language links',async()=>{
 const target='/partners?version=3';
 for(const lang of ['zh','en','it']){
  const element=await load('app/account/page.tsx').default({searchParams:Promise.resolve({lang,return_to:target})});
  const html=render(element,lang,'/account');
  assert.match(html,/return_to=%2Fpartners%3Fversion%3D3/);
  assert.match(html,/target="_top"/);
  assert.doesNotMatch(html,/Privacy \/ 隐私说明/);
  if(lang!=='zh') assert.doesNotMatch(html.replace(/中文/g,''),/[\u3400-\u9fff]/);
 }
 const element=await load('app/account/page.tsx').default({searchParams:Promise.resolve({lang:'en',return_to:'//evil.example'})});
 assert.doesNotMatch(render(element,'en','/account'),/evil.example/);
});
test('private file panel defaults to a collapsed test entry without an enabled upload form',()=>{
 const {PrivateFilePanel}=load('app/private-file-panel.tsx');
 for(const language of ['zh','en','it']){const html=render(React.createElement(PrivateFilePanel,{taskId:'task',language}),language);assert.match(html,/<details/);assert.doesNotMatch(html,/<details[^>]* open|type="file"/);if(language!=='zh')assert.doesNotMatch(html,/[\u3400-\u9fff]/);else{assert.match(html,/平台云存储/);assert.match(html,/上传不提高证据级别/);}}
});
test('private file list escapes names and permits downloads only for stored unreviewed files',()=>{
 const {PrivateFileList}=load('app/private-file-panel.tsx');
 for(const language of ['zh','en','it']){const html=render(React.createElement(PrivateFileList,{language,busy:false,onDownload(){},onRemove(){},files:[{id:'a',filename:'<img src=x>',state:'DELETING',size_bytes:20,sha256:'abc'}]}),language);assert.match(html,/&lt;img src=x&gt;/);assert.doesNotMatch(html,/<img/);assert.match(html,/<button[^>]*disabled/);if(language!=='zh')assert.doesNotMatch(html,/[\u3400-\u9fff]/);}
});
test('account identity distinguishes test access in three languages and renders IDs as escaped read-only text',()=>{
 const {AccountIdentity}=load('app/account/identity.tsx');
 for(const language of ['zh','en','it'])for(const canTest of [true,false]){const html=render(React.createElement(AccountIdentity,{actorId:'actor-<script>',canTest,language}),language);assert.match(html,/readOnly=""/);assert.match(html,/actor-&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/site-account-id/);if(language!=='zh')assert.doesNotMatch(html,/[\u3400-\u9fff]/);else{assert.match(html,/不是密码/);assert.match(html,canTest?/已为本账号开放/:/尚未开放/);}}
});
test('anonymous account page does not render an account identifier or test controls',async()=>{
 const element=await load('app/account/page.tsx').default({searchParams:Promise.resolve({lang:'en'})});const html=render(element,'en','/account');assert.doesNotMatch(html,/site-account-id|Copy account ID|PRIVATE_FILE_TEST_ACTOR_IDS/);
});

test('file history labels state transitions in each language and escapes identifiers',()=>{
 const {FileHistoryRows}=load('app/private-file-history.tsx');for(const language of ['zh','en','it']){const html=render(React.createElement(FileHistoryRows,{language,events:[{sequence:1,file_id:'<img src=x>',from_state:'DELETING',to_state:'DELETED',recorded_at:'2026-11-07T00:00:00Z'}]}),language);assert.match(html,/&lt;img src=x&gt;/);assert.doesNotMatch(html,/<img/);assert.doesNotMatch(html,/DELETING|DELETED/);if(language!=='zh')assert.doesNotMatch(html,/[\u3400-\u9fff]/);else assert.match(html,/已删除/);}
});
test('private file usage renders localized quota separately from evidence completion',()=>{
 const {PrivateFileUsage}=load('app/private-file-usage.tsx');
 const usage={account:{occupied:3,limit:20,remaining:17},task:{stored:1,uploading:1,deleting:1}};
 for(const language of ['zh','en','it']){
  const html=render(React.createElement(PrivateFileUsage,{usage,language}),language);
  assert.match(html,/<meter/);assert.match(html,/value="3"/);assert.match(html,/17/);
  if(language==='zh'){assert.match(html,/不代表证据完成度/);assert.doesNotMatch(html,/Account|Stored|remaining/);}
  else assert.doesNotMatch(html,/[\u3400-\u9fff]/);
 }
});
test('task save recovery explains uncertain retry and explicit draft-clearing reload in three languages',()=>{
 const {TaskSaveRecovery}=load('app/task-save-recovery.tsx');
 for(const language of ['zh','en','it'])for(const mode of ['retry','conflict']){
  const html=render(React.createElement(TaskSaveRecovery,{language,mode,busy:false,onRetry(){},onReload(){}}),language);
  assert.match(html,/role="alert"/);assert.match(html,/<button/);
  if(language==='zh')assert.match(html,mode==='retry'?/原样重试/:/清除.*字段/);
  else assert.doesNotMatch(html,/[\u3400-\u9fff]/);
 }
});
test('review overview localizes training limits and renders no fabricated accuracy score',()=>{
 const {FieldReviewSummary}=load('app/field-review-summary.tsx');
 const state={task_id:'t',version:1,fields:[],materials:[]};
 for(const language of ['zh','en','it']){
  const html=render(React.createElement(FieldReviewSummary,{state,language}),language);
  if(language==='zh'){assert.match(html,/尚未用于模型训练/);assert.match(html,/尚未定位字段/);}
  else assert.doesNotMatch(html,/[\u3400-\u9fff]/);
  assert.doesNotMatch(html,/%|<meter|<progress/);
 }
});
test('review queue renders localized filters, bounded rows and accessible field links',()=>{
 const {FieldReviewSummary}=load('app/field-review-summary.tsx');
 const fields=Array.from({length:25},(_,i)=>({id:'field-'+i,code:'kwh_monthly',confirmed_value:null,extracted_value:i,confirmations:[]}));
 for(const language of ['zh','en','it']){
  const html=render(React.createElement(FieldReviewSummary,{state:{fields,materials:[]},language}),language);
  assert.equal((html.match(/href="#field-review-/g)??[]).length,20);
  assert.equal((html.match(/<option /g)??[]).length,8);assert.match(html,/role="status"/);assert.match(html,/aria-pressed/);
  if(language==='zh')assert.match(html,/不会排除证据或自动确认字段/);else assert.doesNotMatch(html,/[\u3400-\u9fff]/);
 }
});
test('synthetic format guide renders native examples and states deterministic parsing limits',()=>{
 const {SyntheticFormatGuide}=load('app/synthetic-format-guide.tsx');
 for(const language of ['zh','en','it']){
  const html=render(React.createElement(SyntheticFormatGuide,{language}),language);
  assert.match(html,/kWh/);assert.match(html,/OCR/);
  if(language==='zh')assert.match(html,/不是 AI/);else{assert.doesNotMatch(html,/[\u3400-\u9fff]/);assert.match(html,language==='en'?/Roster headcount/:/Addetti in elenco/);}
 }
});
test('location diagnostics translate status labels and escape user source excerpts',()=>{
 const {MaterialLocationReport}=load('app/material-location-report.tsx');
 const report={field_count:0,recognised_labels:1,issue_count:1,truncated:false,issues:[{code:'revenue',reason:'UNIT_UNSUPPORTED',locator:{line:2,quote:'<script>source</script>'}}]};
 for(const language of ['zh','en','it']){
  const html=render(React.createElement(MaterialLocationReport,{report,language}),language);
  assert.doesNotMatch(html,/<script>/);assert.match(html,/&lt;script&gt;/);
  if(language==='zh')assert.match(html,/没有自动填值/);else assert.doesNotMatch(html,/[\u3400-\u9fff]/);
 }
 assert.equal(render(React.createElement(MaterialLocationReport,{language:'en'})),'');
});
test('assessment source issues localize blocked-ratio explanation and source navigation',()=>{
 const {AssessmentSourceIssues}=load('app/assessment-source-issues.tsx');
 const report={issue_count:1,affected_codes:['kwh_monthly'],materials:[{material_id:'sample-1',issue_count:1}]};
 for(const language of ['zh','en','it']){
  const html=render(React.createElement(AssessmentSourceIssues,{report,language}),language);
  assert.match(html,/#material-review-sample-1/);if(language==='zh')assert.match(html,/无法判断/);else assert.doesNotMatch(html,/[\u3400-\u9fff]/);
  const reason=uiText('SOURCE_PARSE_ISSUE',language);assert.notEqual(reason,'SOURCE_PARSE_ISSUE');
 }
});
test('task list pagination translates loading, counts and older-task action',()=>{
 const {TaskListPaging}=load('app/task-list-paging.tsx');
 for(const language of ['zh','en','it']){
  const html=render(React.createElement(TaskListPaging,{language,count:50,hasMore:true,loading:false,disabled:false,onMore(){}}),language);
  assert.match(html,/50/);assert.match(html,/<button/);if(language==='zh')assert.match(html,/较早的任务/);else assert.doesNotMatch(html,/[\u3400-\u9fff]/);
  const loading=render(React.createElement(TaskListPaging,{language,count:50,hasMore:true,loading:true,disabled:false,onMore(){}}),language);assert.match(loading,/disabled/);
  const end=render(React.createElement(TaskListPaging,{language,count:51,hasMore:false,loading:false,disabled:false,onMore(){}}),language);assert.doesNotMatch(end,/<button/);
 }
});
test('task search renders accessible localized bounded controls',()=>{
 const {TaskListSearch}=load('app/task-list-search.tsx');
 for(const language of ['zh','en','it']){
  const html=render(React.createElement(TaskListSearch,{language,value:'<script>',disabled:true,onChange(){},onSearch(){},onClear(){}}),language);
  assert.match(html,/role="search"/);assert.match(html,/maxLength="100"/i);assert.match(html,/disabled/);assert.doesNotMatch(html,/<script>/);
  if(language==='zh')assert.match(html,/全部已保存任务/);else assert.doesNotMatch(html,/[\u3400-\u9fff]/);
 }
});
test('history overview localizes saved counts and escapes user titles',()=>{
 const {TaskHistoryRows,TaskHistoryPanel}=load('app/task-history-panel.tsx');
 for(const language of ['zh','en','it']){
  const row={version:2,created_at:'2026-11-07T00:00:00.000Z',title:'<script>test</script>',period:'2026-10',materials:1,fields:2,confirmed:0,assessments:0,cards:0,flags:0};
  const html=render(React.createElement(TaskHistoryRows,{language,rows:[row]}),language);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/<time/);
  if(language==='zh')assert.match(html,/已确认字段: 0/);else assert.doesNotMatch(html,/[\u3400-\u9fff]/);
  const closed=render(React.createElement(TaskHistoryPanel,{taskId:'task',language,read:async()=>{throw Error('must not load until opened');}}),language);assert.match(closed,/aria-expanded="false"/);assert.doesNotMatch(closed,/<ol/);
 }
});
test('field change view localizes values and displays zero separately from unconfirmed',()=>{
 const {TaskFieldChangeRows}=load('app/task-field-changes.tsx');
 const field={code:'kwh_monthly',unit:'kWh',material_id:'<script>',extracted_value:12,confirmed_value:null,confirmation_count:0};
 for(const language of ['zh','en','it']){
  const report={from_version:2,to_version:3,total:1,truncated:false,changes:[{field_id:'a',kind:'changed',before:field,after:{...field,confirmed_value:0,confirmation_count:1}}]};
  const html=render(React.createElement(TaskFieldChangeRows,{report,language}),language);assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);assert.match(html,/: 0/);
  if(language==='zh')assert.match(html,/未确认/);else assert.doesNotMatch(html,/[\u3400-\u9fff]/);
 }
});
test('assessment readiness disables premature freezing and distinguishes frozen snapshot in three languages',()=>{
 const {AssessmentReadiness}=load('app/assessment-readiness.tsx');
 for(const language of ['zh','en','it']){
  const base={version:4,assessments:[{id:'a',input_version:3}],events:[{action:'assess'}],cards:[]};
  const ready=render(React.createElement(AssessmentReadiness,{state:base,language,busy:false,onFreeze(){}}),language);assert.doesNotMatch(ready,/disabled/);
  const frozen={...base,version:5,events:[{action:'freeze_card'}],cards:[{body:{task_version:4,assessment:{id:'a'}}}]};
  const html=render(React.createElement(AssessmentReadiness,{state:frozen,language,busy:false,onFreeze(){}}),language);assert.match(html,/disabled/);if(language==='zh')assert.match(html,/历史快照/);else assert.doesNotMatch(html,/[\u3400-\u9fff]/);
  const missing=render(React.createElement(AssessmentReadiness,{state:{...base,assessments:[]},language,busy:false,onFreeze(){}}),language);assert.match(missing,/disabled/);
 }
});

test('subscription catalog renders approved annual/monthly prices in three languages without checkout',()=>{
 const Pricing=load('app/subscription-pricing.tsx').SubscriptionPricing;
 for(const lang of ['zh','en','it']){const html=render(React.createElement(Pricing,{language:lang}),lang);assert.match(html,/490/);assert.match(html,/390/);assert.doesNotMatch(html,/<button|<form/);if(lang!=='zh')assert.doesNotMatch(html,/[\u3400-\u9fff]/);}
 const c=JSON.parse(readFileSync(path.join(root,'lib/subscription-catalog.json'),'utf8'));
 assert.equal(c.checkout_enabled,false);assert.equal(c.plans.find(p=>p.id==='enterprise').monthly,null);
 for(const p of c.plans.filter(p=>p.monthly))assert.equal(p.monthly*12,p.annual*1.2);
 assert.deepEqual(c.founder.eligible,['starter','business','export']);
});
