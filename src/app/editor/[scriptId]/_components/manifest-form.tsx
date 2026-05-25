'use client';
import { useMemo, useState } from 'react';

type Manifest = {
  timeZone?: string;
  exceptionLogging?: 'STACKDRIVER' | 'NONE';
  runtimeVersion?: 'V8' | 'DEPRECATED_ES5';
  webapp?: {
    executeAs?: 'USER_DEPLOYING' | 'USER_ACCESSING';
    access?: 'MYSELF' | 'DOMAIN' | 'ANYONE' | 'ANYONE_ANONYMOUS';
  };
  oauthScopes?: string[];
  [k: string]: unknown;
};

const COMMON_TIMEZONES = [
  'Asia/Taipei', 'Asia/Tokyo', 'Asia/Hong_Kong', 'Asia/Singapore',
  'America/Los_Angeles', 'America/New_York', 'Europe/London', 'UTC',
];

const COMMON_SCOPES: { value: string; label: string }[] = [
  { value: 'https://www.googleapis.com/auth/script.external_request', label: '對外 HTTP 呼叫（UrlFetchApp）' },
  { value: 'https://www.googleapis.com/auth/spreadsheets', label: 'Google Sheets 讀寫' },
  { value: 'https://www.googleapis.com/auth/spreadsheets.currentonly', label: 'Sheets 僅限當前文件' },
  { value: 'https://www.googleapis.com/auth/script.send_mail', label: 'GmailApp / MailApp 寄信' },
  { value: 'https://www.googleapis.com/auth/gmail.send', label: 'Gmail 進階寄信' },
  { value: 'https://www.googleapis.com/auth/forms.currentonly', label: 'Forms 僅限當前表單' },
  { value: 'https://www.googleapis.com/auth/drive.file', label: 'Drive 僅限使用者建立檔案' },
  { value: 'https://www.googleapis.com/auth/script.scriptapp', label: '管理觸發器（ScriptApp）' },
];

type Props = {
  source: string;                // 目前的 manifest JSON 字串
  onChange: (next: string) => void;
};

