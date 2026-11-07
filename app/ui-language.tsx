'use client';
import {createContext,useContext,useEffect,type ReactNode,type AnchorHTMLAttributes,type HTMLAttributes} from 'react';
import {usePathname,useSearchParams} from 'next/navigation';
import {resolveLanguage,uiText,localizedHref,type UILanguage} from '@/lib/ui-locale';
const LanguageContext=createContext<UILanguage>('zh');
export function UILanguageProvider({children}:{children:ReactNode}){
 const path=usePathname()||'/',params=useSearchParams(),language=resolveLanguage(path,params?.toString()||'');
 useEffect(()=>{document.documentElement.lang=language==='zh'?'zh-CN':language;},[language]);
 return <LanguageContext.Provider value={language}>{children}</LanguageContext.Provider>;
}
export function useUILanguage(){return useContext(LanguageContext);}
export function UIText({children}:{children:ReactNode}){
 const language=useUILanguage();
 return <>{typeof children==='string'?uiText(children,language):children}</>;
}
export function LocaleLink({href='',children,...props}:AnchorHTMLAttributes<HTMLAnchorElement>){
 const language=useUILanguage();
 return <a {...props} href={localizedHref(href,language)} title={props.title?uiText(props.title,language):undefined} aria-label={props['aria-label']?uiText(props['aria-label'],language):undefined}>{children}</a>;
}

export function UISection(props:React.ComponentProps<'section'>){const lang=useUILanguage();return <section {...props} title={props.title?uiText(props.title,lang):undefined} aria-label={props['aria-label']?uiText(props['aria-label'],lang):undefined} />;}
export function UIDiv(props:React.ComponentProps<'div'>){const lang=useUILanguage();return <div {...props} title={props.title?uiText(props.title,lang):undefined} aria-label={props['aria-label']?uiText(props['aria-label'],lang):undefined} />;}
export function UIButton(props:React.ComponentProps<'button'>){const lang=useUILanguage();return <button {...props} title={props.title?uiText(props.title,lang):undefined} aria-label={props['aria-label']?uiText(props['aria-label'],lang):undefined} />;}
export function UIForm(props:React.ComponentProps<'form'>){const lang=useUILanguage();return <form {...props} title={props.title?uiText(props.title,lang):undefined} aria-label={props['aria-label']?uiText(props['aria-label'],lang):undefined} />;}
export function UIInput(props:React.ComponentProps<'input'>){const lang=useUILanguage();return <input {...props} title={props.title?uiText(props.title,lang):undefined} aria-label={props['aria-label']?uiText(props['aria-label'],lang):undefined} placeholder={props.placeholder?uiText(props.placeholder,lang):undefined}/>;}
export function UIProgress(props:React.ComponentProps<'progress'>){const lang=useUILanguage();return <progress {...props} title={props.title?uiText(props.title,lang):undefined} aria-label={props['aria-label']?uiText(props['aria-label'],lang):undefined} />;}
export function UITextarea(props:React.ComponentProps<'textarea'>){const lang=useUILanguage();return <textarea {...props} title={props.title?uiText(props.title,lang):undefined} aria-label={props['aria-label']?uiText(props['aria-label'],lang):undefined} placeholder={props.placeholder?uiText(props.placeholder,lang):undefined}/>;}
export function UISpan(props:React.ComponentProps<'span'>){const lang=useUILanguage();return <span {...props} title={props.title?uiText(props.title,lang):undefined} aria-label={props['aria-label']?uiText(props['aria-label'],lang):undefined} />;}
export function UINav(props:React.ComponentProps<'nav'>){const lang=useUILanguage();return <nav {...props} title={props.title?uiText(props.title,lang):undefined} aria-label={props['aria-label']?uiText(props['aria-label'],lang):undefined} />;}

/** Error boundaries expose localised guidance, never raw server/internal English. */
export function UIError({children}:{children:ReactNode}){
 const language=useUILanguage(),raw=typeof children==='string'?children:'',translated=uiText(raw,language);
 const known=translated!==raw||language==='en'&&!/[\u3400-\u9fff]/.test(raw)&&!/^[_A-Z]+$/.test(raw);
 return <>{known?translated:language==='zh'?'操作未完成，请检查登录状态、输入内容和访问权限后重试。':language==='it'?'Operazione non completata. Controlla accesso, dati e autorizzazioni e riprova.':'The action could not be completed. Check sign-in, input and access permission, then retry.'}</>;
}
export function StructuredMessage({message}:{message:Record<string,any>}){
 const language=useUILanguage(),value=message.structured;
 const topics:Record<string,string>={electricity:'用电凭证',social_insurance:'社保缴纳凭证',workforce:'人员汇总',audit:'审核报告',evidence_card:'证据卡片摘要'};
 const responses:Record<string,string>={PREPARING:'正在准备',UNAVAILABLE:'暂无法提供',CARD_SHARED:'已回应授权卡片'};
 if(!value)return <>{message.body}</>;
 if(value.type==='REQUEST')return <>{language==='zh'?'请求补充：':'Evidence request: '}{uiText(topics[value.topic]??value.topic,language)} · {value.period}{language==='zh'?'。材料须单独授权。':'. Evidence requires separate permission.'}</>;
 return <>{language==='zh'?'证据请求回应：':'Evidence response: '}{uiText(responses[value.status]??value.status,language)}{language==='zh'?'。此回应不表示验证通过或事项解决。':'. This response does not establish verification or resolution.'}</>;
}
