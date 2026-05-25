# GAS Mobile Deployer

手機友善的 Google Apps Script 部署工具。讓使用者不用打開 Apps Script 編輯器、不用電腦，就能在手機上編輯、設定、儲存、版本與部署 GAS 專案。

> 完整規格見 [gas_mobile_deployer_development_spec.md](gas_mobile_deployer_development_spec.md)。工程紅線見 [CLAUDE.md](CLAUDE.md)。

## 功能

- Google OAuth 登入（最小 scope：`script.projects` + `script.deployments`）
- 建立 / 開啟（Script ID） / 編輯 GAS 專案（CodeMirror 6 手機友善編輯器）
- `appsscript.json` 視覺化表單 + JSON 雙模式編輯
- 儲存衝突偵測（讀儲間 `updateTime` 比對）
- 版本管理、Web App 部署、更新部署（同 URL）、刪除部署
- 從範本建立專案（Hello / LINE Bot / Sheets / Form Auto Reply）
- 部署成功後依模板顯示對應教學
- 帳號 / 資料一鍵刪除（含撤銷 Google refresh token）
- PWA：可加入手機主畫面

## 技術棧

| 層 | 技術 |
|---|---|
| 前端 | Next.js 15 App Router · React 19 · Tailwind CSS · CodeMirror 6 |
| 後端 | Next.js Route Handlers · `googleapis` Node client |
| 資料 | Prisma 6（dev: SQLite，prod: PostgreSQL） |
| 驗證 | iron-session（httpOnly cookie） |
| Token 加密 | AES-256-GCM |

## 目錄結構

```
src/
  app/
    api/                  # 後端 route handlers
    editor/[scriptId]/    # 編輯器頁 + manifest 表單
    editor/[scriptId]/deploy/   # 版本 / 部署頁
    templates/            # 範本列表
    account/              # 帳號設定
    privacy/ terms/       # 法律頁
  lib/
    auth/                 # OAuth / session / token 加密
    gas/                  # Google Apps Script API wrapper
    templates/            # 範本註冊表 + 套用邏輯
    db/ errors.ts logger.ts
prisma/schema.prisma
scripts/setup-gcloud.ps1  # gcloud 輔助設定
docs/                     # OAuth / 部署文件
```

## 本地開發

### 1. 安裝依賴

```powershell
npm install
```

> ⚠ 此專案路徑（OneDrive + 中文資料夾）+ Node 24 + pnpm 會 stack overrun，請固定用 npm。詳見 [.claude/memory](.claude/memory)。

### 2. 設定 Google Cloud

執行輔助腳本，會帶你選 Project、啟用 `script.googleapis.com`：

```powershell
npm run setup:gcloud
```

接著照 [docs/setup-oauth-client.md](docs/setup-oauth-client.md) 在 Cloud Console UI：
1. 設定 OAuth Consent Screen（External + Testing），加入測試使用者
2. 建立 OAuth Web Client，取得 Client ID / Secret

### 3. 設定環境變數

```powershell
Copy-Item .env.example .env.local
```

編輯 `.env.local`，填入 OAuth client 資訊；產生兩組隨機 key：

```powershell
node -e "console.log('SESSION_PASSWORD=' + require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('ENCRYPTION_KEY='   + require('crypto').randomBytes(32).toString('base64'))"
```

### 4. 建立 DB + 啟動

```powershell
npx prisma db push
npm run dev
```

開 `http://localhost:3000`。

## 部署

- **Vercel**（推薦，最簡）：[docs/deploy-vercel.md](docs/deploy-vercel.md)
- **Cloud Run**（自管容器）：[docs/deploy-cloud-run.md](docs/deploy-cloud-run.md)
- **上線前檢查**：[docs/production-checklist.md](docs/production-checklist.md)
- **Google OAuth 公開驗證**：[docs/google-oauth-verification.md](docs/google-oauth-verification.md)

## 紅線（工程必讀）

完整列表見 [CLAUDE.md](CLAUDE.md)。最關鍵的三條：

1. **`projects.updateContent` 會覆蓋整個專案** — 所有儲存路徑必須走 `AppsScriptProjectService.updateContent`，內部強制 `validateFilesForUpdate`。
2. **Refresh token 永不出現在前端 / log / response** — AES-256-GCM 加密保存於後端。
3. **部署流程強制階段化** — 更新既有 Web App 必須建新 version 再 `deployments.update`，禁止直接 create（會生新 URL）。

## 授權

私有專案。
