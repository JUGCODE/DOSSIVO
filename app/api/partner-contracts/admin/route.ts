import {env} from 'cloudflare:workers';
import {getCurrentUser} from '@/app/auth';
import {partnerAdminRequest} from '@/lib/partner-contract-admin';
export const dynamic='force-dynamic';
async function handle(request:Request){const user=await getCurrentUser();return partnerAdminRequest(env.DB,user?.userId,(env as unknown as {PARTNER_CONTRACT_ADMIN_IDS?:string}).PARTNER_CONTRACT_ADMIN_IDS,request);}
export const GET=handle;
export const POST=handle;
