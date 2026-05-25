# OAuth Consent & Client 手動設定（約 5 分鐘）

> gcloud CLI 無法建立一般 Web Application 的 OAuth Client，以下三項只能在 Cloud Console UI 完成。
> 跑完 `pnpm setup:gcloud`（或 `npm run setup:gcloud`）後接著做。

## 1. 設定 OAuth Consent Screen

1. 開啟 `https://console.cloud.google.com/apis/credentials/consent?project=<你的 PROJECT_ID>`
2. User Type：**External**（個人 Google 帳號可用）
3. 填寫：
   - App name：`GAS Mobile Deployer (Dev)`
   - User support email：你的 Email
   - Developer contact：你的 Email
4. Scopes：跳過（不需要在這裡新增；OAuth client 端會請求）
5. Test users：**加入你自己的 Google 帳號**（PoC 測試只用測試使用者，不需要 Google 審核）
6. Save。

## 2. 建立 OAuth Web Client

1. 開啟 `https://console.cloud.google.com/apis/credentials?project=<你的 PROJECT_ID>`
2. **Create credentials → OAuth client ID**
3. Application type：**Web application**
4. Name：`GAS Mobile Deployer Dev`
5. Authorized JavaScript origins：
   - `http://localhost:3000`
6. Authorized redirect URIs：
   - `http://localhost:3000/api/auth/google/callback`
7. Create → 跳出對話框顯示 **Client ID** 與 **Client secret**，先別關。

## 3. 貼到 .env.local

```bash
cp .env.example .env.local
```

填入：

```
GOOGLE_CLOUD_PROJECT_ID=<PROJECT_ID>
GOOGLE_OAUTH_CLIENT_ID=<從步驟 2 拿到的 Client ID>
GOOGLE_OAUTH_CLIENT_SECRET=<從步驟 2 拿到的 Client Secret>
```

產生 `SESSION_PASSWORD` 與 `ENCRYPTION_KEY`：

```powershell
node -e "console.log('SESSION_PASSWORD=' + require('crypto').randomBytes(32).toString('base64'))"
node -e "console.log('ENCRYPTION_KEY='   + require('crypto').randomBytes(32).toString('base64'))"
```

把兩行印出來的內容貼到 `.env.local`。

## 4. 驗證

```powershell
npx prisma db push      # 建立 SQLite + 套用 schema
npm run dev             # 啟動 Next dev server
```

開瀏覽器 `http://localhost:3000` → 點「使用 Google 登入」→ 用 **步驟 1 加入的測試使用者** 登入 → 回到首頁顯示 Email → 點「進入 PoC 測試頁」→ 按「開始 PoC」。

成功的話 response 會看到：

```json
{
  "success": true,
  "data": {
    "create": { "scriptId": "..." },
    "updateContent": { "fileCount": 2 },
    "getContent": { "fileCount": 2 },
    "versionCreate": { "versionNumber": 1, "description": "PoC v1" },
    "versionList": { "count": 1 },
    "deploymentCreate": {
      "deploymentId": "...",
      "versionNumber": 1,
      "webAppUrl": "https://script.google.com/macros/s/.../exec"
    },
    "deploymentUpdate": {
      "deploymentId": "（同上）",
      "versionNumber": 2
    }
  }
}
```

打開 `webAppUrl`，應該看到 `Hello (updated) from GAS Mobile Deployer`。

## 常見問題

| 錯誤 | 原因 | 處理 |
|---|---|---|
| `error=no_refresh_token` | Google 不發 refresh token（之前已授權過） | 到 https://myaccount.google.com/permissions 移除「GAS Mobile Deployer (Dev)」後重新登入 |
| `access_denied` | 帳號不在 Test users 清單 | 步驟 1 加入該帳號 |
| `APPS_SCRIPT_API_DISABLED` | API 沒啟用 | 跑 `npm run setup:gcloud`，或 UI 啟用 |
| 401 / `GOOGLE_AUTH_REQUIRED` | refresh token 失效 | 登出後重新登入 |
