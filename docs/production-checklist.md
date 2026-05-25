# 上線前檢查清單

不論部到 Vercel 還是 Cloud Run，下面這些事**必做**。

## 1. 換 DB：SQLite → PostgreSQL

開發用 SQLite 是「夠快」設計；正式環境必須換掉。

```diff
- // prisma/schema.prisma
- datasource db {
-   provider = "sqlite"
-   url      = env("DATABASE_URL")
- }
+ datasource db {
+   provider = "postgresql"
+   url      = env("DATABASE_URL")
+ }
```

新增 production migration 而不是 `db push`：

```bash
DATABASE_URL="postgresql://..." npx prisma migrate dev --name init
git add prisma/migrations
```

部署時跑 `npx prisma migrate deploy`（不要在生產跑 `db push`）。

推薦 DB 供應商：Supabase / Neon / Cloud SQL Postgres。

## 2. 重生所有秘密

開發環境的 key 已寫進 git 歷史（即使 `.env.local` 被 gitignore，前面對話也漏過），**正式環境必須重生**：

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # SESSION_PASSWORD
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"  # ENCRYPTION_KEY
```

如果換了 `ENCRYPTION_KEY`，**已加密保存的 refresh token 會全部失效**，使用者需重新登入。第一次部屬沒差；已有使用者後再換要先做 re-encrypt migration。

## 3. 建立 production Google Cloud Project

別跟開發共用 `gas-deployer-kvqkki`。建議：

- `gas-deployer-prod` — 給正式服務
- `gas-deployer-dev` — 給本地 / staging

每個 project 配自己的 OAuth Client。

## 4. OAuth Consent Screen

### Testing 階段（前 100 個測試者）
- 維持 **Testing** 狀態，把使用者加進 Test users。
- 不需要 Google 審核。

### Production 階段（公開給任何人）
- Publish app（Testing → In production）。
- 因為使用了 `script.projects` / `script.deployments` 這類「Sensitive scope」，需要 **OAuth verification**：
  - 正式網域 + DNS 驗證
  - 隱私權政策、服務條款必須在公開可存取的 URL
  - 提交「Scope justification」說明每個 scope 的用途
  - 提供英文示範影片，展示每個 scope 在 App 內的使用
  - 安全評估可能需要（依使用者規模）

審核期通常 4~8 週，建議提前申請。詳見 https://support.google.com/cloud/answer/13463073。

## 5. 更新 OAuth Redirect URIs

到 Cloud Console → APIs & Services → Credentials → 你的 OAuth Client：

加入 production URI，例如：
```
https://your-domain.com/api/auth/google/callback
```

開發的 `http://localhost:3000/...` 可以留著或拆到 dev OAuth Client。

## 6. 環境變數對照表

| 變數 | dev | prod |
|---|---|---|
| `NODE_ENV` | `development` | `production`（PaaS 通常自動設定） |
| `APP_BASE_URL` | `http://localhost:3000` | `https://your-domain.com` |
| `ENABLE_POC` | `true` | **必須 `false` 或拿掉** |
| `DATABASE_URL` | `file:./prisma/dev.db` | `postgresql://...` |
| `GOOGLE_CLOUD_PROJECT_ID` | dev project | prod project |
| `GOOGLE_OAUTH_CLIENT_ID` | dev client | prod client |
| `GOOGLE_OAUTH_CLIENT_SECRET` | dev secret | prod secret（用 secret manager 別放純文字） |
| `GOOGLE_OAUTH_REDIRECT_URI` | `http://localhost:3000/...` | `https://your-domain.com/...` |
| `SESSION_PASSWORD` | 任意 32B+ | **重新隨機** |
| `ENCRYPTION_KEY` | 任意 32B base64 | **重新隨機** |

## 7. PoC 端點

`/api/poc/*` 路由已內建守門：`NODE_ENV !== 'production' && ENABLE_POC === 'true'`。
正式環境只要 `NODE_ENV=production` 它就會回 404。但**仍建議**：
- 確認 `ENABLE_POC` 沒被誤設為 `true`
- 部署前 `npm run build` 後檢查路由列表

## 8. 監控

- **日誌**：本服務用結構化 JSON logger（`src/lib/logger.ts`）。Vercel / Cloud Run 預設收 stdout 即可。
- **錯誤追蹤**：建議接 Sentry（在 `src/lib/api-guard.ts` 的 unexpected error 分支處 capture）。本 MVP 沒包，自行加。

## 9. Apps Script API quota

預設每 user 每 100 秒 100 次呼叫。教學課堂大量使用要先到 Cloud Console → APIs & Services → Apps Script API → Quotas 申請提高。

## 10. 法律頁

確認 `/privacy`、`/terms` 內容已調整為適合你的營運單位（目前是模板）。OAuth 審核會檢查這兩頁是否存在且符合規範。
