import 'server-only';
import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/session';
import { AppError, fail } from '@/lib/errors';
import { logger } from '@/lib/logger';

// 所有 protected API route 的共同 guard。回傳 userId 或直接 NextResponse。
export async function requireAuth(): Promise<{ userId: string } | NextResponse> {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json(fail('UNAUTHENTICATED'), { status: 401 });
  }
  return { userId: session.userId };
}

// 統一錯誤 → response。Service 丟 AppError，這裡轉成結構化 JSON。
export function errorToResponse(err: unknown): NextResponse {
  if (err instanceof AppError) {
    const status = err.code === 'UNAUTHENTICATED' || err.code === 'GOOGLE_AUTH_REQUIRED' ? 401
      : err.code === 'SCRIPT_NOT_FOUND' ? 404
      : err.code === 'PERMISSION_DENIED' ? 403
      : err.code === 'RATE_LIMITED' ? 429
      : err.code === 'REMOTE_CONFLICT' ? 409
      : 400;
    logger.warn('api error', { errorCode: err.code, status });
    return NextResponse.json(err.toResponse(), { status });
  }
  logger.error('api unexpected error', { meta: { msg: err instanceof Error ? err.message : String(err) } });
  return NextResponse.json(fail('INTERNAL_ERROR'), { status: 500 });
}
