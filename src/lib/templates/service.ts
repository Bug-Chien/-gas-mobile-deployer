import 'server-only';
import { google } from 'googleapis';
import { getScriptClient } from '@/lib/gas/client';
import { AppsScriptProjectService } from '@/lib/gas/project-service';
import { validateFilesForUpdate } from '@/lib/gas/manifest-guard';
import { translateGoogleError } from '@/lib/gas/errors-translate';
import { AppError } from '@/lib/errors';
import { prisma } from '@/lib/db/prisma';
import { applyTemplateSettings, getTemplate } from './registry';

void google; // 保留依賴宣告，未來若 service 內直接呼叫 googleapis 會用到

export const TemplateService = {
  async createProjectFromTemplate(
    userId: string,
    templateId: string,
    title: string,
    settings: Record<string, string>,
  ): Promise<{ scriptId: string }> {
    const tpl = getTemplate(templateId);
    if (!tpl) throw new AppError('INTERNAL_ERROR', `template not found: ${templateId}`);

    // 必填檢查
    const missing = tpl.requiredSettings
      .filter((s) => s.required && !settings[s.key]?.trim())
      .map((s) => s.label);
    if (missing.length > 0) {
      throw new AppError('INTERNAL_ERROR', `missing settings: ${missing.join(', ')}`);
    }

    // 套用模板設定
    const files = applyTemplateSettings(tpl.files, settings);
    // R1 紅線：本地先 validate 一次，省一趟 round trip
    const v = validateFilesForUpdate(files);
    if (!v.ok) throw new AppError(v.code, v.detail);

    // 用 service 建立空專案（會 seed default，但等等就被覆蓋）
    const script = await getScriptClient(userId);
    let scriptId: string;
    try {
      const res = await script.projects.create({ requestBody: { title } });
      scriptId = res.data.scriptId ?? '';
      if (!scriptId) throw new AppError('INTERNAL_ERROR', 'no scriptId returned');
    } catch (err) {
      throw translateGoogleError(err);
    }

    // 直接以模板 files 覆蓋（也會經過 validate via service）
    await AppsScriptProjectService.updateContent(userId, scriptId, files);

    // 記下 templateId 給 deploy 頁顯示對應教學
    await prisma.scriptProject.upsert({
      where: { userId_scriptId: { userId, scriptId } },
      create: { userId, scriptId, title, templateId },
      update: { title, templateId, lastOpenedAt: new Date() },
    });

    return { scriptId };
  },

  async getProjectTemplateId(userId: string, scriptId: string): Promise<string | null> {
    const row = await prisma.scriptProject.findUnique({
      where: { userId_scriptId: { userId, scriptId } },
      select: { templateId: true },
    });
    return row?.templateId ?? null;
  },
};
