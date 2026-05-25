import type { ErrorCode } from '@/lib/errors';

export type GasFileType = 'SERVER_JS' | 'HTML' | 'JSON';

export type GasApiFile = {
  name: string;
  type: GasFileType;
  source: string;
};

export type ValidationResult =
  | { ok: true }
  | { ok: false; code: ErrorCode; detail: string };

// 規格書 §7.2、§23 紅線：updateContent 會覆蓋整個專案。
// 這是儲存路徑唯一守門員。
export function validateFilesForUpdate(files: GasApiFile[]): ValidationResult {
  // 1. 非空陣列
  if (!Array.isArray(files) || files.length === 0) {
    return { ok: false, code: 'EMPTY_FILES', detail: 'files must be a non-empty array' };
  }

  // 2. 欄位齊全 + type 合法
  const ALLOWED: GasFileType[] = ['SERVER_JS', 'HTML', 'JSON'];
  for (const [i, f] of files.entries()) {
    if (typeof f?.name !== 'string' || !f.name) {
      return { ok: false, code: 'INVALID_FILE_TYPE', detail: `files[${i}].name missing` };
    }
    if (typeof f?.source !== 'string') {
      return { ok: false, code: 'INVALID_FILE_TYPE', detail: `files[${i}].source missing` };
    }
    if (!ALLOWED.includes(f.type)) {
      return {
        ok: false,
        code: 'INVALID_FILE_TYPE',
        detail: `files[${i}].type "${f.type}" not in SERVER_JS/HTML/JSON`,
      };
    }
  }

  // 3. 檔名不可重複 (同 name+type)
  const seen = new Set<string>();
  for (const f of files) {
    const key = `${f.type}:${f.name}`;
    if (seen.has(key)) {
      return { ok: false, code: 'DUPLICATE_FILE_NAME', detail: `duplicate ${key}` };
    }
    seen.add(key);
  }

  // 4. 必須包含 manifest
  const manifest = files.find((f) => f.type === 'JSON' && f.name === 'appsscript');
  if (!manifest) {
    return {
      ok: false,
      code: 'MISSING_MANIFEST',
      detail: 'files must contain { name: "appsscript", type: "JSON" }',
    };
  }

  // 5. manifest 必須可 parse
  try {
    JSON.parse(manifest.source);
  } catch (e) {
    return {
      ok: false,
      code: 'INVALID_MANIFEST',
      detail: e instanceof Error ? e.message : 'JSON parse failed',
    };
  }

  // 6. 「刪除唯一 manifest」 — 已被 (4) 守住，這裡留註解作為意圖。
  // 前端 UI 應在按鈕層 disable 刪除唯一 manifest，後端是最後一道。

  return { ok: true };
}
