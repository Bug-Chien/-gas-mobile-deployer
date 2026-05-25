import 'server-only';
import { getScriptClient } from './client';
import { translateGoogleError } from './errors-translate';
import { AppError } from '@/lib/errors';

export const AppsScriptVersionService = {
  async list(userId: string, scriptId: string) {
    const script = await getScriptClient(userId);
    try {
      const res = await script.projects.versions.list({ scriptId });
      return res.data.versions ?? [];
    } catch (err) {
      throw translateGoogleError(err);
    }
  },

  async create(userId: string, scriptId: string, description: string) {
    const script = await getScriptClient(userId);
    try {
      const res = await script.projects.versions.create({
        scriptId,
        requestBody: { description },
      });
      if (typeof res.data.versionNumber !== 'number') {
        throw new AppError('VERSION_CREATE_FAILED', 'no versionNumber returned');
      }
      return { versionNumber: res.data.versionNumber, description };
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw translateGoogleError(err);
    }
  },
};
