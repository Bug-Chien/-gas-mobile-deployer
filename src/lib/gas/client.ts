import { google, script_v1 } from 'googleapis';
import { prisma } from '@/lib/db/prisma';
import { decrypt } from '@/lib/auth/crypto';
import { AppError } from '@/lib/errors';
import { buildOAuthClient } from '@/lib/auth/google-oauth';

// 唯一 GAS client 工廠。Route handler 一律走這裡，不允許直接 new OAuth2。
export async function getScriptClient(userId: string): Promise<script_v1.Script> {
  const tokenRow = await prisma.oAuthToken.findUnique({
    where: { userId_provider: { userId, provider: 'google' } },
  });
  if (!tokenRow) throw new AppError('GOOGLE_AUTH_REQUIRED');

  const refreshToken = decrypt(tokenRow.encryptedRefreshToken);
  const oauth = buildOAuthClient();
  oauth.setCredentials({ refresh_token: refreshToken });

  try {
    await oauth.getAccessToken();
  } catch {
    throw new AppError('GOOGLE_AUTH_REQUIRED');
  }

  return google.script({ version: 'v1', auth: oauth });
}
