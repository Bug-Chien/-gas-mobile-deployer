import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, errorToResponse } from '@/lib/api-guard';
import { AppsScriptDeploymentService } from '@/lib/gas/deployment-service';
import { ok, fail } from '@/lib/errors';

type Params = { params: Promise<{ scriptId: string }> };

const CreateSchema = z.object({
  versionNumber: z.number().int().positive(),
  description: z.string().min(1).max(200),
});

export async function GET(_req: NextRequest, { params }: Params) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;
  try {
    const { scriptId } = await params;
    const items = await AppsScriptDeploymentService.list(guard.userId, scriptId);
    return NextResponse.json(ok({ items }));
  } catch (err) {
    return errorToResponse(err);
  }
}

export async function POST(req: NextRequest, { params }: Params) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;
  try {
    const { scriptId } = await params;
    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(fail('DEPLOYMENT_FAILED', 'invalid input'), { status: 400 });
    }
    const data = await AppsScriptDeploymentService.create(
      guard.userId, scriptId, parsed.data.versionNumber, parsed.data.description,
    );
    return NextResponse.json(ok(data));
  } catch (err) {
    return errorToResponse(err);
  }
}
