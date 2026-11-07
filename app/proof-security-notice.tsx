'use client';
import {useUILanguage} from './ui-language';
export function ProofSecurityNotice(){const lang=useUILanguage(),text={zh:'旧版合成测试链接，尚未接入新版签名核验。请勿在证明页面输入密码。查看防钓鱼说明',en:'Legacy synthetic test link; new signed verification is not connected. Do not enter passwords on a proof page. Read anti-phishing guidance',it:'Link sintetico precedente; nuova verifica firmata non collegata. Non inserire password su pagine di prova. Leggi la guida antiphishing'}[lang];return <aside className="proof-security-notice"><a href={'/security?lang='+lang}>{text}</a></aside>;}
