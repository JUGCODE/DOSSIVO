import Home from "../page";
export const dynamic = "force-dynamic";
export const metadata = { title: 'DOSSIVO | Supply-chain evidence for EU trade', description: 'Company-controlled supply-chain evidence: identify gaps, prepare records and share reviewable materials with buyers.', alternates: { canonical: "/en/", languages: { zh: "/zh/", en: "/en/", it: "/it/", "x-default": "/" } } };
export default function LocalizedHome() { return <Home language="en"/>; }
