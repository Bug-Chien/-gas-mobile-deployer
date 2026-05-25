'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Item = { id: string; name: string; category: string; description: string };
type RequiredSetting = {
  key: string; label: string; placeholder?: string;
  type?: 'text' | 'password'; required?: boolean; help?: string;
};
type Detail = Item & { requiredSettings: RequiredSetting[] };

const CATEGORY_LABEL: Record<string, string> = {
  webapp: 'Web App',
  linebot: 'LINE Bot',
  sheets: 'Google Sheets',
  form: 'Google 表單',
};

export function TemplatesClient({ items }: { items: Item[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Detail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [title, setTitle] = useState('');
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick(item: Item) {
    setLoadingDetail(true);
    setError(null);
    try {
      const r = await fetch(`/api/templates/${item.id}`);
      const j = await r.json();
      if (!j.success) { setError(j.error?.message ?? '讀取失敗'); return; }
      setSelected(j.data);
      setTitle(item.name);
      setSettings({});
    } finally { setLoadingDetail(false); }
  }

  async function submit() {
    if (!selected) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch('/api/projects/from-template', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ templateId: selected.id, title, settings }),
      });
      const j = await r.json();
      if (!j.success) { setError(j.error?.message ?? '建立失敗'); return; }
      router.push(`/editor/${j.data.scriptId}`);
    } finally { setBusy(false); }
  }

  const missingRequired = selected?.requiredSettings
    .filter((s) => s.required && !settings[s.key]?.trim())
    .map((s) => s.label) ?? [];

  return (
    <main className="mx-auto max-w-2xl px-4 py-5 sm:py-8">
      <header className="mb-4 flex items-center gap-2">
        <button onClick={() => router.push('/')} className="text-neutral-500">←</button>
        <h1 className="text-lg font-semibold">範本</h1>
      </header>

      {!selected ? (
        <ul className="space-y-3">
          {items.map((t) => (
            <li key={t.id}>
              <button
                onClick={() => pick(t)}
                disabled={loadingDetail}
                className="block w-full rounded-lg border bg-white p-4 text-left shadow-sm active:bg-neutral-50 disabled:opacity-50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{t.name}</span>
                  <span className="rounded bg-neutral-100 px-2 py-0.5 text-[10px] text-neutral-600">
                    {CATEGORY_LABEL[t.category] ?? t.category}
                  </span>
                </div>
                <p className="mt-2 text-xs text-neutral-600">{t.description}</p>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">{selected.name}</h2>
            <button onClick={() => setSelected(null)} className="text-xs text-neutral-500">回列表</button>
          </div>
          <p className="mt-1 text-xs text-neutral-500">{selected.description}</p>

          <label className="mt-4 block text-sm font-medium">專案名稱</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          />

          {selected.requiredSettings.length > 0 && (
            <div className="mt-4 space-y-3">
              <h3 className="text-sm font-medium">需要填寫的設定</h3>
              {selected.requiredSettings.map((s) => (
                <div key={s.key}>
                  <label className="block text-sm">
                    {s.label} {s.required && <span className="text-red-500">*</span>}
                  </label>
                  <input
                    type={s.type === 'password' ? 'password' : 'text'}
                    value={settings[s.key] ?? ''}
                    onChange={(e) => setSettings((p) => ({ ...p, [s.key]: e.target.value }))}
                    placeholder={s.placeholder}
                    className="mt-1 w-full rounded-md border px-3 py-2 text-sm font-mono"
                  />
                  {s.help && <p className="mt-1 text-[11px] text-neutral-500">{s.help}</p>}
                </div>
              ))}
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>
          )}

          <button
            onClick={submit}
            disabled={busy || !title.trim() || missingRequired.length > 0}
            className="mt-4 w-full rounded-md bg-neutral-900 px-4 py-2.5 text-sm text-white disabled:opacity-40"
          >
            {busy ? '建立中…' : '建立專案'}
          </button>
          {missingRequired.length > 0 && (
            <p className="mt-1 text-[11px] text-neutral-400">缺：{missingRequired.join('、')}</p>
          )}
        </div>
      )}
    </main>
  );
}
