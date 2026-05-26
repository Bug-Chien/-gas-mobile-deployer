'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  detectAllFunctionsWithMeta,
  type DetectedFunction,
  type EntryPointKind,
} from '@/lib/gas/function-detector';

type GasFile = { name: string; type: 'SERVER_JS' | 'HTML' | 'JSON'; source: string };

type Deployment = { deploymentId: string; webAppUrl?: string; versionNumber?: number };

type Props = {
  scriptId: string;
  files: GasFile[];
  open: boolean;
  onClose: () => void;
};

const KIND_LABEL: Record<EntryPointKind, string> = {
  'web-app-get': '🌐 Web App GET',
  'web-app-post': '📮 Web App POST',
  'simple-trigger': '⚡ 簡易觸發器',
  'install-trigger': '🔔 安裝型觸發器',
  'helper': '🛠 Helper',
  'plain': '函式',
};

const KIND_HINT: Record<EntryPointKind, string> = {
  'web-app-get': '可直接在瀏覽器開 Web App URL 觸發此函式。',
  'web-app-post': '需 POST 請求觸發。可用 curl 測試。',
  'simple-trigger': '由 Apps Script 自動呼叫，無需安裝。可在原生編輯器手動執行測試。',
  'install-trigger': '需要安裝觸發器才會自動呼叫。可手動執行測試。',
  'helper': '我們產出的工具函式，第一次需手動執行一次。',
  'plain': '一般函式。可在原生編輯器手動執行。',
};

export function RunPanel({ scriptId, files, open, onClose }: Props) {
  const [deployments, setDeployments] = useState<Deployment[] | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const detected = useMemo(() => detectAllFunctionsWithMeta(files), [files]);

  useEffect(() => {
    if (!open) return;
    fetch(`/api/projects/${scriptId}/deployments`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setDeployments(j.data.items);
      })
      .catch(() => undefined);
  }, [open, scriptId]);

  if (!open) return null;

  const webAppUrl = deployments?.find((d) => d.webAppUrl)?.webAppUrl;

  function openInEditor(fn: string) {
    window.open(`https://script.google.com/d/${scriptId}/edit?function=${encodeURIComponent(fn)}`, '_blank', 'noreferrer');
  }

  async function copyCurl(fn: 'doPost') {
    if (!webAppUrl) return;
    const cmd = `curl -X POST '${webAppUrl}' \\\n  -H 'Content-Type: application/json' \\\n  -d '{}'`;
    try {
      await navigator.clipboard.writeText(cmd);
      setMsg('已複製 curl 指令');
    } catch {
      setMsg('複製失敗，請手動選取');
    }
    void fn;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-xl sm:rounded-xl bg-white shadow-xl">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-white px-4 py-3">
          <h2 className="text-base font-semibold">▶ 執行函式</h2>
          <button onClick={onClose} className="text-neutral-500">✕</button>
        </header>

        <div className="space-y-3 p-4 text-sm">
          <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
            <p className="font-semibold">關於「執行」</p>
            <p className="mt-1">
              Apps Script API 不允許外部工具直接執行任意函式（需要使用者把專案連到平台 GCP 等繁複設定）。本面板提供：
            </p>
            <ul className="ml-4 mt-1 list-disc">
              <li><b>doGet</b>：直接打 Web App URL 即可執行</li>
              <li><b>doPost</b>：產 curl 指令給你測試</li>
              <li><b>其他函式</b>：一鍵跳原生編輯器並預選好，按 ▶ 一下就執行</li>
            </ul>
          </div>

          {detected.length === 0 ? (
            <p className="text-sm text-neutral-500">沒有偵測到任何函式。在 .gs 檔內加入 <code>function foo() {'{}'}</code> 就會出現。</p>
          ) : (
            <ul className="space-y-2">
              {detected.map((fn) => (
                <li key={fn.name} className="rounded-lg border bg-white p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <code className="text-sm font-semibold">{fn.name}()</code>
                        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-600">
                          {KIND_LABEL[fn.kind]}
                        </span>
                      </div>
                      <p className="mt-0.5 text-[10px] text-neutral-400">{fn.fileName}.gs</p>
                    </div>
                  </div>
                  <p className="mt-1 text-[11px] text-neutral-500">{KIND_HINT[fn.kind]}</p>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {fn.kind === 'web-app-get' && (
                      webAppUrl ? (
                        <a
                          href={webAppUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md bg-neutral-900 px-2.5 py-1 text-xs text-white"
                        >▶ 打開 Web App</a>
                      ) : (
                        <span className="text-[11px] text-neutral-400">尚未建立 Web App 部署</span>
                      )
                    )}
                    {fn.kind === 'web-app-post' && (
                      webAppUrl ? (
                        <button
                          onClick={() => copyCurl('doPost')}
                          className="rounded-md bg-neutral-900 px-2.5 py-1 text-xs text-white"
                        >📋 複製 curl POST 指令</button>
                      ) : (
                        <span className="text-[11px] text-neutral-400">尚未建立 Web App 部署</span>
                      )
                    )}
                    <button
                      onClick={() => openInEditor(fn.name)}
                      className="rounded-md border px-2.5 py-1 text-xs"
                    >🔗 在原生編輯器執行</button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {webAppUrl && (
            <details className="rounded-md border bg-neutral-50 p-3 text-xs">
              <summary className="cursor-pointer font-medium">目前 Web App URL</summary>
              <code className="mt-2 block break-all rounded bg-white p-2 text-[11px]">{webAppUrl}</code>
            </details>
          )}

          {msg && (
            <div className="rounded-md border border-emerald-300 bg-emerald-50 p-2 text-xs text-emerald-800">{msg}</div>
          )}
        </div>
      </div>
    </div>
  );
}
