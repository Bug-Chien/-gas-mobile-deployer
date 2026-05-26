// 從 .gs source 抓出 top-level 函式名（不含巢狀函式 / 箭頭函式 / 匿名）
// 給 trigger UI 的 handler 下拉、Run panel 使用。

const FN_DECL = /^[ \t]*function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/gm;

export type EntryPointKind =
  | 'web-app-get'      // doGet — 可直接打 Web App URL
  | 'web-app-post'     // doPost — 可 curl POST 測試
  | 'simple-trigger'   // onOpen / onEdit / onSelectionChange (不需安裝)
  | 'install-trigger'  // onInstall / onFormSubmit / onChange (要裝)
  | 'helper'           // 我們產的 setupTriggers / listTriggers / clearAllTriggers
  | 'plain';           // 一般函式

export type DetectedFunction = {
  name: string;
  fileName: string;       // 來源 .gs（不含副檔名）
  kind: EntryPointKind;
};

const SIMPLE_TRIGGERS = new Set(['onOpen', 'onEdit', 'onSelectionChange']);
const INSTALL_TRIGGERS = new Set(['onInstall', 'onFormSubmit', 'onChange']);
const KNOWN_HELPERS = new Set(['setupTriggers', 'listTriggers', 'clearAllTriggers']);

function classify(name: string): EntryPointKind {
  if (name === 'doGet') return 'web-app-get';
  if (name === 'doPost') return 'web-app-post';
  if (SIMPLE_TRIGGERS.has(name)) return 'simple-trigger';
  if (INSTALL_TRIGGERS.has(name)) return 'install-trigger';
  if (KNOWN_HELPERS.has(name)) return 'helper';
  return 'plain';
}

export function detectFunctionNames(source: string): string[] {
  const names = new Set<string>();
  let m: RegExpExecArray | null;
  FN_DECL.lastIndex = 0;
  while ((m = FN_DECL.exec(source)) !== null) {
    names.add(m[1]);
  }
  return [...names].sort();
}

/** 從 GasApiFile[] 抓出所有 .gs 檔的函式名 */
export function detectAllFunctions(files: { name: string; type: string; source: string }[]): string[] {
  const all = new Set<string>();
  for (const f of files) {
    if (f.type === 'SERVER_JS') {
      detectFunctionNames(f.source).forEach((n) => all.add(n));
    }
  }
  return [...all].sort();
}

/** 進階：回傳含 entry point 分類 + 來源檔的清單，給 Run panel 用。 */
export function detectAllFunctionsWithMeta(
  files: { name: string; type: string; source: string }[],
): DetectedFunction[] {
  const seen = new Map<string, DetectedFunction>();
  for (const f of files) {
    if (f.type !== 'SERVER_JS') continue;
    for (const name of detectFunctionNames(f.source)) {
      if (!seen.has(name)) {
        seen.set(name, { name, fileName: f.name, kind: classify(name) });
      }
    }
  }
  // 排序：web-app 入口 → trigger → helper → plain，組內 alphabetical
  const order: Record<EntryPointKind, number> = {
    'web-app-get': 0, 'web-app-post': 1,
    'simple-trigger': 2, 'install-trigger': 3,
    'helper': 4, 'plain': 5,
  };
  return [...seen.values()].sort((a, b) =>
    order[a.kind] - order[b.kind] || a.name.localeCompare(b.name),
  );
}
