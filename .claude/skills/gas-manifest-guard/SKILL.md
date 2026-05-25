---
name: gas-manifest-guard
description: projects.updateContent 會覆蓋整個專案 — 儲存前的強制檢查清單。修改任何寫入 GAS 的程式碼前先讀。
---

# Manifest / Files 守門 SOP

## 為什麼這份很重要

`projects.updateContent` 不是「更新某幾個檔案」，而是**用新的 files 陣列覆蓋整個專案**。

漏一個檔案 = 遠端那個檔案被刪掉。
漏 manifest = 專案無法部署。

歷史上規格書 §7.2、§23.1、§23.7 反覆強調這件事。**這是產品最高風險點**。

## 儲存前強制檢查（順序不可調）

1. **`files` 是非空陣列** → 否則回 `EMPTY_FILES`。
2. **每個 file 都有 `name` / `type` / `source`** 三個欄位；type 限定 `SERVER_JS` / `HTML` / `JSON`。
3. **檔名不可重複**（同 `(name, type)` 唯一） → 否則回 `DUPLICATE_FILE_NAME`。
4. **必須包含 manifest**：陣列中要有 `{ name: "appsscript", type: "JSON" }` → 否則回 `MISSING_MANIFEST`。
5. **manifest 必須可 parse**：`JSON.parse(manifestSource)` 不丟錯 → 否則回 `INVALID_MANIFEST`（附 message + 行號）。
6. **不允許刪除唯一 manifest**：若上游意圖刪掉 manifest，validator 必須擋下回 `MISSING_MANIFEST`。前端 UI 也要在按鈕層 disable，但後端是最後一道。
7. **建立 snapshot**：Sprint 1+ 寫 `project_snapshots`；PoC 階段至少在 service 內存一份 `lastGoodFiles[scriptId]` 作為記憶體備份。
8. **才呼叫 `script.projects.updateContent`**。

## 失敗時的本地狀態規則

`updateContent` 失敗（包含 validator 拒絕、Google API 回 4xx/5xx）：
- **不得**將前端 `isDirty` 設為 false。
- **不得**更新 `lastSyncedAt`。
- **不得**清掉編輯器中的未儲存內容。
- 結構化錯誤回前端：`{ success: false, error: { code, message, detail? } }`。
- 後端 service 不丟未補捉 exception 到 route handler 外（會被 Next.js 包成 500 露原始訊息）。

實作位置：`lib/gas/manifest-guard.ts` 的 `validateFilesForUpdate(files)` 函式，回傳 `{ ok: true } | { ok: false, code, message, detail }`。

## 前端的責任
- 編輯器不允許刪除最後一個 manifest（UI 層 disable 按鈕）。
- 重新命名 / 刪除 / 新增檔案後，dirty state 設 true。
- 「儲存」按鈕呼叫的是「上傳整個 files 陣列」，不是「上傳這一個檔案」。

## 衝突偵測（Sprint 2+）
讀取時記下遠端的 `updateTime`，儲存前再讀一次比對。不同 → 顯示衝突 UI，**不要直接覆蓋**。

## 不要做的事
- ❌ 直接在 route handler 呼叫 `script.projects.updateContent`。
- ❌ 為了「方便」跳過某個檢查。
- ❌ 預設帶一個假的 manifest 進去（如果使用者沒有 manifest，要明確問他）。
- ❌ 把 `validateFilesForUpdate` 的回傳改成丟 exception —— 它要可以被前端拿到結構化錯誤訊息。
