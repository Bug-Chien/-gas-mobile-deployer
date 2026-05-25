import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, errorToResponse } from '@/lib/api-guard';
import { AppsScriptVersionService } from '@/lib/gas/version-service';
import { ok, fail } from '@/lib/errors';

type Params = { params: Promise<{ scriptId: string }> };

const CreateSchema = z.object({ description: z.string().min(1).max(200) });

export async function GET(_req: NextRequest, { params }: Params) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;
  try {
    const { scriptId } = await params;
    const items = await AppsScriptVersionService.list(guard.userId, scriptId);
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
      return NextResponse.json(fail('VERSION_CREATE_FAILED', 'description required'), { status: 400 });
    }
    const data = await AppsScriptVersionService.create(guard.userId, scriptId, parsed.data.description);
    return NextResponse.json(ok(data));
  } catch (err) {
    return errorToResponse(err);
  }
}
