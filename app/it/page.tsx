import Home from "../page";
export const dynamic = "force-dynamic";
export const metadata = { title: 'DOSSIVO | Prove di filiera per il commercio UE', description: 'Gestisci le prove di filiera, individua le lacune e condividi con i buyer documenti verificabili su autorizzazione.', alternates: { canonical: "/it/", languages: { zh: "/zh/", en: "/en/", it: "/it/", "x-default": "/" } } };
export default function LocalizedHome() { return <Home language="it"/>; }
