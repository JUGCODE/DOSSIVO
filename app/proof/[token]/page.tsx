import {pageMetadata} from '@/lib/page-metadata';
export const generateMetadata=pageMetadata('proof');
import {ProofSecurityNotice} from '@/app/proof-security-notice';
import { ProofViewer } from "./viewer";

export default async function ProofPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <><ProofViewer token={token} /><ProofSecurityNotice/></>;
}
