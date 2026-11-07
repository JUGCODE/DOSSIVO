import {env} from 'cloudflare:workers';
import {getCurrentUser} from '@/app/auth';
import {isPartnerAdmin} from '@/lib/partner-contract-admin';
import {LocaleLink} from '@/app/ui-language';
import PartnerAdmin from './panel';
export const dynamic='force-dynamic';
export async function generateMetadata({searchParams}:{searchParams:Promise<{lang?:string}>}){const q=await searchParams;return {title:q.lang==='en'?'Contract review and release · DOSSIVO':'合同审核与发放 · DOSSIVO',robots:{index:false,follow:false},referrer:'no-referrer' as const};}
export default async function Page({searchParams}:{searchParams:Promise<{lang?:string}>}){
 const q=await searchParams,zh=!q.lang||q.lang==='zh',user=await getCurrentUser();
 const allowed=isPartnerAdmin(user?.userId,(env as unknown as {PARTNER_CONTRACT_ADMIN_IDS?:string}).PARTNER_CONTRACT_ADMIN_IDS);
 return <main className="buyer-portal"><header><LocaleLink href={'/partners?lang='+(zh?'zh':'en')}>{zh?'← 合作伙伴':'← Partners'}</LocaleLink></header><h1>{zh?'合同审核与发放':'Contract review and release'}</h1>{allowed?<PartnerAdmin zh={zh}/>:<p>{zh?'此操作台仅向已配置的合同管理员开放。普通登录不授予管理权限。':'This console is restricted to configured contract administrators. Signing in does not grant administrator access.'}</p>}</main>;
}
