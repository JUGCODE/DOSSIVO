import {pageMetadata} from '@/lib/page-metadata';
export const generateMetadata=pageMetadata('protocol');
import {UIText} from '@/app/ui-language';
import ProtocolNavigation from './navigation';
import { PROTOCOL_SECTIONS } from '@/lib/protocol-text';
import { PROTOCOL_REGISTRY as r } from '@/lib/protocol-registry';
export default function Protocol(){return <div className="protocol-view"><ProtocolNavigation/><main className="protocol-page" style={{maxWidth:1050,margin:'0 auto',padding:'32px 24px',lineHeight:1.8,color:'#182d29',background:'#fafbf8',minHeight:'100vh'}}>
<p><UIText>{"PROTOCOL · draft-0.1 · 2026-11-05"}</UIText></p><h1 style={{fontSize:32}}><UIText>{"DOSSIVO 证据呈现 协议"}</UIText></h1>
<p><UIText>{"文字、代码、版本与实际执行应逐项对应。更正和升级追加新版本，保留旧版核验路径。"}</UIText></p>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:18}}>{[r.paci_protocol,r.domain_protocol].map(p=><section key={p.title} style={{padding:20,border:'1px solid #c7b579',borderRadius:12}}><h2><UIText>{p.title}</UIText></h2><p><UIText>{"链上协议入口："}</UIText><strong><UIText>{"待 协议 窗口交付并验证"}</UIText></strong></p><p><UIText>{"网络 / 合约地址 / 部署交易：未核实，尚无可展示链接。"}</UIText></p><p><UIText>{"普通钱包地址不能代替协议合约。地址存在也不能证明本张卡执行过协议。"}</UIText></p></section>)}</div>
<p role="status"><UIText>{"当前为应用层映射草案，尚不能声称与一个已发布、已部署的 PACI 协议 完全对应。正式链上卡发布保持关闭。"}</UIText></p>
{PROTOCOL_SECTIONS.map(section=><section key={section.title}><h2><UIText>{section.title}</UIText></h2>{section.rows&&<div style={{overflowX:'auto'}}><table><thead><tr><th><UIText>{"能力"}</UIText></th><th><UIText>{"已读取的接口契约"}</UIText></th><th><UIText>{"本轮边界"}</UIText></th></tr></thead><tbody>{section.rows.map(row=><tr key={row[0]}>{row.map(c=><td key={c}><UIText>{c}</UIText></td>)}</tr>)}</tbody></table></div>}<p><UIText>{section.text}</UIText></p></section>)}
<p><UIText>{"依据：2026-11-05 开发主指令、三窗口基线、DOSSIVO 宪章 v3.0、规则 v0.1 与最新用户要求。本草案不修订 PACI 通用规范或正式采纳领域阈值。"}</UIText></p></main></div>;}
