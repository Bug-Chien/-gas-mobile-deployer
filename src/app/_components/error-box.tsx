'use client';
import { useState } from 'react';

export type ApiErrorPayload = {
  code?: string;
  message: string;
  hint?: string;
  detail?: string;
};

/** 從 fetch json 結果或 Error 物件取出可顯示的錯誤。 */
export function asErrorPayload(input: unknown): ApiErrorPayload | null {
  if (!input) return null;
  if (typeof input === 'string') return { message: input };
  if (input instanceof Error) return { message: input.message };
  const obj = input as { error?: ApiErrorPayload; success?: boolean };
  if (obj.success === false && obj.error) return obj.error;
  return null;
}

export function ErrorBox({ error }: { error: ApiErrorPayload | null }) {
  const [showDetail, setShowDetail] = useState(false);
  if (!error) return null;
  return (
    <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800">
      <p className="font-semibold">{error.message}</p>
      {error.hint && (
        <pre className="mt-2 whitespace-pre-wrap break-words text-xs leading-relaxed text-red-700">
          {error.hint}
        </pre>
      )}
      {error.detail && (
        <button
          onClick={() => setShowDetail((s) => !s)}
          className="mt-2 text-[11px] text-red-600 underline"
        >
          {showDetail ? '隱藏技術細節' : '顯示技術細節'}
        </button>
      )}
      {showDetail && error.detail && (
        <pre className="mt-1 max-h-40 overflow-auto rounded bg-red-100 p-2 text-[10px] text-red-900">
          {error.detail}
        </pre>
      )}
    </div>
  );
}
