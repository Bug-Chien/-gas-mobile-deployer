'use client';
import { useMemo, useState } from 'react';
import {
  generateTriggerCode,
  generateListTriggersCode,
  generateClearAllTriggersCode,
  injectIntoSource,
  injectRawHelper,
  type TriggerConfig,
  type Weekday,
  type GeneratedCode,
} from '@/lib/gas/trigger-generator';
import { detectAllFunctions } from '@/lib/gas/function-detector';

type GasFile = { name: string; type: 'SERVER_JS' | 'HTML' | 'JSON'; source: string };

type Props = {
  scriptId: string;
  files: GasFile[];
  open: boolean;
  onClose: () => void;
  /** 寫回主編輯器：呼叫者要替換 files 並打開該檔案 */
  onApply: (nextFiles: GasFile[], targetFileName: string, hint: string) => void;
};

type Tab = 'add' | 'manage';

type Kind = TriggerConfig['kind'];

const KIND_LABEL: Record<Kind, string> = {
  'time': '⏰ 時間觸發（每天 / 每小時 / 每分鐘）',
  'spreadsheet-edit': '📝 試算表：編輯儲存格時',
  'spreadsheet-open': '📂 試算表：開啟時',
  'spreadsheet-change': '🔧 試算表：結構改變時',
  'spreadsheet-formsubmit': '📨 試算表：連結表單送出時',
  'form-submit': '📨 Google 表單：送出時',
};

const WEEKDAYS: { value: Weekday; label: string }[] = [
  { value: 'MONDAY', label: '週一' }, { value: 'TUESDAY', label: '週二' },
  { value: 'WEDNESDAY', label: '週三' }, { value: 'THURSDAY', label: '週四' },
  { value: 'FRIDAY', label: '週五' }, { value: 'SATURDAY', label: '週六' },
  { value: 'SUNDAY', label: '週日' },
];

