import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, errorToResponse } from '@/lib/api-guard';
import { AppsScriptProjectService } from '@/lib/gas/project-service';
import { ok, fail } from '@/lib/errors';

const OpenSchema = z.object({ scriptId: z.string().min(20).max(80) });

// POST /api/projects/open — 用 Script ID 開啟既有專案（讀取一次 + 加入最近清單）
export async function POST(req: NextRequest) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  try {
    const body = await req.json();
    const parsed = OpenSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json(fail('SCRIPT_NOT_FOUND', 'invalid scriptId'), { status: 400 });
    const { files, title } = await AppsScriptProjectService.getContent(guard.userId, parsed.data.scriptId);
    return NextResponse.json(ok({ scriptId: parsed.data.scriptId, title, fileCount: files.length }));
  } catch (err) {
    return errorToResponse(err);
  }
}
