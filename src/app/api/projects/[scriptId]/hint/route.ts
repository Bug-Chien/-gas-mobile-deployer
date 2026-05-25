import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, errorToResponse } from '@/lib/api-guard';
import { TemplateService } from '@/lib/templates/service';
import { getTemplate } from '@/lib/templates/registry';
import { ok } from '@/lib/errors';

type Params = { params: Promise<{ scriptId: string }> };

// GET /api/projects/[scriptId]/hint — 回傳此專案的範本 id 與部署後教學提示
export async function GET(_req: NextRequest, { params }: Params) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;
  try {
    const { scriptId } = await params;
    const templateId = await TemplateService.getProjectTemplateId(guard.userId, scriptId);
    const t = templateId ? getTemplate(templateId) : undefined;
    return NextResponse.json(ok({
      templateId,
      templateName: t?.name ?? null,
      postDeployHint: t?.postDeployHint ?? null,
    }));
  } catch (err) {
    return errorToResponse(err);
  }
}
