import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
import {partnerApplicationRequest} from '@/lib/partner-applications';
export const dynamic='force-dynamic';
async function handle(request:Request){const user=await getChatGPTUser();return partnerApplicationRequest(env.DB,user?.userId,(env as unknown as {PARTNER_CONTRACT_ADMIN_IDS?:string}).PARTNER_CONTRACT_ADMIN_IDS,request,{admin:true});}
export const GET=handle;
export const POST=handle;
