import { NextResponse } from 'next/server';
import { requirePocAccess } from '@/lib/poc-guard';
import { AppsScriptProjectService } from '@/lib/gas/project-service';
import { AppsScriptVersionService } from '@/lib/gas/version-service';
import { AppsScriptDeploymentService } from '@/lib/gas/deployment-service';
import { DEFAULT_CODE_GS, DEFAULT_MANIFEST } from '@/lib/gas/file-mapper';
import { AppError, fail, ok } from '@/lib/errors';

// Sprint 0 PoC：把七支 API 各跑一次，回傳結果。
// POST /api/poc/run
export async function POST() {
  const guard = await requirePocAccess();
  if (guard instanceof NextResponse) return guard;
  const { userId } = guard;

  const trail: Record<string, unknown> = {};
  try {
    // 1. create
    const created = await AppsScriptProjectService.createProject(
      userId,
      `PoC ${new Date().toISOString()}`,
    );
    trail.create = created;

    // 2. updateContent (HEAD)
    const files = [DEFAULT_MANIFEST, DEFAULT_CODE_GS];
    const updated = await AppsScriptProjectService.updateContent(
      userId,
      created.scriptId,
      files,
    );
    trail.updateContent = { fileCount: updated.files.length };

    // 3. getContent
    const got = await AppsScriptProjectService.getContent(userId, created.scriptId);
    trail.getContent = { fileCount: got.files.length, title: got.title };

    // 4. versions.create
    const v1 = await AppsScriptVersionService.create(userId, created.scriptId, 'PoC v1');
    trail.versionCreate = v1;

    // 5. versions.list
    const versions = await AppsScriptVersionService.list(userId, created.scriptId);
    trail.versionList = { count: versions.length };

    // 6. deployments.create
    const dep = await AppsScriptDeploymentService.create(
      userId,
      created.scriptId,
      v1.versionNumber,
      'PoC web app',
    );
    trail.deploymentCreate = dep;

    // 7. update flow: 再儲存一次、再建新 version、再 update existing deployment
    const files2 = [
      DEFAULT_MANIFEST,
      {
        ...DEFAULT_CODE_GS,
        source: DEFAULT_CODE_GS.source.replace('Hello', 'Hello (updated)'),
      },
    ];
    await AppsScriptProjectService.updateContent(userId, created.scriptId, files2);
    const v2 = await AppsScriptVersionService.create(userId, created.scriptId, 'PoC v2');
    const dep2 = await AppsScriptDeploymentService.update(
      userId,
      created.scriptId,
      dep.deploymentId,
      v2.versionNumber,
      'PoC web app v2',
    );
    trail.deploymentUpdate = dep2;

    return NextResponse.json(ok(trail));
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json({ ...err.toResponse(), trail }, { status: 400 });
    }
    return NextResponse.json(
      { ...fail('INTERNAL_ERROR', String(err)), trail },
      { status: 500 },
    );
  }
}