export function TriggerDialog({ scriptId, files, open, onClose, onApply }: Props) {
  const [tab, setTab] = useState<Tab>('add');
  const [kind, setKind] = useState<Kind>('time');
  const [handler, setHandler] = useState('myJob');
  const [targetFile, setTargetFile] = useState<string>(() => {
    const codeFile = files.find((f) => f.type === 'SERVER_JS');
    return codeFile?.name ?? 'Code';
  });

  // time
  const [timeMode, setTimeMode] = useState<'daily' | 'weekly' | 'everyHours' | 'everyMinutes'>('daily');
  const [dailyAtHour, setDailyAtHour] = useState(7);
  const [weeklyOn, setWeeklyOn] = useState<Weekday>('MONDAY');
  const [weeklyAtHour, setWeeklyAtHour] = useState(9);
  const [everyHours, setEveryHours] = useState(1);
  const [everyMinutes, setEveryMinutes] = useState<1 | 5 | 10 | 15 | 30>(5);

  // spreadsheet / form
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [formId, setFormId] = useState('');

  const existingFns = useMemo(() => detectAllFunctions(files), [files]);

  const cfg: TriggerConfig | null = useMemo(() => {
    if (!handler.trim()) return null;
    if (kind === 'time') {
      if (timeMode === 'daily') return { kind: 'time', handler, dailyAtHour };
      if (timeMode === 'weekly') return { kind: 'time', handler, weeklyOn, weeklyAtHour };
      if (timeMode === 'everyHours') return { kind: 'time', handler, everyHours };
      return { kind: 'time', handler, everyMinutes };
    }
    if (kind === 'form-submit') {
      if (!formId.trim()) return null;
      return { kind: 'form-submit', handler, formId: formId.trim() };
    }
    // spreadsheet 系列
    if (!spreadsheetId.trim()) return null;
    return { kind, handler, spreadsheetId: spreadsheetId.trim() };
  }, [kind, handler, timeMode, dailyAtHour, weeklyOn, weeklyAtHour, everyHours, everyMinutes, spreadsheetId, formId]);

  const generated: GeneratedCode | null = useMemo(() => (cfg ? generateTriggerCode(cfg) : null), [cfg]);

  function apply() {
    if (!generated) return;
    const idx = files.findIndex((f) => f.name === targetFile && f.type === 'SERVER_JS');
    if (idx < 0) return;
    const next = [...files];
    next[idx] = { ...next[idx], source: injectIntoSource(next[idx].source, generated) };
    onApply(next, targetFile, generated.postInstallHint);
    onClose();
  }

  function injectHelper(kind: 'list' | 'clear') {
    const idx = files.findIndex((f) => f.name === targetFile && f.type === 'SERVER_JS');
    if (idx < 0) return;
    const helper = kind === 'list' ? generateListTriggersCode() : generateClearAllTriggersCode();
    const markerName = kind === 'list' ? 'trigger inspector' : 'trigger cleaner';
    const next = [...files];
    next[idx] = {
      ...next[idx],
      source: injectRawHelper(next[idx].source, markerName, helper.handlerSkeleton),
    };
    onApply(next, targetFile, helper.postInstallHint);
    onClose();
  }

  const nativeTriggersUrl = `https://script.google.com/home/projects/${scriptId}/triggers`;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4">
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-xl sm:rounded-xl bg-white shadow-xl">
        <header className="sticky top-0 z-10 border-b bg-white px-4 pt-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">觸發器</h2>
            <button onClick={onClose} className="text-neutral-500">✕</button>
          </div>
          <div className="mt-2 flex gap-1 text-xs">
            <button
              onClick={() => setTab('add')}
              className={`rounded-t px-3 py-1.5 ${tab === 'add' ? 'bg-neutral-900 text-white' : 'text-neutral-600'}`}
            >+ 新增</button>
            <button
              onClick={() => setTab('manage')}
              className={`rounded-t px-3 py-1.5 ${tab === 'manage' ? 'bg-neutral-900 text-white' : 'text-neutral-600'}`}
            >列出 / 清除</button>
          </div>
        </header>

        {tab === 'manage' ? (
          <div className="space-y-4 p-4 text-sm">
            <section className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
              <p className="font-semibold">在原生編輯器直接管理（推薦）</p>
              <p className="mt-1">
                Apps Script API 沒有提供管理觸發器的端點，原生編輯器的「觸發條件」頁是最完整的視覺化清單，
                可直接修改 / 刪除 / 查看執行紀錄。
              </p>
              <a
                href={nativeTriggersUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block rounded-md bg-blue-600 px-3 py-1.5 text-xs text-white"
              >🔗 開啟原生觸發器管理頁</a>
            </section>

            <label className="block">
              <span className="text-xs font-medium text-neutral-700">將 helper 寫入哪個 .gs 檔</span>
              <select
                value={targetFile}
                onChange={(e) => setTargetFile(e.target.value)}
                className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
              >
                {files.filter((f) => f.type === 'SERVER_JS').map((f) => (
                  <option key={f.name} value={f.name}>{f.name}.gs</option>
                ))}
              </select>
            </label>

            <section className="rounded-md border p-3">
              <h3 className="text-sm font-semibold">📋 加入「列出觸發器」helper</h3>
              <p className="mt-1 text-xs text-neutral-600">
                會在你選的 .gs 加一個 <code>listTriggers()</code> 函式。儲存後到原生編輯器執行它，
                結果會印在「執行記錄」分頁。
              </p>
              <button
                onClick={() => injectHelper('list')}
                className="mt-2 rounded-md border px-3 py-1.5 text-xs"
              >加入 listTriggers()</button>
            </section>

            <section className="rounded-md border border-red-200 p-3">
              <h3 className="text-sm font-semibold text-red-700">🗑 加入「全部清除」helper</h3>
              <p className="mt-1 text-xs text-neutral-600">
                會在你選的 .gs 加一個 <code>clearAllTriggers()</code> 函式。儲存後到原生編輯器執行它會
                <b className="text-red-700">刪掉所有觸發器</b>（包含其他工具裝的）。適合「我搞砸了想全部重設」。
              </p>
              <button
                onClick={() => {
                  if (!window.confirm('只加程式碼還不會真的刪。但這個 helper 一旦在原生編輯器執行就會清光所有觸發器。確定加入？')) return;
                  injectHelper('clear');
                }}
                className="mt-2 rounded-md border border-red-300 px-3 py-1.5 text-xs text-red-700"
              >加入 clearAllTriggers()</button>
            </section>

            <details className="rounded-md border bg-neutral-50 p-3 text-xs text-neutral-700">
              <summary className="cursor-pointer font-medium">為什麼不能直接在這頁顯示觸發器列表？</summary>
              <p className="mt-2 leading-relaxed">
                Google Apps Script API 沒有提供 <code>triggers.list</code> / <code>triggers.delete</code> 端點。
                要從外部工具讀取，必須：
              </p>
              <ol className="ml-4 mt-1 list-decimal">
                <li>把專案連到你自己的 standard GCP project</li>
                <li>部署一個 API Executable</li>
                <li>授權額外 scope</li>
              </ol>
              <p className="mt-1">
                門檻過高，違背本工具「手機 / 零門檻」的定位。建議走原生編輯器或 listTriggers helper。
              </p>
            </details>
          </div>
        ) : (
        <>
        <div className="space-y-4 p-4 text-sm">
          {/* 觸發類型 */}
          <label className="block">
            <span className="text-xs font-medium text-neutral-700">觸發類型</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as Kind)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            >
              {(Object.keys(KIND_LABEL) as Kind[]).map((k) => (
                <option key={k} value={k}>{KIND_LABEL[k]}</option>
              ))}
            </select>
          </label>

          {/* 處理函式名稱 */}
          <label className="block">
            <span className="text-xs font-medium text-neutral-700">處理函式名稱</span>
            <input
              value={handler}
              onChange={(e) => setHandler(e.target.value)}
              placeholder="myJob"
              className="mt-1 w-full rounded-md border px-3 py-2 font-mono text-sm"
            />
            {existingFns.includes(handler) ? (
              <p className="mt-1 text-[11px] text-amber-700">
                ⚠ Code.gs 已有名為 <code>{handler}</code> 的函式，不會覆蓋它，只會加 setupTriggers + handler 註解。建議改名或在生成的 handler 中改用它。
              </p>
            ) : (
              <p className="mt-1 text-[11px] text-neutral-500">不存在的函式 — 會自動產生骨架。</p>
            )}
            {existingFns.length > 0 && (
              <div className="mt-1 flex flex-wrap gap-1">
                <span className="text-[10px] text-neutral-500">已偵測：</span>
                {existingFns.slice(0, 8).map((fn) => (
                  <button
                    key={fn}
                    type="button"
                    onClick={() => setHandler(fn)}
                    className="rounded bg-neutral-100 px-1.5 py-0.5 text-[10px] font-mono"
                  >{fn}</button>
                ))}
              </div>
            )}
          </label>

          {/* 寫入哪個檔案 */}
          <label className="block">
            <span className="text-xs font-medium text-neutral-700">寫入哪個 .gs 檔</span>
            <select
              value={targetFile}
              onChange={(e) => setTargetFile(e.target.value)}
              className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
            >
              {files.filter((f) => f.type === 'SERVER_JS').map((f) => (
                <option key={f.name} value={f.name}>{f.name}.gs</option>
              ))}
            </select>
          </label>

          {/* time 子設定 */}
          {kind === 'time' && (
            <fieldset className="rounded-md border p-3">
              <legend className="px-1 text-xs font-medium text-neutral-600">時間設定</legend>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={timeMode === 'daily'} onChange={() => setTimeMode('daily')} />
                  每天
                  <select
                    value={dailyAtHour}
                    onChange={(e) => setDailyAtHour(Number(e.target.value))}
                    disabled={timeMode !== 'daily'}
                    className="rounded-md border px-2 py-1 text-sm"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={timeMode === 'weekly'} onChange={() => setTimeMode('weekly')} />
                  每週
                  <select
                    value={weeklyOn}
                    onChange={(e) => setWeeklyOn(e.target.value as Weekday)}
                    disabled={timeMode !== 'weekly'}
                    className="rounded-md border px-2 py-1 text-sm"
                  >
                    {WEEKDAYS.map((w) => <option key={w.value} value={w.value}>{w.label}</option>)}
                  </select>
                  <select
                    value={weeklyAtHour}
                    onChange={(e) => setWeeklyAtHour(Number(e.target.value))}
                    disabled={timeMode !== 'weekly'}
                    className="rounded-md border px-2 py-1 text-sm"
                  >
                    {Array.from({ length: 24 }, (_, i) => (
                      <option key={i} value={i}>{String(i).padStart(2, '0')}:00</option>
                    ))}
                  </select>
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={timeMode === 'everyHours'} onChange={() => setTimeMode('everyHours')} />
                  每
                  <select
                    value={everyHours}
                    onChange={(e) => setEveryHours(Number(e.target.value))}
                    disabled={timeMode !== 'everyHours'}
                    className="rounded-md border px-2 py-1 text-sm"
                  >
                    {[1, 2, 4, 6, 8, 12].map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                  小時
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="radio" checked={timeMode === 'everyMinutes'} onChange={() => setTimeMode('everyMinutes')} />
                  每
                  <select
                    value={everyMinutes}
                    onChange={(e) => setEveryMinutes(Number(e.target.value) as 1 | 5 | 10 | 15 | 30)}
                    disabled={timeMode !== 'everyMinutes'}
                    className="rounded-md border px-2 py-1 text-sm"
                  >
                    {[1, 5, 10, 15, 30].map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                  分鐘
                </label>
              </div>
            </fieldset>
          )}

          {/* spreadsheet 系列 */}
          {kind.startsWith('spreadsheet-') && (
            <label className="block">
              <span className="text-xs font-medium text-neutral-700">試算表 ID</span>
              <input
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
                placeholder="網址 /d/<這段>/edit"
                className="mt-1 w-full rounded-md border px-3 py-2 text-xs font-mono"
              />
            </label>
          )}

          {/* form */}
          {kind === 'form-submit' && (
            <label className="block">
              <span className="text-xs font-medium text-neutral-700">表單 ID</span>
              <input
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
                placeholder="表單編輯網址 /d/<這段>/edit"
                className="mt-1 w-full rounded-md border px-3 py-2 text-xs font-mono"
              />
            </label>
          )}

          {/* 預覽 */}
          {generated && (
            <details className="rounded border bg-neutral-50 p-2 text-xs">
              <summary className="cursor-pointer font-medium">預覽會加入的程式碼</summary>
              <pre className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px]">
{generated.setupFn}{'\n'}{generated.handlerSkeleton}
              </pre>
              {generated.requiredScopes.length > 0 && (
                <p className="mt-2 text-[11px] text-neutral-600">
                  此觸發器需要的 manifest scopes：<br />
                  <code className="text-[10px]">{generated.requiredScopes.join('\n')}</code>
                </p>
              )}
            </details>
          )}
        </div>

        <footer className="sticky bottom-0 flex gap-2 border-t bg-white px-4 py-3">
          <button onClick={onClose} className="flex-1 rounded-md border px-3 py-2 text-sm">取消</button>
          <button
            onClick={apply}
            disabled={!generated}
            className="flex-1 rounded-md bg-neutral-900 px-3 py-2 text-sm text-white disabled:opacity-40"
          >加入程式碼</button>
        </footer>
        </>)}
      </div>
    </div>
  );
}
