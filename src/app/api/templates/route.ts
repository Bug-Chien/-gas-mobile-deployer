import { NextResponse } from 'next/server';
import { listTemplates } from '@/lib/templates/registry';
import { ok } from '@/lib/errors';

export async function GET() {
  return NextResponse.json(ok({ items: listTemplates() }));
}
