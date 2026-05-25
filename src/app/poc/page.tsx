'use client';
import { useState } from 'react';

export default function PocPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<unknown>(null);

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/poc/run', { method: 'POST' });
      setResult(await res.json());
    } catch (e) {
      setResult({ error: String(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <h1 className="text-2xl font-bold">Sprint 0 PoC</h1>
      <p className="mt-2 text-sm text-neutral-600">
        依序執行七支核心 API：create → updateContent → getContent → versions.create → versions.list →
        deployments.create → updateContent → versions.create → deployments.update。
      </p>
      <button
        onClick={run}
        disabled={loading}
        className="mt-4 rounded-lg bg-neutral-900 px-4 py-2 text-white disabled:opacity-50"
      >
        {loading ? '執行中...' : '開始 PoC'}
      </button>
      {result ? (
        <pre className="mt-6 overflow-auto rounded-lg bg-neutral-100 p-4 text-xs">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </main>
  );
}
