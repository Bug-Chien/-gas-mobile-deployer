import 'server-only';
import type { script_v1 } from 'googleapis';
import { getScriptClient } from './client';
import { translateGoogleError } from './errors-translate';
import { AppError } from '@/lib/errors';

export type DeploymentInfo = {
  deploymentId: string;
  versionNumber?: number;
  description?: string;
  webAppUrl?: string;
};

function parseDeployment(d: script_v1.Schema$Deployment): DeploymentInfo {
  const cfg = d.deploymentConfig;
  const entry = (d.entryPoints ?? []).find((e) => e.entryPointType === 'WEB_APP');
  return {
    deploymentId: d.deploymentId ?? '',
    versionNumber: cfg?.versionNumber ?? undefined,
    description: cfg?.description ?? undefined,
    webAppUrl: entry?.webApp?.url ?? undefined,
  };
}

export const AppsScriptDeploymentService = {
  async list(userId: string, scriptId: string): Promise<DeploymentInfo[]> {
    const script = await getScriptClient(userId);
    try {
      const res = await script.projects.deployments.list({ scriptId });
      return (res.data.deployments ?? []).map(parseDeployment);
    } catch (err) {
      throw translateGoogleError(err);
    }
  },

  async create(
    userId: string,
    scriptId: string,
    versionNumber: number,
    description: string,
  ): Promise<DeploymentInfo> {
    const script = await getScriptClient(userId);
    try {
      const res = await script.projects.deployments.create({
        scriptId,
        requestBody: {
          versionNumber,
          manifestFileName: 'appsscript',
          description,
        },
      });
      return parseDeployment(res.data);
    } catch (err) {
      if (err instanceof AppError) throw err;
      throw translateGoogleError(err);
    }
  },

  async delete(userId: string, scriptId: string, deploymentId: string): Promise<void> {
    const script = await getScriptClient(userId);
    try {
      await script.projects.deployments.delete({ scriptId, deploymentId });
    } catch (err) {
      throw translateGoogleError(err);
    }
  },

  // 規格書 R6：更新既有 Web App 必須帶新 versionNumber。
  async update(
    userId: string,
    scriptId: string,
    deploymentId: string,
    versionNumber: number,
    description: string,
  ): Promise<DeploymentInfo> {
    if (!Number.isInteger(versionNumber) || versionNumber <= 0) {
      throw new AppError('DEPLOYMENT_FAILED', 'updateDeployment requires a new versionNumber');
    }
    const script = await getScriptClient(userId);
    try {
      const res = await script.projects.deployments.update({
        scriptId,
        deploymentId,
        requestBody: {
          deploymentConfig: {
            versionNumber,
            manifestFileName: 'appsscript',
            description,
          },
        },
      });
      return parseDeployment(res.data);
    } catch (err) {
      throw translateGoogleError(err);
    }
  },
};
