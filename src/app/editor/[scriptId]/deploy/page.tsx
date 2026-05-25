import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { DeployClient } from './deploy-client';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ scriptId: string }> };

export default async function DeployPage({ params }: Props) {
  const session = await getSession();
  if (!session.userId) redirect('/');
  const { scriptId } = await params;
  return <DeployClient scriptId={scriptId} />;
}
