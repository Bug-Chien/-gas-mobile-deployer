# 部署到 Cloud Run

適合：想跟現有 GCP 環境整合、或想避開 Vercel 函式 timeout / cold start 行為。

> **先看一遍** [production-checklist.md](production-checklist.md)，特別是 DB 換 PostgreSQL 與 secret 重生。

## 前置

- `gcloud` 已安裝且登入。
- 一個 production Cloud Project（不要跟 OAuth dev project 共用，建議分開）。
- PostgreSQL 連線字串（Supabase / Neon / Cloud SQL Postgres 皆可）。

## 步驟

### 1. 啟用必要服務

```bash
PROJECT=gas-deployer-prod   # 你的 prod project id
gcloud config set project $PROJECT
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com secretmanager.googleapis.com
```

### 2. 建立 Artifact Registry repo

```bash
REGION=asia-east1
gcloud artifacts repositories create gas-deployer \
  --repository-format=docker \
  --location=$REGION \
  --description="GAS Mobile Deployer images"
```

### 3. 把 secret 放到 Secret Manager

```bash
# 產生並上傳
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" \
  | gcloud secrets create gas-deployer-session-password --data-file=-

node -e "console.log(require('crypto').randomBytes(32).toString('base64'))" \
  | gcloud secrets create gas-deployer-encryption-key --data-file=-

# 已有的 OAuth client secret
echo -n "GOCSPX-..." | gcloud secrets create gas-deployer-google-oauth-secret --data-file=-

# DB URL
echo -n "postgresql://..." | gcloud secrets create gas-deployer-database-url --data-file=-
```

### 4. 改 prisma schema

```diff
- provider = "sqlite"
+ provider = "postgresql"
```

跑一次 migration 進 prod DB：

```bash
DATABASE_URL="postgresql://..." npx prisma migrate dev --name init
git add prisma/migrations
git commit -m "chore: add prisma postgres migration"
```

### 5. Build + Push image

從專案根目錄：

```bash
IMAGE=$REGION-docker.pkg.dev/$PROJECT/gas-deployer/web:$(date +%Y%m%d-%H%M%S)
gcloud builds submit --tag $IMAGE
```

（會用 Cloud Build 跑 Docker build；本機不需要 docker daemon）

### 6. 部署到 Cloud Run

```bash
gcloud run deploy gas-deployer \
  --image=$IMAGE \
  --region=$REGION \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --min-instances=0 \
  --max-instances=10 \
  --memory=512Mi \
  --cpu=1 \
  --timeout=60s \
  --set-env-vars="NODE_ENV=production,APP_BASE_URL=https://<填部署後拿到的網址>,GOOGLE_CLOUD_PROJECT_ID=$PROJECT,GOOGLE_OAUTH_CLIENT_ID=<your-client-id>,GOOGLE_OAUTH_REDIRECT_URI=https://<填部署後拿到的網址>/api/auth/google/callback" \
  --set-secrets="GOOGLE_OAUTH_CLIENT_SECRET=gas-deployer-google-oauth-secret:latest,SESSION_PASSWORD=gas-deployer-session-password:latest,ENCRYPTION_KEY=gas-deployer-encryption-key:latest,DATABASE_URL=gas-deployer-database-url:latest"
```

部署完會印出 URL，例如 `https://gas-deployer-xxx-uc.a.run.app`。

### 7. 二次部署：填入真實 URL

第一次部署用佔位 URL，拿到真實 URL 後再跑一次：

```bash
RUN_URL=$(gcloud run services describe gas-deployer --region=$REGION --format='value(status.url)')

gcloud run services update gas-deployer --region=$REGION \
  --update-env-vars="APP_BASE_URL=$RUN_URL,GOOGLE_OAUTH_REDIRECT_URI=$RUN_URL/api/auth/google/callback"
```

### 8. 加 OAuth redirect URI

Cloud Console → APIs & Services → Credentials → 你的 prod OAuth Client → Authorized redirect URIs：

```
https://gas-deployer-xxx-uc.a.run.app/api/auth/google/callback
```

或你綁的自訂網域。

### 9. 驗證

```bash
open $RUN_URL
```

登入 → 建立測試專案 → 部署 Web App。

## 維運

### 更新版本

```bash
IMAGE=$REGION-docker.pkg.dev/$PROJECT/gas-deployer/web:$(date +%Y%m%d-%H%M%S)
gcloud builds submit --tag $IMAGE
gcloud run services update gas-deployer --region=$REGION --image=$IMAGE
```

### 看日誌

```bash
gcloud run services logs read gas-deployer --region=$REGION --limit=100
```

我們用結構化 JSON logger，可直接在 Cloud Logging 用 jsonPayload 欄位過濾。

### 改環境變數 / secret

```bash
gcloud run services update gas-deployer --region=$REGION \
  --update-env-vars="KEY=value"

gcloud run services update gas-deployer --region=$REGION \
  --update-secrets="KEY=secret-name:latest"
```

### Migration

Dockerfile 的 CMD 已內建 `prisma migrate deploy`，每次新 revision 啟動時自動跑。
這保證 image 與 schema 一致；但如果 migration 失敗，container 會啟動失敗、舊 revision 繼續服務。

## 常見問題

| 症狀 | 原因 | 處理 |
|---|---|---|
| 容器啟動失敗 `Cannot find module .prisma` | Dockerfile 沒複製 `.prisma`，或 builder stage 沒跑 `prisma generate` | 確認 Dockerfile 步驟齊全 |
| `PrismaClientInitializationError` | DB URL 錯或 Supabase 沒開外部連線 | 檢查 `DATABASE_URL`、Supabase IPv6/IPv4 設定 |
| 第二次部署登入失敗 | 改了 `APP_BASE_URL` 但 OAuth Client redirect URIs 沒更新 | 到 Cloud Console 補上 |
| 日誌看到 token 字串 | **嚴重 bug**，立刻撤銷 OAuth Client、輪換 ENCRYPTION_KEY | 檢查是否誤 log 了 OAuth 物件 |
