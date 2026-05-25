import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, errorToResponse } from '@/lib/api-guard';
import { AppsScriptDeploymentService } from '@/lib/gas/deployment-service';
import { ok, fail } from '@/lib/errors';

type Params = { params: Promise<{ scriptId: string; deploymentId: string }> };

// R6 紅線：更新既有 deployment 必須帶「新」versionNumber。
const UpdateSchema = z.object({
  versionNumber: z.number().int().positive(),
  description: z.string().min(1).max(200),
});

export async function DELETE(_req: NextRequest, { params }: Params) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;
  try {
    const { scriptId, deploymentId } = await params;
    await AppsScriptDeploymentService.delete(guard.userId, scriptId, deploymentId);
    return NextResponse.json(ok({ deploymentId }));
  } catch (err) {
    return errorToResponse(err);
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;
  try {
    const { scriptId, deploymentId } = await params;
    const body = await req.json();
    const parsed = UpdateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(fail('DEPLOYMENT_FAILED', 'invalid input'), { status: 400 });
    }
    const data = await AppsScriptDeploymentService.update(
      guard.userId, scriptId, deploymentId,
      parsed.data.versionNumber, parsed.data.description,
    );
    return NextResponse.json(ok(data));
  } catch (err) {
    return errorToResponse(err);
  }
}
