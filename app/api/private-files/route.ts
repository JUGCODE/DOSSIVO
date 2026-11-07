import {env} from 'cloudflare:workers';
import {getCurrentUser} from '@/app/auth';
import {privateFileRequest} from '@/lib/private-file-request';
export const dynamic='force-dynamic';
async function handle(request:Request){
 const user=await getCurrentUser();
 const runtime=env as unknown as {DB:D1Database;BUCKET?:R2Bucket;PRIVATE_FILE_TEST_ACTOR_IDS?:string};
 return privateFileRequest(request,user?.userId,runtime.DB,runtime.BUCKET,runtime.PRIVATE_FILE_TEST_ACTOR_IDS);
}
export const GET=handle;
export const POST=handle;
export const DELETE=handle;
