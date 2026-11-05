import ProtocolNavigation from './navigation';
import { PROTOCOL_SECTIONS } from '@/lib/protocol-text';
import { PROTOCOL_REGISTRY as r } from '@/lib/protocol-registry';
export const metadata={title:'DOSSIVO Protocol · Text, versions and chain verification',description:'DOSSIVO evidence presentation protocol, PACI correspondence and actual deployment status.'};
export default function Protocol(){return <div className="protocol-view"><ProtocolNavigation/><main className="protocol-page" style={{maxWidth:1050,margin:'0 auto',padding:'32px 24px',lineHeight:1.8,color:'#182d29',background:'#fafbf8',minHeight:'100vh'}}>
<p>PROTOCOL · draft-0.1 · 2026-11-05</p><h1 style={{fontSize:32}}>DOSSIVO 证据呈现 Protocol</h1>
<p>文字、代码、版本与实际执行应逐项对应。更正和升级追加新版本，保留旧版核验路径。</p>
<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:18}}>{[r.paci_protocol,r.domain_protocol].map(p=><section key={p.title} style={{padding:20,border:'1px solid #c7b579',borderRadius:12}}><h2>{p.title}</h2><p>链上协议入口：<strong>待 Protocol 窗口交付并验证</strong></p><p>网络 / 合约地址 / 部署交易：未核实，尚无可展示链接。</p><p>普通钱包地址不能代替协议合约。地址存在也不能证明本张卡执行过协议。</p></section>)}</div>
<p role="status">当前为应用层映射草案，尚不能声称与一个已发布、已部署的 PACI Protocol 完全对应。正式链上卡发布保持关闭。</p>
{PROTOCOL_SECTIONS.map(section=><section key={section.title}><h2>{section.title}</h2>{section.rows&&<div style={{overflowX:'auto'}}><table><thead><tr><th>能力</th><th>已读取的接口契约</th><th>本轮边界</th></tr></thead><tbody>{section.rows.map(row=><tr key={row[0]}>{row.map(c=><td key={c}>{c}</td>)}</tr>)}</tbody></table></div>}<p>{section.text}</p></section>)}
<p>依据：2026-11-05 开发主指令、三窗口基线、DOSSIVO 宪章 v3.0、规则 v0.1 与最新用户要求。本草案不修订 PACI 通用规范或正式采纳领域阈值。</p></main></div>;}
