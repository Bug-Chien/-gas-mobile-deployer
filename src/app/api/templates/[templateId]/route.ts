import { NextRequest, NextResponse } from 'next/server';
import { getTemplate } from '@/lib/templates/registry';
import { fail, ok } from '@/lib/errors';

type Params = { params: Promise<{ templateId: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { templateId } = await params;
  const t = getTemplate(templateId);
  if (!t) return NextResponse.json(fail('INTERNAL_ERROR', 'template not found'), { status: 404 });
  // 不回傳 source 內容（避免大 payload + 模板版權考量）；UI 只需 meta 欄位
  return NextResponse.json(ok({
    id: t.id,
    name: t.name,
    category: t.category,
    description: t.description,
    requiredSettings: t.requiredSettings,
  }));
}
