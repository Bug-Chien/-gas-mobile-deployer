import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, errorToResponse } from '@/lib/api-guard';
import { AppsScriptProjectService } from '@/lib/gas/project-service';
import { ok, fail } from '@/lib/errors';

const FileSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['SERVER_JS', 'HTML', 'JSON']),
  source: z.string(),
});

const PutSchema = z.object({
  files: z.array(FileSchema).min(1),
  expectedUpdateTime: z.string().optional(),
});

type Params = { params: Promise<{ scriptId: string }> };

// GET /api/projects/[scriptId]/content — 讀取專案完整內容
export async function GET(_req: NextRequest, { params }: Params) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;
  try {
    const { scriptId } = await params;
    const data = await AppsScriptProjectService.getContent(guard.userId, scriptId);
    return NextResponse.json(ok(data));
  } catch (err) {
    return errorToResponse(err);
  }
}

// PUT /api/projects/[scriptId]/content — 儲存完整 files 陣列到 GAS HEAD
// 唯一儲存入口；service 內部會走 validateFilesForUpdate。
export async function PUT(req: NextRequest, { params }: Params) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;
  try {
    const { scriptId } = await params;
    const body = await req.json();
    const parsed = PutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(fail('EMPTY_FILES', JSON.stringify(parsed.error.issues)), { status: 400 });
    }
    const data = await AppsScriptProjectService.updateContent(
      guard.userId,
      scriptId,
      parsed.data.files,
      parsed.data.expectedUpdateTime ?? null,
    );
    return NextResponse.json(ok(data));
  } catch (err) {
    return errorToResponse(err);
  }
}
