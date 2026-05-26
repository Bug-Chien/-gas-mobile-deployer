'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import CodeMirror from '@uiw/react-codemirror';
import { ErrorBox, type ApiErrorPayload } from '@/app/_components/error-box';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { json } from '@codemirror/lang-json';
import { toDisplayName, fromDisplayName, DEFAULT_MANIFEST } from '@/lib/gas/file-mapper';
import { ManifestForm } from './_components/manifest-form';
import { TriggerDialog } from './_components/trigger-dialog';
import { RunPanel } from './_components/run-panel';

type GasFile = { name: string; type: 'SERVER_JS' | 'HTML' | 'JSON'; source: string };

type Props = {
  scriptId: string;
  initialTitle: string;
  initialFiles: GasFile[];
  initialUpdateTime: string | null;
  loadError: string | null;
};

function langFor(type: GasFile['type']) {
  if (type === 'HTML') return html();
  if (type === 'JSON') return json();
  return javascript();
}

function isManifest(f: GasFile) {
  return f.type === 'JSON' && f.name === 'appsscript';
}

export function EditorClient({ scriptId, initialTitle, initialFiles, initialUpdateTime, loadError }: Props) {
  const router = useRouter();
  const [files, setFiles] = useState<GasFile[]>(initialFiles);
  const [knownUpdateTime, setKnownUpdateTime] = useState<string | null>(initialUpdateTime);
  const [forceOverwrite, setForceOverwrite] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [apiError, setApiError] = useState<ApiErrorPayload | null>(null);
  const [showFiles, setShowFiles] = useState(false);
  const [manifestView, setManifestView] = useState<'form' | 'raw'>('form');
  const [showTrigger, setShowTrigger] = useState(false);
  const [showRun, setShowRun] = useState(false);
  const [triggerHint, setTriggerHint] = useState<string | null>(null);

  const active = files[activeIdx];
  const hasManifest = useMemo(() => files.some(isManifest), [files]);

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const updateActive = useCallback((source: string) => {
    setFiles((prev) => prev.map((f, i) => (i === activeIdx ? { ...f, source } : f)));
    setDirty(true);
  }, [activeIdx]);

  function handleAddFile() {
    const raw = window.prompt('新檔名（含副檔名，例如 Helper.gs / Index.html）：');
    if (!raw) return;
    const parsed = fromDisplayName(raw.trim());
    if (files.some((f) => f.name === parsed.name && f.type === parsed.type)) {
      setMsg({ kind: 'err', text: '檔名已存在' });
      return;
    }
    const initSource = parsed.type === 'SERVER_JS'
      ? `function ${parsed.name.toLowerCase()}() {\n  // TODO\n}\n`
      : parsed.type === 'HTML'
      ? '<!DOCTYPE html>\n<html><body>Hello</body></html>\n'
      : '{}\n';
    setFiles((prev) => [...prev, { name: parsed.name, type: parsed.type, source: initSource }]);
    setActiveIdx(files.length);
    setDirty(true);
  }

  function handleDelete() {
    if (!active) return;
    if (isManifest(active)) { setMsg({ kind: 'err', text: '不能刪除 appsscript.json' }); return; }
    if (files.length <= 1) { setMsg({ kind: 'err', text: '至少要保留一個檔案' }); return; }
    if (!window.confirm(`刪除 ${toDisplayName(active)}？`)) return;
    const next = files.filter((_, i) => i !== activeIdx);
    setFiles(next);
    setActiveIdx(Math.max(0, activeIdx - 1));
    setDirty(true);
  }

  function handleRename() {
    if (!active) return;
    if (isManifest(active)) { setMsg({ kind: 'err', text: 'appsscript.json 不可改名' }); return; }
    const raw = window.prompt('新檔名：', toDisplayName(active));
    if (!raw) return;
    const parsed = fromDisplayName(raw.trim());
    if (files.some((f, i) => i !== activeIdx && f.name === parsed.name && f.type === parsed.type)) {
      setMsg({ kind: 'err', text: '檔名已存在' });
      return;
    }
    setFiles((prev) => prev.map((f, i) => (i === activeIdx ? { ...f, ...parsed } : f)));
    setDirty(true);
  }

  function handleAddManifest() {
    if (hasManifest) return;
    setFiles((prev) => [DEFAULT_MANIFEST, ...prev]);
    setActiveIdx(0);
    setDirty(true);
  }

  async function handleSave() {
    setMsg(null);
    setApiError(null);
    setBusy(true);
    try {
      const r = await fetch(`/api/projects/${scriptId}/content`, {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          files,
          ...(forceOverwrite ? {} : { expectedUpdateTime: knownUpdateTime ?? undefined }),
        }),
      });
      const j = await r.json();
      if (!j.success) {
        // R1：失敗不污染本地狀態 — 保留 dirty 與編輯內容
        setApiError(j.error ?? { message: '儲存失敗' });
        return;
      }
      // 成功才把 dirty 設 false
      setFiles(j.data.files);
      setKnownUpdateTime(j.data.updateTime ?? null);
      setForceOverwrite(false);
      setDirty(false);
      setMsg({ kind: 'ok', text: '已儲存到 GAS HEAD' });
    } catch (e) {
      setApiError({ message: e instanceof Error ? e.message : '網路錯誤' });
    } finally { setBusy(false); }
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-md px-4 py-12">
        <p className="text-sm text-red-700">{loadError}</p>
        <button onClick={() => router.push('/')} className="mt-4 rounded-md border px-4 py-2 text-sm">回首頁</button>
      </main>
    );
  }

  return (
    <main className="flex h-screen flex-col">
      {/* 上方列 */}
      <header className="flex items-center justify-between border-b bg-white px-3 py-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('/')} className="text-neutral-500 active:text-neutral-900">←</button>
            <h1 className="truncate text-sm font-semibold">{initialTitle}</h1>
          </div>
          <p className="truncate font-mono text-[10px] text-neutral-400">{scriptId}</p>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] text-amber-800">未儲存</span>}
          <button
            onClick={handleSave}
            disabled={busy || !dirty}
            className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs text-white disabled:opacity-40"
          >
            {busy ? '儲存中…' : '儲存'}
          </button>
        </div>
      </header>

      {/* 檔案 tab + 抽屜 */}
      <div className="flex items-center gap-1 overflow-x-auto border-b bg-neutral-50 px-2 py-1">
        <button
          onClick={() => setShowFiles((s) => !s)}
          className="shrink-0 rounded-md border px-2 py-1 text-xs"
        >☰ 檔案</button>
        {files.map((f, i) => (
          <button
            key={`${f.type}:${f.name}`}
            onClick={() => setActiveIdx(i)}
            className={`shrink-0 rounded-md px-2 py-1 text-xs ${i === activeIdx ? 'bg-neutral-900 text-white' : 'border bg-white'}`}
          >
            {toDisplayName(f)}
          </button>
        ))}
      </div>

      {showFiles && (
        <div className="border-b bg-white p-2">
          <div className="flex flex-wrap gap-2">
            <button onClick={handleAddFile} className="rounded-md border px-2 py-1 text-xs">+ 新檔案</button>
            <button onClick={handleRename} className="rounded-md border px-2 py-1 text-xs">重新命名</button>
            <button onClick={handleDelete} className="rounded-md border px-2 py-1 text-xs text-red-600">刪除</button>
            {!hasManifest && (
              <button onClick={handleAddManifest} className="rounded-md border px-2 py-1 text-xs text-amber-700">+ 補上 appsscript.json</button>
            )}
            <button onClick={() => setShowTrigger(true)} className="rounded-md border px-2 py-1 text-xs">+ 新增觸發器</button>
            <button onClick={() => setShowRun(true)} className="rounded-md border px-2 py-1 text-xs">▶ 執行函式</button>
            <a
              href={`https://script.google.com/d/${scriptId}/edit`}
              target="_blank"
              rel="noreferrer"
              className="rounded-md border px-2 py-1 text-xs"
            >🔗 開啟原生編輯器</a>
          </div>
        </div>
      )}

      {triggerHint && (
        <div className="border-b bg-blue-50 px-3 py-2 text-xs text-blue-900">
          <p className="font-semibold">已加入觸發器程式碼，下一步：</p>
          <pre className="mt-1 whitespace-pre-wrap break-words text-[11px] leading-relaxed">{triggerHint}</pre>
          <button onClick={() => setTriggerHint(null)} className="mt-1 text-[11px] text-blue-700">關閉</button>
        </div>
      )}

      {!hasManifest && (
        <div className="border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          ⚠ 專案缺少 appsscript.json，儲存會被阻擋。請從「檔案」選單補上。
        </div>
      )}

      {/* manifest 的視覺化 / JSON 切換 */}
      {active && isManifest(active) && (
        <div className="flex gap-1 border-b bg-neutral-50 px-2 py-1 text-xs">
          <button
            onClick={() => setManifestView('form')}
            className={`rounded px-2 py-0.5 ${manifestView === 'form' ? 'bg-neutral-900 text-white' : 'text-neutral-600'}`}
          >視覺化</button>
          <button
            onClick={() => setManifestView('raw')}
            className={`rounded px-2 py-0.5 ${manifestView === 'raw' ? 'bg-neutral-900 text-white' : 'text-neutral-600'}`}
          >JSON</button>
        </div>
      )}

      {/* 編輯區 */}
      <div className="flex-1 overflow-auto">
        {active ? (
          isManifest(active) && manifestView === 'form' ? (
            <ManifestForm source={active.source} onChange={updateActive} />
          ) : (
            <CodeMirror
              value={active.source}
              onChange={updateActive}
              extensions={[langFor(active.type)]}
              theme="light"
              basicSetup={{ lineNumbers: true, foldGutter: true, highlightActiveLine: true }}
              style={{ fontSize: 13 }}
            />
          )
        ) : (
          <p className="p-4 text-sm text-neutral-500">沒有檔案</p>
        )}
      </div>

      {/* 訊息列 */}
      {msg && (
        <div className={`border-t px-3 py-2 text-xs ${msg.kind === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
          {msg.text}
        </div>
      )}
      <RunPanel scriptId={scriptId} files={files} open={showRun} onClose={() => setShowRun(false)} />

      <TriggerDialog
        scriptId={scriptId}
        files={files}
        open={showTrigger}
        onClose={() => setShowTrigger(false)}
        onApply={(nextFiles, targetFileName, hint) => {
          setFiles(nextFiles);
          const idx = nextFiles.findIndex((f) => f.type === 'SERVER_JS' && f.name === targetFileName);
          if (idx >= 0) setActiveIdx(idx);
          setDirty(true);
          setTriggerHint(hint);
        }}
      />

      {apiError && (
        <div className="border-t bg-white px-3 py-2">
          <ErrorBox error={apiError} />
          {apiError.code === 'REMOTE_CONFLICT' && (
            <button
              onClick={() => {
                if (!window.confirm('確定要強制覆蓋遠端的最新版本？\n遠端的變更會被本地內容取代。')) return;
                setForceOverwrite(true);
                handleSave();
              }}
              className="mt-2 rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-700"
            >
              我已備份遠端內容，強制以本地覆蓋
            </button>
          )}
        </div>
      )}

      {/* 底部工具列（規格書 §9.4：手機 UX 重點） */}
      <footer className="grid grid-cols-4 border-t bg-white text-xs">
        <button onClick={() => setShowFiles(true)} className="py-3 active:bg-neutral-100">檔案</button>
        <button onClick={handleSave} disabled={!dirty || busy} className="py-3 active:bg-neutral-100 disabled:text-neutral-300">儲存</button>
        <button
          onClick={() => {
            if (dirty && !window.confirm('還有未儲存的變更。建立版本只會凍結已儲存到 HEAD 的內容，要繼續嗎？')) return;
            router.push(`/editor/${scriptId}/deploy`);
          }}
          className="py-3 active:bg-neutral-100"
        >版本</button>
        <button
          onClick={() => {
            if (dirty && !window.confirm('還有未儲存的變更。建議先儲存再部署，要繼續嗎？')) return;
            router.push(`/editor/${scriptId}/deploy`);
          }}
          className="py-3 active:bg-neutral-100"
        >部署</button>
      </footer>
    </main>
  );
}
