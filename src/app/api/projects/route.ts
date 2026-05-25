import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, errorToResponse } from '@/lib/api-guard';
import { AppsScriptProjectService } from '@/lib/gas/project-service';
import { ok, fail } from '@/lib/errors';

const CreateSchema = z.object({ title: z.string().min(1).max(100) });

// POST /api/projects — 建立新 GAS 專案
export async function POST(req: NextRequest) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  try {
    const body = await req.json();
    const parsed = CreateSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json(fail('INTERNAL_ERROR', 'invalid title'), { status: 400 });
    const result = await AppsScriptProjectService.createProject(guard.userId, parsed.data.title);
    return NextResponse.json(ok(result));
  } catch (err) {
    return errorToResponse(err);
  }
}
