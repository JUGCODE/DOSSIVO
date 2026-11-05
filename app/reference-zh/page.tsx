"use client";

import { ExternalLink } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ChineseReferencePage() {
  const router = useRouter();
  const goBack = () => {
    try {
      const referrer = document.referrer ? new URL(document.referrer) : null;
      if (referrer?.origin === window.location.origin) { router.back(); return; }
    } catch { /* use safe fallback */ }
    router.push("/#faq");
  };
  return <main className="min-h-screen bg-[#07110f] px-5 py-12 text-[#e8f3ef] sm:px-8"><div className="mx-auto max-w-4xl"><button type="button" onClick={goBack} className="min-h-11 rounded-xl border border-white/10 px-4 text-sm font-medium text-[#82dfc2] hover:bg-white/5 hover:text-white">← 返回 Dossivo</button><div className="mt-8 rounded-[28px] border border-white/9 bg-[#0c1815] p-6 sm:p-10"><div className="text-sm font-semibold text-[#7ce0c1]">中文参考 · 非法律文本</div><h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">欧盟强制劳动法规与单一门户参考说明</h1><p className="mt-4 leading-7 text-[#91a79f]">本页帮助中文用户理解关键事实，不替代欧盟官方文本或专业法律意见。发生差异时，以欧盟官方文本及主管机关解释为准。</p>

      <section id="regulation" className="mt-10 scroll-mt-24 border-t border-white/8 pt-8"><h2 className="text-2xl font-semibold text-white">Regulation (EU) 2024/3015 关键内容参考</h2><ul className="mt-5 space-y-3 text-sm leading-7 text-[#9eb1aa]"><li>• 适用于所有产品、行业与原产国；产品任何部分涉及强制劳动均在范围内。</li><li>• 2024-12-13 法规生效；2027-12-14 产品禁令开始适用。</li><li>• 库存不享受豁免；已到达最终用户的产品不受撤回要求影响。</li><li>• 缺少证据本身不是违法，但会提高被问询与调查风险。</li><li>• 欧盟不颁发“强制劳动合规证书”；最终判断由欧委会或成员国主管机关依法作出。</li></ul><a className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#d7fff0] px-4 text-sm font-semibold text-[#07382d]" href="https://eur-lex.europa.eu/eli/reg/2024/3015/oj/eng" target="_blank" rel="noreferrer">打开欧盟官方法规原文<ExternalLink className="h-4 w-4"/></a></section>

      <section id="portal" className="mt-10 scroll-mt-24 border-t border-white/8 pt-8"><h2 className="text-2xl font-semibold text-white">强制劳动单一门户参考</h2><p className="mt-4 text-sm leading-7 text-[#9eb1aa]">该门户是公开信息网站，可用于查阅实施信息、风险资料与已公布决定；其中的单一信息提交点将自 2027-12-14 起用于免费举报线索。它不是企业注册、申报、认证或上传合规材料的渠道。企业通常通过欧洲买方问卷、海关补充信息要求或主管机关直接问询提供材料。</p><a className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/12 px-4 text-sm font-semibold text-[#a9ead6] hover:bg-white/5" href="https://single-market-economy.ec.europa.eu/single-market/goods/forced-labour-regulation_en" target="_blank" rel="noreferrer">打开欧盟官方门户<ExternalLink className="h-4 w-4"/></a></section>
    </div></div></main>;
}
