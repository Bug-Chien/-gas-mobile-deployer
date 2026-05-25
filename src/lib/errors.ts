// 集中錯誤碼。對應規格書 §14.1 / §14.2。
// 每個錯誤包含：message (一句話)、hint (可能原因 + 建議處理，多行)。

type ErrorMeta = { message: string; hint?: string };

export const ERROR_META = {
  GOOGLE_AUTH_REQUIRED: {
    message: 'Google 授權已失效，請重新登入。',
    hint:
`可能原因：
1. 你之前登出後沒有重新授權。
2. 在 Google 帳戶設定移除了此 App 的存取權。

建議處理：登出本工具後重新「使用 Google 登入」。`,
  },
  APPS_SCRIPT_API_DISABLED: {
    message: 'Apps Script API 尚未啟用，請在 Cloud Console 啟用後重試。',
    hint:
`可能原因：你選用的 Google 帳號對應的 Cloud Project 沒啟用 Apps Script API。

建議處理：
1. 打開 https://console.cloud.google.com/apis/library/script.googleapis.com
2. 選擇正確的 Project → Enable。
3. 回此工具點「重試」。`,
  },
  SCRIPT_NOT_FOUND: {
    message: '找不到這個 GAS 專案，請確認 Script ID。',
    hint:
`可能原因：
1. Script ID 拼錯或多了空格。
2. 你登入的 Google 帳號不是這個專案的擁有者或共用者。

建議處理：
1. 到 Apps Script 編輯器「專案設定」確認 Script ID。
2. 確認目前登入的是擁有專案的 Google 帳號。`,
  },
  PERMISSION_DENIED: {
    message: '你沒有權限存取這個專案，請確認使用的是正確的 Google 帳號。',
    hint:
`可能原因：登入的帳號不是專案的擁有者 / 共用者。

建議處理：登出後改用擁有此專案的 Google 帳號登入。`,
  },
  INVALID_MANIFEST: {
    message: 'appsscript.json 格式錯誤，請檢查 JSON 語法。',
    hint:
`可能原因：少了逗號、多了逗號、引號沒成對、缺少 } 或 ]。

建議處理：在編輯器打開 appsscript.json，看是否有紅色錯誤標示；或把內容貼到 jsonlint.com 檢查。`,
  },
  MISSING_MANIFEST: {
    message: '專案缺少 appsscript.json，無法儲存。',
    hint:
`可能原因：不小心刪掉了 appsscript.json，或從外部匯入時遺漏了。

建議處理：在編輯器的「檔案」選單按「+ 補上 appsscript.json」會自動建立預設 manifest。`,
  },
  EMPTY_FILES: {
    message: '儲存失敗：專案檔案不可為空。',
    hint: '至少要保留一個 .gs 檔案 + appsscript.json。',
  },
  DUPLICATE_FILE_NAME: {
    message: '檔名重複，請改用不同名稱。',
    hint: '在 Apps Script 中，同類型（.gs / .html / .json）的檔名必須唯一。',
  },
  INVALID_FILE_TYPE: {
    message: '不支援的檔案類型。',
    hint: 'Apps Script 只支援 .gs（伺服器端 JavaScript）、.html、.json 三種檔案。',
  },
  UPDATE_CONTENT_FAILED: {
    message: '儲存到 GAS 失敗，請稍後重試。',
    hint:
`可能原因：
1. 網路不穩。
2. Google 服務暫時異常。
3. 程式碼中包含 Google 拒絕的字串（罕見）。

建議處理：稍候 1 分鐘後再次點「儲存」。你的編輯內容已保留在本地。`,
  },
  VERSION_CREATE_FAILED: {
    message: '建立版本失敗。',
    hint:
`可能原因：
1. 從未儲存到 HEAD 過。
2. manifest 有錯導致版本快照失敗。

建議處理：先點「儲存」確認 HEAD 是最新內容，再建版本。`,
  },
  DEPLOYMENT_FAILED: {
    message: '部署失敗，請檢查版本與 manifest 是否正確。',
    hint:
`可能原因：
1. 尚未建立 version。
2. appsscript.json 缺少 webapp 區塊（無法部署成 Web App）。
3. Google 授權權限不足。

建議處理：
1. 確認 appsscript.json 有 webapp.executeAs 和 webapp.access。
2. 若缺少，用部署頁上方的「補上 webapp 預設設定」按鈕修補。
3. 重試「建立 version 並部署為 Web App」。`,
  },
  OAUTH_SCOPE_MISSING: {
    message: '權限不足，需要重新授權。',
    hint: '登出後重新登入會請求最新所需的權限範圍。',
  },
  RATE_LIMITED: {
    message: 'Google API 暫時達到流量限制，請稍後再試。',
    hint: '通常等待 1~2 分鐘後就會恢復。重複觸發只會延長等待時間。',
  },
  REMOTE_CONFLICT: {
    message: '專案在你編輯期間被改過了，為避免覆蓋無法直接儲存。',
    hint:
`可能原因：
1. 你在 Apps Script 編輯器另開了同一個專案並修改了內容。
2. 同事或另一個分頁也在編輯。

建議處理：
1. 把本地未儲存的內容複製出來保存。
2. 重新整理頁面取得遠端最新版本。
3. 手動把你的改動合併回去後再儲存。`,
  },
  POC_DISABLED: { message: 'PoC 端點未啟用。' },
  UNAUTHENTICATED: { message: '請先登入。' },
  INTERNAL_ERROR: {
    message: '系統發生未預期錯誤。',
    hint: '請重新整理頁面試試；若持續發生請回報。',
  },
} as const satisfies Record<string, ErrorMeta>;

export type ErrorCode = keyof typeof ERROR_META;

// 兼容舊呼叫：ERROR_CODES 仍可用，但回傳的是 message 字串。
export const ERROR_CODES = Object.fromEntries(
  (Object.entries(ERROR_META) as [ErrorCode, ErrorMeta][]).map(([k, v]) => [k, v.message]),
) as Record<ErrorCode, string>;

export type ApiSuccess<T> = { success: true; data: T };
export type ApiFailure = {
  success: false;
  error: { code: ErrorCode; message: string; hint?: string; detail?: string };
};
export type ApiResponse<T> = ApiSuccess<T> | ApiFailure;

export function ok<T>(data: T): ApiSuccess<T> {
  return { success: true, data };
}

export function fail(code: ErrorCode, detail?: string): ApiFailure {
  const meta = ERROR_META[code] as ErrorMeta;
  return {
    success: false,
    error: { code, message: meta.message, hint: meta.hint, detail },
  };
}

export class AppError extends Error {
  constructor(public code: ErrorCode, public detail?: string) {
    super(ERROR_META[code].message);
  }
  toResponse(): ApiFailure {
    return fail(this.code, this.detail);
  }
}