export function ManifestForm({ source, onChange }: Props) {
  const parsed = useMemo<{ ok: true; m: Manifest } | { ok: false; msg: string }>(() => {
    try { return { ok: true, m: JSON.parse(source) as Manifest }; }
    catch (e) { return { ok: false, msg: e instanceof Error ? e.message : 'JSON 解析失敗' }; }
  }, [source]);

  const [newScope, setNewScope] = useState('');

  if (!parsed.ok) {
    return (
      <div className="p-4">
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          目前 appsscript.json 不是合法 JSON，無法以表單編輯：<br />
          <code className="text-xs">{parsed.msg}</code>
          <p className="mt-2 text-xs">請先到「JSON」分頁修正格式錯誤。</p>
        </div>
      </div>
    );
  }

  const m = parsed.m;

  function patch(next: Partial<Manifest>) {
    const merged = { ...m, ...next };
    onChange(JSON.stringify(merged, null, 2));
  }

  function patchWebapp(next: NonNullable<Manifest['webapp']>) {
    const webapp = { ...(m.webapp ?? {}), ...next };
    patch({ webapp });
  }

  function setScopes(scopes: string[]) {
    if (scopes.length === 0) {
      const copy = { ...m };
      delete copy.oauthScopes;
      onChange(JSON.stringify(copy, null, 2));
    } else {
      patch({ oauthScopes: scopes });
    }
  }

  const scopes = m.oauthScopes ?? [];

  return (
    <div className="space-y-5 p-4 text-sm">
      <Field label="時區 (timeZone)">
        <select
          value={m.timeZone ?? ''}
          onChange={(e) => patch({ timeZone: e.target.value || undefined })}
          className="w-full rounded-md border px-3 py-2 text-sm"
        >
          <option value="">未指定</option>
          {COMMON_TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
          {m.timeZone && !COMMON_TIMEZONES.includes(m.timeZone) && (
            <option value={m.timeZone}>{m.timeZone}（自訂）</option>
          )}
        </select>
      </Field>

      <Field label="例外記錄 (exceptionLogging)">
        <select
          value={m.exceptionLogging ?? ''}
          onChange={(e) => patch({ exceptionLogging: (e.target.value || undefined) as Manifest['exceptionLogging'] })}
          className="w-full rounded-md border px-3 py-2 text-sm"
        >
          <option value="">未指定</option>
          <option value="STACKDRIVER">STACKDRIVER（推薦）</option>
          <option value="NONE">NONE</option>
        </select>
      </Field>

      <Field label="Runtime (runtimeVersion)">
        <select
          value={m.runtimeVersion ?? ''}
          onChange={(e) => patch({ runtimeVersion: (e.target.value || undefined) as Manifest['runtimeVersion'] })}
          className="w-full rounded-md border px-3 py-2 text-sm"
        >
          <option value="">未指定（預設 V8）</option>
          <option value="V8">V8（推薦）</option>
          <option value="DEPRECATED_ES5">DEPRECATED_ES5（舊版）</option>
        </select>
      </Field>

      <fieldset className="rounded-lg border p-3">
        <legend className="px-2 text-xs font-semibold text-neutral-600">Web App 設定 (webapp)</legend>
        <p className="text-[11px] text-neutral-500">
          沒有這段，部署會變成 Library 而不是 Web App。
        </p>
        <div className="mt-2 space-y-3">
          <Field label="執行身分 (executeAs)">
            <select
              value={m.webapp?.executeAs ?? ''}
              onChange={(e) => patchWebapp({ executeAs: (e.target.value || undefined) as NonNullable<Manifest['webapp']>['executeAs'] })}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">未指定</option>
              <option value="USER_DEPLOYING">USER_DEPLOYING（推薦：以部署者身分執行）</option>
              <option value="USER_ACCESSING">USER_ACCESSING（以訪客身分，會要求每位使用者授權）</option>
            </select>
          </Field>
          <Field label="存取權限 (access)">
            <select
              value={m.webapp?.access ?? ''}
              onChange={(e) => patchWebapp({ access: (e.target.value || undefined) as NonNullable<Manifest['webapp']>['access'] })}
              className="w-full rounded-md border px-3 py-2 text-sm"
            >
              <option value="">未指定</option>
              <option value="ANYONE">ANYONE（任何人，需登入 Google）</option>
              <option value="ANYONE_ANONYMOUS">ANYONE_ANONYMOUS（任何人，不需登入，LINE Bot 必選）</option>
              <option value="DOMAIN">DOMAIN（同網域內）</option>
              <option value="MYSELF">MYSELF（僅自己）</option>
            </select>
          </Field>
        </div>
      </fieldset>

      <fieldset className="rounded-lg border p-3">
        <legend className="px-2 text-xs font-semibold text-neutral-600">OAuth Scopes (oauthScopes)</legend>
        <p className="text-[11px] text-neutral-500">
          明確指定腳本執行時需要的 Google API 權限。不指定時 Apps Script 會在第一次執行時自動推斷。
        </p>

        {scopes.length === 0 ? (
          <p className="mt-2 text-xs text-neutral-400">尚未指定（Apps Script 會自動推斷）</p>
        ) : (
          <ul className="mt-2 space-y-1">
            {scopes.map((s) => (
              <li key={s} className="flex items-center gap-2 rounded bg-neutral-50 px-2 py-1">
                <code className="flex-1 break-all text-[11px]">{s}</code>
                <button
                  onClick={() => setScopes(scopes.filter((x) => x !== s))}
                  className="text-xs text-red-600"
                >移除</button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-3 flex gap-2">
          <select
            value=""
            onChange={(e) => {
              const v = e.target.value;
              if (v && !scopes.includes(v)) setScopes([...scopes, v]);
            }}
            className="flex-1 rounded-md border px-3 py-2 text-xs"
          >
            <option value="">+ 從常用 scope 新增…</option>
            {COMMON_SCOPES.filter((s) => !scopes.includes(s.value)).map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={newScope}
            onChange={(e) => setNewScope(e.target.value)}
            placeholder="或自訂貼上 scope URL"
            className="flex-1 rounded-md border px-3 py-2 text-xs font-mono"
          />
          <button
            onClick={() => {
              const v = newScope.trim();
              if (v && !scopes.includes(v)) { setScopes([...scopes, v]); setNewScope(''); }
            }}
            disabled={!newScope.trim()}
            className="rounded-md border px-3 py-2 text-xs disabled:opacity-40"
          >加入</button>
        </div>
      </fieldset>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-neutral-700">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
