import 'server-only';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { fail } from '@/lib/errors';

// 規格書 R7：PoC 路由只在 dev/staging 開啟 + 必須登入。
export async function requirePocAccess(): Promise<{ userId: string } | NextResponse> {
  const isProd = process.env.NODE_ENV === 'production';
  const enabled = process.env.ENABLE_POC === 'true';
  if (isProd || !enabled) {
    return NextResponse.json(fail('POC_DISABLED'), { status: 404 });
  }
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json(fail('UNAUTHENTICATED'), { status: 401 });
  }
  return { userId: session.userId };
}
