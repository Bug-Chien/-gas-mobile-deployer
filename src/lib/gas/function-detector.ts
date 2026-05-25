// 從 .gs source 抓出 top-level 函式名（不含巢狀函式 / 箭頭函式 / 匿名）
// 給 trigger UI 的 handler 下拉用。

const FN_DECL = /^[ \t]*function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/gm;

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
