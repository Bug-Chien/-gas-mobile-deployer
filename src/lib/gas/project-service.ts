import 'server-only';
import { getScriptClient } from './client';
import { validateFilesForUpdate, type GasApiFile } from './manifest-guard';
import { translateGoogleError } from './errors-translate';
import { AppError } from '@/lib/errors';
import { prisma } from '@/lib/db/prisma';
import { DEFAULT_CODE_GS, DEFAULT_MANIFEST } from './file-mapper';

// 儲存路徑唯一入口 — route handler 必須走這裡。
// Snapshot 寫入 ProjectSnapshot 表（規格書 R1 第 6 點）。

type SnapshotReason = 'open' | 'pre_save' | 'post_save' | 'manual';

async function ensureProjectRecord(
  userId: string,
  scriptId: string,
  title: string,
): Promise<{ id: string }> {
  return prisma.scriptProject.upsert({
    where: { userId_scriptId: { userId, scriptId } },
    create: { userId, scriptId, title },
    update: { title, lastOpenedAt: new Date() },
    select: { id: true },
  });
}

async function writeSnapshot(
  projectRecordId: string,
  files: GasApiFile[],
  reason: SnapshotReason,
): Promise<void> {
  await prisma.projectSnapshot.create({
    data: { projectId: projectRecordId, files: JSON.stringify(files), reason },
  });
}

function normalizeFiles(raw: Array<{ name?: string | null; type?: string | null; source?: string | null }>): GasApiFile[] {
  return raw.map((f) => ({
    name: f.name ?? '',
    type: (f.type ?? 'SERVER_JS') as GasApiFile['type'],
    source: f.source ?? '',
  }));
}

export const AppsScriptProjectService = {
  async createProject(userId: string, title: string): Promise<{ scriptId: string }> {
    const script = await getScriptClient(userId);
    try {
      const res = await script.projects.create({ requestBody: { title } });
      const scriptId = res.data.scriptId;
      if (!scriptId) throw new AppError('INTERNAL_ERROR', 'no scriptId returned');

      // Google 預設 manifest 沒有 webapp 區塊，會導致部署變成 Library 而非 Web App。
      // 立刻 seed 我們的預設檔案（含 webapp.executeAs/access）讓新專案就能部署為 Web App。
      const seedFiles = [DEFAULT_MANIFEST, DEFAULT_CODE_GS];
      await script.projects.updateContent({ scriptId, requestBody: { files: seedFiles } });

      const project = await ensureProjectRecord(userId, scriptId, title);
      await writeSnapshot(project.id, seedFiles, 'open');
      return { scriptId };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw translateGoogleError(err);
    }
  },

  // 給 deploy 頁的「補上 Web App 設定」用：把現有 manifest 注入 webapp 區塊後存回。
  // 走 updateContent 必然通過 validate。
  async ensureWebAppManifest(userId: string, scriptId: string): Promise<{ patched: boolean }> {
    const { files } = await this.getContent(userId, scriptId);
    const manifestIdx = files.findIndex((f) => f.type === 'JSON' && f.name === 'appsscript');
    if (manifestIdx < 0) throw new AppError('MISSING_MANIFEST');
    let manifest: Record<string, unknown>;
    try { manifest = JSON.parse(files[manifestIdx].source); }
    catch { throw new AppError('INVALID_MANIFEST'); }
    if (manifest.webapp && typeof manifest.webapp === 'object') {
      return { patched: false };
    }
    manifest.webapp = { executeAs: 'USER_DEPLOYING', access: 'ANYONE' };
    const patched = [...files];
    patched[manifestIdx] = {
      ...files[manifestIdx],
      source: JSON.stringify(manifest, null, 2),
    };
    await this.updateContent(userId, scriptId, patched);
    return { patched: true };
  },

  async getContent(
    userId: string,
    scriptId: string,
  ): Promise<{ files: GasApiFile[]; title: string; updateTime: string | null }> {
    const script = await getScriptClient(userId);
    try {
      const [contentRes, metaRes] = await Promise.all([
        script.projects.getContent({ scriptId }),
        script.projects.get({ scriptId }),
      ]);
      const files = normalizeFiles(contentRes.data.files ?? []);
      const title = metaRes.data.title ?? scriptId;
      const updateTime = metaRes.data.updateTime ?? null;
      const project = await ensureProjectRecord(userId, scriptId, title);
      await writeSnapshot(project.id, files, 'open');
      return { files, title, updateTime };
    } catch (err) {
      throw translateGoogleError(err);
    }
  },

  async getRemoteUpdateTime(userId: string, scriptId: string): Promise<string | null> {
    const script = await getScriptClient(userId);
    try {
      const res = await script.projects.get({ scriptId });
      return res.data.updateTime ?? null;
    } catch (err) {
      throw translateGoogleError(err);
    }
  },

  async updateContent(
    userId: string,
    scriptId: string,
    files: GasApiFile[],
    /** 前端讀取時的 updateTime，傳入則做衝突偵測；省略代表強制覆蓋。 */
    expectedUpdateTime?: string | null,
  ): Promise<{ files: GasApiFile[]; updateTime: string | null }> {
    // R1 紅線：強制 validate
    const v = validateFilesForUpdate(files);
    if (!v.ok) throw new AppError(v.code, v.detail);

    // 衝突偵測：呼叫 update 之前再讀一次 updateTime 比對
    if (expectedUpdateTime) {
      const remoteUpdateTime = await this.getRemoteUpdateTime(userId, scriptId);
      if (remoteUpdateTime && remoteUpdateTime !== expectedUpdateTime) {
        throw new AppError(
          'REMOTE_CONFLICT',
          `expected ${expectedUpdateTime}, remote ${remoteUpdateTime}`,
        );
      }
    }

    // pre-save snapshot：在呼叫 Google API 之前先存一份送過去的內容
    const project = await prisma.scriptProject.findUnique({
      where: { userId_scriptId: { userId, scriptId } },
      select: { id: true },
    });
    if (project) await writeSnapshot(project.id, files, 'pre_save');

    const script = await getScriptClient(userId);
    try {
      const res = await script.projects.updateContent({
        scriptId,
        requestBody: { files },
      });
      const returned = normalizeFiles(res.data.files ?? []);
      const newUpdateTime = await this.getRemoteUpdateTime(userId, scriptId);
      if (project) {
        await writeSnapshot(project.id, returned, 'post_save');
        await prisma.scriptProject.update({
          where: { id: project.id },
          data: { lastSyncedAt: new Date() },
        });
      }
      return { files: returned, updateTime: newUpdateTime };
    } catch (err) {
      // 失敗：不改 lastSyncedAt、不寫 post_save snapshot，pre_save 已保留
      throw translateGoogleError(err);
    }
  },

  async listRecent(userId: string, limit = 10) {
    return prisma.scriptProject.findMany({
      where: { userId },
      orderBy: { lastOpenedAt: 'desc' },
      take: limit,
      select: {
        scriptId: true,
        title: true,
        lastOpenedAt: true,
        lastSyncedAt: true,
      },
    });
  },

  async touchOpened(userId: string, scriptId: string): Promise<void> {
    await prisma.scriptProject.update({
      where: { userId_scriptId: { userId, scriptId } },
      data: { lastOpenedAt: new Date() },
    });
  },
};
