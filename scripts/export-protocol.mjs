import {writeFileSync} from 'node:fs';
import {PROTOCOL_SECTIONS} from '../lib/protocol-text.js';
export function protocolMarkdown(){return '# DOSSIVO 证据呈现 Protocol\n\ndraft-0.1 · 2026-11-05 · 应用映射草案，非通用PACI正式规范。\n\nPACI Protocol / PACI-DOSSIVO-FL：等待权威文字与实际链上部署交付、验证。没有合约地址或部署交易可据实展示。当前不能声称完全对应已发布的通用规范，正式链上卡发布关闭。\n\n'+PROTOCOL_SECTIONS.map(s=>'## '+s.title+'\n\n'+(s.rows?'| 能力 | 已读取的接口契约 | 本轮边界 |\n|---|---|---|\n'+s.rows.map(r=>'| '+r.join(' | ')+' |').join('\n')+'\n\n':'')+s.text).join('\n\n')+'\n\n依据：完整开发主指令、三窗口基线、宪章v3.0、原规则v0.1与最新用户要求。应用页面与本Markdown由同一文字源生成；文本一致不等于与上游语义或链上执行已完成一致性证明。\n';}
if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1])writeFileSync(new URL('../docs/DOSSIVO_PROTOCOL.md',import.meta.url),protocolMarkdown());
