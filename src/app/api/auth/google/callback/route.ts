import { NextRequest, NextResponse } from 'next/server';
import { buildOAuthClient, GOOGLE_SCOPES } from '@/lib/auth/google-oauth';
import { getSession } from '@/lib/auth/session';
import { prisma } from '@/lib/db/prisma';
import { encrypt } from '@/lib/auth/crypto';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const error = url.searchParams.get('error');
  const session = await getSession();
  const expectedState = (session as unknown as { oauthState?: string }).oauthState;

  if (error) return NextResponse.redirect(new URL(`/?error=${error}`, req.url));
  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(new URL('/?error=invalid_state', req.url));
  }

  const oauth = buildOAuthClient();
  const { tokens } = await oauth.getToken(code);
  if (!tokens.id_token || !tokens.refresh_token) {
    // refresh_token 只在首次授權 + prompt=consent 時回傳。
    // 若拿不到，引導使用者到 https://myaccount.google.com/permissions 移除授權後重試。
    return NextResponse.redirect(new URL('/?error=no_refresh_token', req.url));
  }

  // 解 id_token 取得使用者
  oauth.setCredentials(tokens);
  const ticket = await oauth.verifyIdToken({
    idToken: tokens.id_token,
    audience: process.env.GOOGLE_OAUTH_CLIENT_ID!,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub) {
    return NextResponse.redirect(new URL('/?error=invalid_id_token', req.url));
  }

  const user = await prisma.user.upsert({
    where: { googleSub: payload.sub },
    create: {
      googleSub: payload.sub,
      email: payload.email ?? '',
      name: payload.name ?? null,
      avatarUrl: payload.picture ?? null,
    },
    update: {
      email: payload.email ?? '',
      name: payload.name ?? null,
      avatarUrl: payload.picture ?? null,
    },
  });

  await prisma.oAuthToken.upsert({
    where: { userId_provider: { userId: user.id, provider: 'google' } },
    create: {
      userId: user.id,
      provider: 'google',
      encryptedRefreshToken: encrypt(tokens.refresh_token),
      scope: GOOGLE_SCOPES.join(' '),
    },
    update: {
      encryptedRefreshToken: encrypt(tokens.refresh_token),
      scope: GOOGLE_SCOPES.join(' '),
    },
  });

  session.userId = user.id;
  session.email = user.email;
  session.name = user.name ?? undefined;
  (session as unknown as { oauthState?: string }).oauthState = undefined;
  await session.save();

  return NextResponse.redirect(new URL('/', req.url));
}
