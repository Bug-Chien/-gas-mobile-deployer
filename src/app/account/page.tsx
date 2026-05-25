import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { AccountClient } from './account-client';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  const session = await getSession();
  if (!session.userId) redirect('/');

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { email: true, name: true, avatarUrl: true, createdAt: true },
  });
  const projectCount = await prisma.scriptProject.count({ where: { userId: session.userId } });
  const snapshotCount = await prisma.projectSnapshot.count({
    where: { project: { userId: session.userId } },
  });

  return (
    <AccountClient
      user={{
        email: user?.email ?? '',
        name: user?.name ?? null,
        createdAt: user?.createdAt?.toISOString() ?? null,
      }}
      projectCount={projectCount}
      snapshotCount={snapshotCount}
    />
  );
}
