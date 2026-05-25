import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, errorToResponse } from '@/lib/api-guard';
import { AppsScriptProjectService } from '@/lib/gas/project-service';
import { ok } from '@/lib/errors';

type Params = { params: Promise<{ scriptId: string }> };

// POST /api/projects/[scriptId]/ensure-webapp
// 若 manifest 缺 webapp 區塊則補上預設值並儲存，否則回 patched=false。
export async function POST(_req: NextRequest, { params }: Params) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;
  try {
    const { scriptId } = await params;
    const data = await AppsScriptProjectService.ensureWebAppManifest(guard.userId, scriptId);
    return NextResponse.json(ok(data));
  } catch (err) {
    return errorToResponse(err);
  }
}
