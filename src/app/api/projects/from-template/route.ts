import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, errorToResponse } from '@/lib/api-guard';
import { TemplateService } from '@/lib/templates/service';
import { ok, fail } from '@/lib/errors';

const Schema = z.object({
  templateId: z.string().min(1),
  title: z.string().min(1).max(100),
  settings: z.record(z.string(), z.string()).default({}),
});

export async function POST(req: NextRequest) {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;
  try {
    const body = await req.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(fail('INTERNAL_ERROR', 'invalid body'), { status: 400 });
    }
    const r = await TemplateService.createProjectFromTemplate(
      guard.userId,
      parsed.data.templateId,
      parsed.data.title,
      parsed.data.settings,
    );
    return NextResponse.json(ok(r));
  } catch (err) {
    return errorToResponse(err);
  }
}
