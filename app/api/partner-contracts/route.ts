import {env} from 'cloudflare:workers';
import {approvedPartnerDocument} from '@/lib/partner-contract-access';
import {getCurrentUser} from '@/app/auth';
import {PARTNER_DRAFT_VERSION,partnerContractResponse} from '@/lib/partner-contracts';
export const dynamic='force-dynamic';
export async function GET(request:Request){const user=await getCurrentUser(),url=new URL(request.url);const release=user?await approvedPartnerDocument(env.DB,user.userId,url.searchParams.get('type'),url.searchParams.get('lang')??'zh',undefined,url.searchParams.get('version')??PARTNER_DRAFT_VERSION):null;return partnerContractResponse(user?.userId,request.url,release?.approval,release?.document);}
