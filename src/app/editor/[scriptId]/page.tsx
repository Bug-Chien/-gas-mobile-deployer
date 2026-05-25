import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth/session';
import { AppsScriptProjectService } from '@/lib/gas/project-service';
import { EditorClient } from './editor-client';

export const dynamic = 'force-dynamic';

type Props = { params: Promise<{ scriptId: string }> };

export default async function EditorPage({ params }: Props) {
  const session = await getSession();
  if (!session.userId) redirect('/');
  const { scriptId } = await params;

  let initialFiles: { name: string; type: 'SERVER_JS' | 'HTML' | 'JSON'; source: string }[] = [];
  let title = scriptId;
  let initialUpdateTime: string | null = null;
  let loadError: string | null = null;
  try {
    const data = await AppsScriptProjectService.getContent(session.userId, scriptId);
    initialFiles = data.files;
    title = data.title;
    initialUpdateTime = data.updateTime;
  } catch (e) {
    loadError = e instanceof Error ? e.message : '讀取失敗';
  }

  return (
    <EditorClient
      scriptId={scriptId}
      initialTitle={title}
      initialFiles={initialFiles}
      initialUpdateTime={initialUpdateTime}
      loadError={loadError}
    />
  );
}
