import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { buildAuthUrl } from '@/lib/auth/google-oauth';
import { getSession } from '@/lib/auth/session';

export async function GET() {
  const state = randomBytes(16).toString('hex');
  const session = await getSession();
  // 用 session 存 state 防 CSRF
  (session as unknown as { oauthState?: string }).oauthState = state;
  await session.save();
  return NextResponse.redirect(buildAuthUrl(state));
}
