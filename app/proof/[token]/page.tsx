import { ProofViewer } from "./viewer";

export default async function ProofPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <ProofViewer token={token} />;
}
