# GAS Mobile Deployer — Claude 工程準則

> 完整規格在 [gas_mobile_deployer_development_spec.md](gas_mobile_deployer_development_spec.md)。本檔只放「實作時必須記得」的紅線與簡述。

## 1. 一句話定位
讓使用者在手機上完成 Google Apps Script 的編輯、儲存、版本、部署。
**不要**重做 Apps Script IDE，**不要**在前端跑 clasp。

## 2. 技術選型（已定）
- Next.js 14 App Router + TypeScript
- Tailwind CSS + shadcn/ui
- CodeMirror 6（手機編輯器）
- Prisma + SQLite（Sprint 0 PoC）→ Supabase Postgres（Sprint 1 起）
- `googleapis` Node.js client
- pnpm 套件管理（透過 corepack）
- 部署：Vercel

## 3. 不可違反的紅線

### R1. `projects.updateContent` 會覆蓋整個專案
- 儲存路徑**唯一入口**：`AppsScriptProjectService.updateContent`，內部一定先呼叫 `validateFilesForUpdate(files)`。
- `validateFilesForUpdate` 強制檢查（順序不可調）：
  1. `files` 是非空陣列。
  2. 必須存在 `type === "JSON" && name === "appsscript"` 的 manifest。
  3. 同 `(name, type)` 組合不可重複。
  4. manifest source 必須可被 `JSON.parse`。
  5. 「刪除唯一 manifest」的編輯操作要在更上層 UI 阻擋；validator 在後端再守一次，禁止通過。
  6. 儲存前建立 snapshot（Sprint 1+ 寫 DB；PoC 階段至少存記憶體最近一筆 `lastGoodFiles`）。
- **`updateContent` 失敗時，不得覆蓋本地（前端）狀態**：保留 dirty state、保留使用者編輯中的 files、不更新 `lastSyncedAt`。錯誤要結構化回給前端讓使用者重試。
- Route handler 禁止直接 `import googleapis` 呼叫 `script.projects.updateContent`。

### R2. Token 安全
- refresh token **永遠不出現在前端 / response body / log**。
- 後端用 AES-256-GCM 加密保存（金鑰來自 `ENCRYPTION_KEY` env）。
- 前端只透過 httpOnly cookie session 跟後端互動。

### R3. 最小 OAuth scope
MVP 平台 OAuth 只請求：
```
openid email profile
https://www.googleapis.com/auth/script.projects
https://www.googleapis.com/auth/script.deployments
```
**不要**加 Drive / Gmail / Sheets。模板需要的 scope 寫到使用者的 `appsscript.json`，不是平台 OAuth。

### R4. 平台 OAuth scope ≠ GAS 專案 `oauthScopes`
平台要的是「管理 Apps Script 專案」的權限。
GAS 專案 manifest 裡的 `oauthScopes` 是「腳本執行時」存取 Google 服務的權限。**不要混淆**。

### R5. 檔名規則
- 使用者看到 `Code.gs` / `Index.html` / `appsscript.json`。
- API 送出時：`name` 不含副檔名（`Code` / `Index` / `appsscript`），`type` 為 `SERVER_JS` / `HTML` / `JSON`。
- 轉換邏輯集中在 `lib/gas/file-mapper.ts`，**不要散落各處**。

## 4. 目錄結構約定
```
app/                  # Next.js App Router 頁面
  api/                # API routes（後端）
    auth/google/...
    projects/...
components/           # React UI
  editor/             # CodeMirror 包裝
lib/
  gas/                # Google Apps Script API wrapper
  auth/               # OAuth / session / token 加密
  db/                 # Prisma client
prisma/
  schema.prisma
docs/                 # 開發文件（OAuth 設定、API 合約）
scripts/              # 一次性 / 維運腳本（gcloud setup 等）
```

## 5. API 回應格式（強制統一）
成功：`{ success: true, data: {...} }`
失敗：`{ success: false, error: { code, message, detail? } }`
錯誤碼集中在 `lib/errors.ts`，與規格書 §14.1 對照。

## 6. 錯誤訊息原則
- **絕不**直接吐 Google API 原始錯誤字串給使用者。
- 翻成中文白話 + 可能原因 + 建議處理。
- technical detail 可放在可展開區塊（前端 UI）或 response 的 `error.detail`。

### R6. 部署流程強制階段化
HEAD（最新儲存的程式碼）、Version（不可變快照）、Deployment（發布實體）三者分開。
- 第一次部署：`updateContent` → `versions.create` → `deployments.create`。
- **更新既有 Web App**：`updateContent` → `versions.create`（**必須建立新 version**）→ `deployments.update(deploymentId, { versionNumber })`。
- 禁止對既有 Web App 用 `deployments.create`（會產生新 URL，使用者外部設定失效）。
- 禁止讓 deployment 指向 HEAD 而非具名 version。

### R7. PoC 端點安全
`/api/poc/*` 路由僅供開發 / staging：
- 在 handler 第一行檢查 `process.env.NODE_ENV !== 'production' && process.env.ENABLE_POC === 'true'`，否則回 404。
- 必須通過正常登入 session 檢查（同其他 API），不另開後門。
- 不得在正式環境部署時打開。

## 7. 開發優先順序（Sprint 0 PoC 目標）
1. Google OAuth (Authorization Code Flow) 跑通。
2. 七支核心 API 各跑一次：
   `projects.create / getContent / updateContent / versions.create / versions.list / deployments.create / deployments.update`
3. 手機上能拿到 Web App URL 並開啟。

不在 PoC 範圍：DB schema 完整化、模板、PWA、AI 輔助。

## 8. 測試最低要求
- `lib/gas/*` 純函式（file-mapper、manifest-validator）寫單元測試。
- API route 至少做一次手動 happy-path 驗證。

## 9. 與我（Claude）合作時
- 動「儲存到 GAS」的 code path 前，先讀 `.claude/skills/gas-manifest-guard/SKILL.md`。
- 加新的 Google API 呼叫前，先讀 `.claude/skills/gas-api-call/SKILL.md`。
- 部署流程的順序錯誤是常見 bug，先讀 `.claude/skills/gas-deploy-flow/SKILL.md`。
