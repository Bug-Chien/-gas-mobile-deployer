import { NextResponse } from 'next/server';
import { requireAuth, errorToResponse } from '@/lib/api-guard';
import { AppsScriptProjectService } from '@/lib/gas/project-service';
import { ok } from '@/lib/errors';

// GET /api/projects/recent — 最近開啟過的專案
export async function GET() {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;
  try {
    const items = await AppsScriptProjectService.listRecent(guard.userId);
    return NextResponse.json(ok({ items }));
  } catch (err) {
    return errorToResponse(err);
  }
}
