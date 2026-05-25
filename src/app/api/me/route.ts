import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { requireAuth, errorToResponse } from '@/lib/api-guard';
import { prisma } from '@/lib/db/prisma';
import { decrypt } from '@/lib/auth/crypto';
import { buildOAuthClient } from '@/lib/auth/google-oauth';
import { getSession } from '@/lib/auth/session';
import { ok } from '@/lib/errors';

void google;

export async function GET() {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;
  try {
    const user = await prisma.user.findUnique({
      where: { id: guard.userId },
      select: { email: true, name: true, avatarUrl: true, createdAt: true },
    });
    const counts = await prisma.scriptProject.count({ where: { userId: guard.userId } });
    const snapshotCount = await prisma.projectSnapshot.count({
      where: { project: { userId: guard.userId } },
    });
    return NextResponse.json(ok({ user, projectCount: counts, snapshotCount }));
  } catch (err) {
    return errorToResponse(err);
  }
}

// DELETE /api/me — 刪除帳號與所有本地資料 + 撤銷 Google OAuth token
export async function DELETE() {
  const guard = await requireAuth();
  if (guard instanceof NextResponse) return guard;

  // 1) 嘗試撤銷 Google token（best effort，失敗也繼續刪本地）
  try {
    const tokenRow = await prisma.oAuthToken.findUnique({
      where: { userId_provider: { userId: guard.userId, provider: 'google' } },
    });
    if (tokenRow) {
      const refreshToken = decrypt(tokenRow.encryptedRefreshToken);
      const oauth = buildOAuthClient();
      oauth.setCredentials({ refresh_token: refreshToken });
      await oauth.revokeToken(refreshToken).catch(() => undefined);
    }
  } catch {
    // 忽略，繼續刪本地
  }

  // 2) 刪本地資料 (cascade 由 schema onDelete: Cascade 處理)
  await prisma.user.delete({ where: { id: guard.userId } });

  // 3) 銷毀 session
  const session = await getSession();
  session.destroy();

  return NextResponse.json(ok({ deleted: true }));
}
