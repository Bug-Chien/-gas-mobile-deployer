'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ErrorBox, type ApiErrorPayload } from './error-box';

type RecentItem = {
  scriptId: string;
  title: string;
  lastOpenedAt: string;
  lastSyncedAt: string | null;
};

export function DashboardClient({ recent }: { recent: RecentItem[] }) {
  const router = useRouter();
  const [mode, setMode] = useState<'idle' | 'create' | 'open'>('idle');
  const [title, setTitle] = useState('');
  const [scriptId, setScriptId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ApiErrorPayload | null>(null);

  async function handleCreate() {
    setBusy(true); setError(null);
    try {
      const r = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title }),
      });
      const j = await r.json();
      if (!j.success) { setError(j.error); return; }
      router.push(`/editor/${j.data.scriptId}`);
    } finally { setBusy(false); }
  }

  async function handleOpen() {
    setBusy(true); setError(null);
    try {
      const r = await fetch('/api/projects/open', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scriptId: scriptId.trim() }),
      });
      const j = await r.json();
      if (!j.success) { setError(j.error); return; }
      router.push(`/editor/${j.data.scriptId}`);
    } finally { setBusy(false); }
  }

  return (
    <div className="mt-6 space-y-6">
      <section className="grid grid-cols-2 gap-3">
        <button
          onClick={() => { setMode('create'); setError(null); }}
          className="rounded-lg border bg-white px-4 py-4 text-left shadow-sm active:bg-neutral-50"
        >
          <div className="text-sm font-medium">+ 建立新專案</div>
          <div className="mt-1 text-xs text-neutral-500">在 Google 端建立新的 GAS 專案</div>
        </button>
        <button
          onClick={() => { setMode('open'); setError(null); }}
          className="rounded-lg border bg-white px-4 py-4 text-left shadow-sm active:bg-neutral-50"
        >
          <div className="text-sm font-medium">🔗 用 Script ID 開啟</div>
          <div className="mt-1 text-xs text-neutral-500">貼上既有 GAS 專案的 ID</div>
        </button>
        <a
          href="/templates"
          className="col-span-2 rounded-lg border border-neutral-900 bg-neutral-900 px-4 py-4 text-white shadow-sm active:bg-neutral-800"
        >
          <div className="text-sm font-medium">📦 從範本建立</div>
          <div className="mt-1 text-xs text-neutral-300">LINE Bot、Sheets Web App、表單自動回信…</div>
        </a>
      </section>

      {mode === 'create' && (
        <div className="rounded-lg border bg-white p-4">
          <label className="block text-sm font-medium">專案名稱</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例如：LINE Bot Webhook"
            className="mt-2 w-full rounded-md border px-3 py-2 text-sm"
          />
          <div className="mt-3 flex gap-2">
            <button onClick={handleCreate} disabled={!title || busy}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50">
              {busy ? '建立中…' : '建立'}
            </button>
            <button onClick={() => setMode('idle')} className="rounded-md border px-4 py-2 text-sm">取消</button>
          </div>
        </div>
      )}

      {mode === 'open' && (
        <div className="rounded-lg border bg-white p-4">
          <label className="block text-sm font-medium">Script ID</label>
          <input
            value={scriptId}
            onChange={(e) => setScriptId(e.target.value)}
            placeholder="貼上以 1 或 字母開頭的長字串"
            className="mt-2 w-full rounded-md border px-3 py-2 font-mono text-xs"
          />
          <p className="mt-1 text-xs text-neutral-500">
            Script ID 在 Apps Script 編輯器：「專案設定」 →「指令碼 ID」。
          </p>
          <div className="mt-3 flex gap-2">
            <button onClick={handleOpen} disabled={!scriptId.trim() || busy}
              className="rounded-md bg-neutral-900 px-4 py-2 text-sm text-white disabled:opacity-50">
              {busy ? '開啟中…' : '開啟'}
            </button>
            <button onClick={() => setMode('idle')} className="rounded-md border px-4 py-2 text-sm">取消</button>
          </div>
        </div>
      )}

      <ErrorBox error={error} />

      <section>
        <h2 className="text-sm font-semibold text-neutral-700">最近開啟</h2>
        {recent.length === 0 ? (
          <p className="mt-2 text-sm text-neutral-500">尚無紀錄 — 建立或開啟一個專案來開始。</p>
        ) : (
          <ul className="mt-2 divide-y rounded-lg border bg-white">
            {recent.map((r) => (
              <li key={r.scriptId}>
                <a href={`/editor/${r.scriptId}`} className="block px-4 py-3 active:bg-neutral-50">
                  <div className="text-sm font-medium">{r.title}</div>
                  <div className="mt-0.5 text-[11px] font-mono text-neutral-500">{r.scriptId}</div>
                  <div className="mt-0.5 text-[11px] text-neutral-400">
                    最近開啟：{new Date(r.lastOpenedAt).toLocaleString('zh-TW')}
                    {r.lastSyncedAt && ` · 已同步：${new Date(r.lastSyncedAt).toLocaleString('zh-TW')}`}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
