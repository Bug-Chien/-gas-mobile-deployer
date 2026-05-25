# 部署到 Vercel

最簡路徑。Vercel 原生支援 Next.js 15 App Router、free tier 對小流量足夠、自動 HTTPS。

> **先看一遍** [production-checklist.md](production-checklist.md)，特別是 DB 換 PostgreSQL 與 secret 重生。

## 步驟

### 1. 準備 Postgres

選一家供應商。最快是 **Supabase**：
1. https://supabase.com → 新專案
2. Project Settings → Database → Connection string → 選「Transaction」mode（Vercel serverless 需要 pooled connection）
3. 複製 `postgresql://postgres:...` 連線字串

或 **Neon**：https://neon.tech，類似流程。

### 2. 改 Prisma datasource

```prisma
// prisma/schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

本地用 prod 連線字串跑 migration 一次：

```powershell
$env:DATABASE_URL="postgresql://..."
npx prisma migrate dev --name init
git add prisma/migrations
git commit -m "chore: add prisma postgres migration"
```

### 3. push 到 Git

Vercel 從 Git import。把專案推到 GitHub / GitLab：

```powershell
git init
git add .
git commit -m "init"
git remote add origin git@github.com:<you>/gas-mobile-deployer.git
git push -u origin main
```

> 推之前再三確認 `.env.local`、`.env`、`prisma/dev.db` 都在 `.gitignore`（已預設）。

### 4. Vercel 設定

1. https://vercel.com/new → import repo
2. **Framework Preset**: Next.js（自動偵測）
3. **Build Command**: 改成
   ```
   prisma migrate deploy && next build
   ```
   （第一次部署也會自動跑 migrate）
4. **Install Command**: `npm install`
5. **Environment Variables**：照 [production-checklist.md §6](production-checklist.md#6-環境變數對照表) 全部填。`ENABLE_POC` **不要設**（或設 `false`）。
6. Deploy。

### 5. 拿到網域後

1. 到 Cloud Console → OAuth Client → 加入 redirect URI：
   ```
   https://<your-project>.vercel.app/api/auth/google/callback
   ```
   （或你綁的自訂網域）
2. 回 Vercel → 環境變數更新：
   ```
   APP_BASE_URL=https://<your-domain>
   GOOGLE_OAUTH_REDIRECT_URI=https://<your-domain>/api/auth/google/callback
   ```
3. Redeploy。

### 6. 驗證

開 production URL → 登入 → 建立測試專案 → 部署 Web App → 取得 `/macros/s/.../exec`。

## Vercel 特殊注意事項

### Serverless cold start
Prisma client 第一次 cold start 約 1–2 秒。本服務的儲存流程已是「按按鈕等回應」，使用者不會感受到。

### Connection pool
Supabase / Neon 提供 PgBouncer pooled 連線，**必須用 pooled URL**（通常 port 6543）作 `DATABASE_URL`。否則高峰會 connection exhausted。

### Function timeout
免費方案 10 秒，Hobby 10 秒，Pro 60 秒。`projects.updateContent` 上傳大檔可能逼近 10 秒，必要時升 Pro 或拆檔。

### Build cache
Prisma generate 結果會被 cache 在 `node_modules/.prisma`。schema 改了若沒重新 install，需在 Vercel 介面點 Redeploy → Clear cache。

## 故障排除

| 症狀 | 處理 |
|---|---|
| Build 失敗 `Cannot find module '@prisma/client'` | 加 `postinstall: prisma generate` 到 package.json |
| Login 一直跳 invalid_redirect_uri | OAuth Client 的 redirect URIs 沒加 prod 網域 |
| 登入後立刻 500 | DB 沒跑 migration，或 `DATABASE_URL` 不是 pooled |
| Session 一直失效 | `SESSION_PASSWORD` 環境變數沒設或 < 32 字 |
| Token 解密失敗 | 換 `ENCRYPTION_KEY` 後既有 token 失效，使用者重新登入即可 |
