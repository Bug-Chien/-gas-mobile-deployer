'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  user: { email: string; name: string | null; createdAt: string | null };
  projectCount: number;
  snapshotCount: number;
};

export function AccountClient({ user, projectCount, snapshotCount }: Props) {
  const router = useRouter();
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (confirm !== '刪除我的帳號') return;
    if (!window.confirm('真的要刪除嗎？此動作不可復原。')) return;
    setBusy(true); setError(null);
    try {
      const r = await fetch('/api/me', { method: 'DELETE' });
      const j = await r.json();
      if (!j.success) { setError(j.error?.message ?? '刪除失敗'); return; }
      router.push('/');
      router.refresh();
    } finally { setBusy(false); }
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <header className="mb-5 flex items-center gap-2">
        <button onClick={() => router.push('/')} className="text-neutral-500">←</button>
        <h1 className="text-lg font-semibold">帳號設定</h1>
      </header>

      <section className="rounded-lg border bg-white p-4">
        <h2 className="text-sm font-semibold">基本資料</h2>
        <dl className="mt-2 grid grid-cols-3 gap-y-1 text-sm">
          <dt className="text-neutral-500">姓名</dt><dd className="col-span-2">{user.name ?? '—'}</dd>
          <dt className="text-neutral-500">Email</dt><dd className="col-span-2">{user.email}</dd>
          <dt className="text-neutral-500">建立時間</dt>
          <dd className="col-span-2">{user.createdAt ? new Date(user.createdAt).toLocaleString('zh-TW') : '—'}</dd>
        </dl>
      </section>

      <section className="mt-4 rounded-lg border bg-white p-4">
        <h2 className="text-sm font-semibold">本服務保存的資料</h2>
        <ul className="mt-2 text-sm text-neutral-700">
          <li>專案索引：{projectCount} 個</li>
          <li>程式碼快照：{snapshotCount} 份</li>
          <li>加密保存的 Google refresh token：1 筆</li>
        </ul>
        <p className="mt-2 text-xs text-neutral-500">
          詳見 <a href="/privacy" className="underline">隱私權政策</a>。
        </p>
      </section>

      <section className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4">
        <h2 className="text-sm font-semibold text-red-900">⚠ 刪除我的帳號與所有資料</h2>
        <ul className="mt-2 list-disc pl-5 text-xs text-red-800">
          <li>本服務會刪除：帳號、加密 refresh token、所有專案索引與快照。</li>
          <li>本服務會嘗試向 Google 撤銷 refresh token。</li>
          <li><b>不會</b>刪除你 Apps Script 上的專案本身（Google 端的程式碼、版本、部署都保留）。</li>
          <li>若要額外清除 Google 端對本服務的授權，請到 {' '}
            <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer" className="underline">
              Google 帳戶權限頁
            </a>。
          </li>
        </ul>
        <p className="mt-3 text-xs text-red-800">輸入「<code>刪除我的帳號</code>」以確認：</p>
        <input
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          placeholder="刪除我的帳號"
          className="mt-1 w-full rounded-md border border-red-300 px-3 py-2 text-sm"
        />
        {error && <p className="mt-2 text-xs text-red-700">{error}</p>}
        <button
          onClick={handleDelete}
          disabled={busy || confirm !== '刪除我的帳號'}
          className="mt-3 rounded-md bg-red-700 px-4 py-2 text-sm text-white disabled:opacity-40"
        >
          {busy ? '刪除中…' : '確認刪除'}
        </button>
      </section>

      <p className="mt-6 text-center text-xs text-neutral-400">
        <a href="/privacy" className="underline">隱私權政策</a> · <a href="/terms" className="underline">服務條款</a>
      </p>
    </main>
  );
}
