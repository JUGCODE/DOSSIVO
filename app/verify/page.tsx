import {env} from 'cloudflare:workers';
import {verificationConfig} from '@/lib/proof-verification';
import {VerifyViewer} from './viewer';
export const dynamic='force-dynamic';
export default function Page(){const c=verificationConfig(env);return <VerifyViewer domain={c?.domain??null}/>;}
