---
name: gas-api-call
description: 呼叫 Google Apps Script API 的標準模式 — 取得已授權 client、scope、錯誤轉譯。實作任何新的 GAS API 呼叫前先看這份。
---

# Google Apps Script API 呼叫 SOP

## 1. 拿到已授權的 client

**永遠**透過 `lib/gas/client.ts` 的 `getScriptClient(userId)` 取得，不要在 route handler 直接 `new google.auth.OAuth2()`。

```ts
import { getScriptClient } from '@/lib/gas/client';

const script = await getScriptClient(userId);
const res = await script.projects.getContent({ scriptId });
```

`getScriptClient` 內部會：
1. 從 DB 取出加密 refresh token。
2. 解密。
3. 用 `googleapis` 的 `OAuth2` client 自動 refresh access token。
4. 失敗回傳 `GOOGLE_AUTH_REQUIRED` 錯誤。

## 2. Scope 對照

| API | 需要的 scope |
|---|---|
| projects.create / getContent / updateContent | `script.projects` |
| projects.versions.* | `script.projects` |
| projects.deployments.* | `script.deployments` |

平台 OAuth 同時請求兩個 scope 就夠了。

## 3. 常見錯誤對照（轉成內部 error code）

| Google API 訊息 / status | 內部 code | 處理 |
|---|---|---|
| 401 invalid_grant | `GOOGLE_AUTH_REQUIRED` | 要求重新登入 |
| 403 Apps Script API has not been used | `APPS_SCRIPT_API_DISABLED` | 提示使用者啟用 |
| 404 Requested entity was not found | `SCRIPT_NOT_FOUND` | 檢查 Script ID |
| 403 The caller does not have permission | `PERMISSION_DENIED` | 提示換帳號 |
| 429 / quota | `RATE_LIMITED` | 退避重試 |

轉譯邏輯放 `lib/gas/errors.ts`，**不要**讓原始 Google 錯誤訊息流到前端。

## 4. updateContent 特殊 SOP
看 `gas-manifest-guard` skill。**永遠**走 `AppsScriptProjectService.updateContent`，禁止直接呼叫 `script.projects.updateContent`。

## 5. Logging
- 記下：`userId`, `scriptId`, API name, status, duration。
- **絕不**記錄：access token、refresh token、file source 內容。

## 6. 測試
- 單元測試用 mock googleapis。
- 整合測試用真實帳號，跑在獨立 Cloud Project，測試後 cleanup。
