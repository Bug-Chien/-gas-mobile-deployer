'use client';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ErrorBox, type ApiErrorPayload } from '@/app/_components/error-box';

type Version = { versionNumber?: number; description?: string; createTime?: string };
type Deployment = {
  deploymentId: string;
  versionNumber?: number;
  description?: string;
  webAppUrl?: string;
};

type Loaded = { versions: Version[]; deployments: Deployment[] };

type Hint = { templateName: string | null; postDeployHint: string | null };

// 通用部署引導文案（規格書 §9.8）
const GENERIC_HINT =
  `通用提醒：\n` +
  `1. 第一次開啟 Web App URL 時，Google 會要求授權此 Apps Script，這是正常流程。\n` +
  `2. 若部署為 Web App（USER_DEPLOYING + ANYONE），其他人開連結時是「以你的身分」執行，會用到的 Google 服務都會用你的帳號權限。\n` +
  `3. 要更新內容時記得：先儲存 → 建新版本 → 更新部署，URL 才不會變。`;

export function DeployClient({ scriptId }: { scriptId: string }) {
  const router = useRouter();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ kind: 'ok'; text: string } | null>(null);
  const [error, setError] = useState<ApiErrorPayload | null>(null);
  function showErr(j: { error?: ApiErrorPayload; success?: boolean }, fallback: string) {
    setError(j.error ?? { message: fallback });
    setMsg(null);
  }
  function showOk(text: string) {
    setMsg({ kind: 'ok', text });
    setError(null);
  }
  const [versionDesc, setVersionDesc] = useState('');
  const [deployDesc, setDeployDesc] = useState('Web App deployment');
  const [hasWebappConfig, setHasWebappConfig] = useState<boolean | null>(null);
  const [hint, setHint] = useState<Hint | null>(null);
  const [justDeployed, setJustDeployed] = useState(false);

  const reload = useCallback(async () => {
    setMsg(null);
    const [vRes, dRes, cRes, hRes] = await Promise.all([
      fetch(`/api/projects/${scriptId}/versions`),
      fetch(`/api/projects/${scriptId}/deployments`),
      fetch(`/api/projects/${scriptId}/content`),
      fetch(`/api/projects/${scriptId}/hint`),
    ]);
    const v = await vRes.json();
    const d = await dRes.json();
    const c = await cRes.json();
    const h = await hRes.json();
    if (h.success) setHint({ templateName: h.data.templateName, postDeployHint: h.data.postDeployHint });
    if (!v.success) { showErr(v, '讀取版本失敗'); return; }
    if (!d.success) { showErr(d, '讀取部署失敗'); return; }
    setLoaded({ versions: v.data.items, deployments: d.data.items });
    // 偵測 manifest 是否含 webapp 區塊
    if (c.success) {
      const manifest = c.data.files.find((f: { name: string; type: string }) => f.type === 'JSON' && f.name === 'appsscript');
      if (manifest) {
        try {
          const parsed = JSON.parse(manifest.source);
          setHasWebappConfig(Boolean(parsed?.webapp));
        } catch { setHasWebappConfig(false); }
      } else { setHasWebappConfig(false); }
    }
  }, [scriptId]);

  useEffect(() => { reload(); }, [reload]);

  async function handleEnsureWebApp() {
    setBusy('ensure-webapp');
    try {
      const r = await fetch(`/api/projects/${scriptId}/ensure-webapp`, { method: 'POST' });
      const j = await r.json();
      if (!j.success) { showErr(j, '補設定失敗'); return; }
      showOk(j.data.patched ? '已補上 webapp 設定，現在可以部署為 Web App' : 'manifest 已有 webapp 設定');
      await reload();
    } finally { setBusy(null); }
  }

  async function handleCreateVersion(): Promise<number | null> {
    if (!versionDesc.trim()) { setError({ message: '請填版本描述' }); return null; }
    setBusy('version');
    try {
      const r = await fetch(`/api/projects/${scriptId}/versions`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ description: versionDesc }),
      });
      const j = await r.json();
      if (!j.success) { showErr(j, '建版本失敗'); return null; }
      showOk(`已建立 version ${j.data.versionNumber}`);
      setVersionDesc('');
      await reload();
      return j.data.versionNumber as number;
    } finally { setBusy(null); }
  }

  async function handleCreateDeployment() {
    // R6：先建新 version，再用它部署
    const versionNumber = await handleCreateVersion();
    if (!versionNumber) return;
    setBusy('deploy-create');
    try {
      const r = await fetch(`/api/projects/${scriptId}/deployments`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ versionNumber, description: deployDesc }),
      });
      const j = await r.json();
      if (!j.success) { showErr(j, '部署失敗'); return; }
      showOk('新部署建立成功');
      setJustDeployed(true);
      await reload();
    } finally { setBusy(null); }
  }

  async function handleUpdateDeployment(d: Deployment) {
    // R6：更新既有部署必須建「新」version
    if (!window.confirm(`要建立新 version 並把 deployment ${d.deploymentId.slice(0, 8)}… 指向新版本？\n(原 Web App URL 維持不變)`)) return;
    const versionNumber = await handleCreateVersion();
    if (!versionNumber) return;
    setBusy(`deploy-update:${d.deploymentId}`);
    try {
      const r = await fetch(`/api/projects/${scriptId}/deployments/${d.deploymentId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ versionNumber, description: d.description ?? 'updated' }),
      });
      const j = await r.json();
      if (!j.success) { showErr(j, '更新部署失敗'); return; }
      showOk(`Deployment 已指向 version ${versionNumber}`);
      setJustDeployed(true);
      await reload();
    } finally { setBusy(null); }
  }

  async function handleDeleteDeployment(d: Deployment) {
    if (!window.confirm(
      `刪除 deployment ${d.deploymentId.slice(0, 12)}…？\n\n` +
      `此動作不可復原。對應的 Web App URL 將立刻失效，任何貼到外部（LINE / 表單 / Sheets）的連結都會壞掉。`,
    )) return;
    setBusy(`deploy-delete:${d.deploymentId}`);
    try {
      const r = await fetch(`/api/projects/${scriptId}/deployments/${d.deploymentId}`, { method: 'DELETE' });
      const j = await r.json();
      if (!j.success) { showErr(j, '刪除失敗'); return; }
      showOk('已刪除部署');
      await reload();
    } finally { setBusy(null); }
  }

  async function copyUrl(url: string) {
    try { await navigator.clipboard.writeText(url); showOk('已複製 Web App URL'); }
    catch { setError({ message: '複製失敗，請手動選取' }); }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-5 sm:py-8">
      <header className="mb-4 flex items-center gap-2">
        <button onClick={() => router.push(`/editor/${scriptId}`)} className="text-neutral-500">←</button>
        <h1 className="text-lg font-semibold">版本與部署</h1>
      </header>

      <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        ⓘ 部署前請確認最新的程式碼已經「儲存」到 GAS HEAD。<br />
        建立新部署或更新部署時，系統會自動先建立 version 再 deploy。
      </p>

      {/* 部署成功教學提示 */}
      {loaded && loaded.deployments.length > 0 && (
        <section
          className={`mt-3 rounded-lg border p-4 ${
            justDeployed ? 'border-emerald-400 bg-emerald-50' : 'border-neutral-200 bg-white'
          }`}
        >
          <h2 className="text-sm font-semibold">
            {justDeployed ? '🎉 部署完成！下一步：' : '下一步教學'}
            {hint?.templateName && (
              <span className="ml-2 rounded bg-neutral-100 px-2 py-0.5 text-[10px] font-normal text-neutral-600">
                {hint.templateName} 模板
              </span>
            )}
          </h2>
          {hint?.postDeployHint && (
            <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-neutral-50 p-3 text-xs leading-relaxed text-neutral-800">
              {hint.postDeployHint}
            </pre>
          )}
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-neutral-500">通用提醒</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words rounded bg-neutral-50 p-3 text-xs leading-relaxed text-neutral-700">
              {GENERIC_HINT}
            </pre>
          </details>
          {justDeployed && (
            <button
              onClick={() => setJustDeployed(false)}
              className="mt-2 text-xs text-emerald-700"
            >我知道了</button>
          )}
        </section>
      )}

      {hasWebappConfig === false && (
        <div className="mt-3 rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-800">
          <p className="font-semibold">⚠ 偵測到 appsscript.json 缺少 <code>webapp</code> 區塊</p>
          <p className="mt-1">沒有這段設定，Google 會把部署當成 <b>Library（資料庫）</b>而不是 Web App，無法取得 <code>/exec</code> URL。</p>
          <button
            onClick={handleEnsureWebApp}
            disabled={!!busy}
            className="mt-2 rounded-md bg-red-700 px-3 py-1.5 text-xs text-white disabled:opacity-50"
          >
            {busy === 'ensure-webapp' ? '修補中…' : '補上 webapp 預設設定（會儲存）'}
          </button>
        </div>
      )}

      {/* 建立 version */}
      <section className="mt-5 rounded-lg border bg-white p-4">
        <h2 className="text-sm font-semibold">建立新版本</h2>
        <p className="mt-1 text-xs text-neutral-500">
          將目前 HEAD 凍結成不可變的 version 快照。建立部署也會自動執行這一步。
        </p>
        <input
          value={versionDesc}
          onChange={(e) => setVersionDesc(e.target.value)}
          placeholder="版本描述，例如：修正 doGet 回應"
          className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
        />
        <button
          onClick={handleCreateVersion}
          disabled={!!busy}
          className="mt-2 rounded-md border px-3 py-1.5 text-xs disabled:opacity-50"
        >
          {busy === 'version' ? '建立中…' : '只建版本（不部署）'}
        </button>
      </section>

      {/* 既有 deployments */}
      <section className="mt-5">
        <h2 className="text-sm font-semibold">既有部署</h2>
        {!loaded ? (
          <p className="mt-2 text-sm text-neutral-500">載入中…</p>
        ) : loaded.deployments.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">尚無部署</p>
        ) : (
          <ul className="mt-2 space-y-3">
            {loaded.deployments.map((d) => (
              <li key={d.deploymentId} className="rounded-lg border bg-white p-3">
                <div className="text-xs font-mono break-all text-neutral-700">{d.deploymentId}</div>
                <div className="mt-1 text-xs text-neutral-500">
                  version: <span className="font-semibold text-neutral-800">{d.versionNumber ?? 'HEAD'}</span>
                  {d.description && <> · {d.description}</>}
                </div>
                {d.webAppUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <a href={d.webAppUrl} target="_blank" rel="noreferrer"
                       className="truncate rounded bg-neutral-100 px-2 py-1 text-[11px] font-mono">
                      {d.webAppUrl}
                    </a>
                    <button onClick={() => copyUrl(d.webAppUrl!)} className="shrink-0 rounded border px-2 py-1 text-xs">複製</button>
                  </div>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    onClick={() => handleUpdateDeployment(d)}
                    disabled={!!busy || !versionDesc.trim()}
                    className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs text-white disabled:opacity-40"
                  >
                    {busy === `deploy-update:${d.deploymentId}` ? '更新中…' : '建新 version 並更新此部署'}
                  </button>
                  <button
                    onClick={() => handleDeleteDeployment(d)}
                    disabled={!!busy}
                    className="rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-700 disabled:opacity-40"
                  >
                    {busy === `deploy-delete:${d.deploymentId}` ? '刪除中…' : '刪除此部署'}
                  </button>
                </div>
                {!versionDesc.trim() && (
                  <p className="mt-1 text-[11px] text-neutral-400">更新需先在上方填版本描述</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 新建 deployment */}
      <section className="mt-5 rounded-lg border bg-white p-4">
        <h2 className="text-sm font-semibold">新建 Web App 部署</h2>
        <p className="mt-1 text-xs text-neutral-500">會產生新的 deployment ID 與 Web App URL。</p>
        <input
          value={deployDesc}
          onChange={(e) => setDeployDesc(e.target.value)}
          placeholder="部署描述"
          className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
        />
        <button
          onClick={handleCreateDeployment}
          disabled={!!busy || !versionDesc.trim()}
          className="mt-2 rounded-md bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-40"
        >
          {busy === 'deploy-create' ? '建立中…' : '建立 version 並部署為 Web App'}
        </button>
        {!versionDesc.trim() && (
          <p className="mt-1 text-[11px] text-neutral-400">先在上方填版本描述</p>
        )}
      </section>

      {/* version 列表 */}
      <section className="mt-5">
        <h2 className="text-sm font-semibold">版本列表</h2>
        {!loaded ? null : loaded.versions.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">尚無版本</p>
        ) : (
          <ul className="mt-2 divide-y rounded-lg border bg-white text-sm">
            {loaded.versions.map((v) => (
              <li key={v.versionNumber} className="px-3 py-2">
                <span className="font-semibold">v{v.versionNumber}</span>
                {v.description && <span className="ml-2 text-neutral-600">{v.description}</span>}
                {v.createTime && (
                  <span className="ml-2 text-[11px] text-neutral-400">
                    {new Date(v.createTime).toLocaleString('zh-TW')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {msg && (
        <div className="mt-5 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800">
          {msg.text}
        </div>
      )}
      <div className="mt-3">
        <ErrorBox error={error} />
      </div>
    </main>
  );
}
