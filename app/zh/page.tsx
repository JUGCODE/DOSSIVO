import Home from "../page";
export const dynamic = "force-dynamic";
export const metadata = { title: 'DOSSIVO 多希沃｜企业供应链证据与合规准备', description: '企业自主掌控供应链证据，识别缺口、补齐档案，按授权向买方出示可核查材料。', alternates: { canonical: "/zh/", languages: { zh: "/zh/", en: "/en/", it: "/it/", "x-default": "/" } } };
export default function LocalizedHome() { return <Home language="zh"/>; }
