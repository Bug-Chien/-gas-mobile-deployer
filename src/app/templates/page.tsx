import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { listTemplates } from '@/lib/templates/registry';
import { TemplatesClient } from './templates-client';

export const dynamic = 'force-dynamic';

export default async function TemplatesPage() {
  const session = await getSession();
  if (!session.userId) redirect('/');
  return <TemplatesClient items={listTemplates()} />;
}
