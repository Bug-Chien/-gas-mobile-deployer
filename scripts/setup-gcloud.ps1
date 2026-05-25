# GAS Mobile Deployer — gcloud 輔助設定
#
# 範圍（刻意限縮，避免高風險指令）：
#   1. 顯示目前帳號 / 列出可選 Project
#   2. 設定要使用的 Project（gcloud config set project）
#   3. 啟用 script.googleapis.com
#
# **不在範圍內**（請手動處理）：
#   - OAuth consent screen 設定（必須在 Cloud Console UI）
#   - OAuth Web Client 建立 / 取得 Client ID / Client Secret（必須在 UI）
#   - IAM / Secrets / billing / project 刪除（風險高，settings.json 已禁止）
#
# 完成後接著看 docs/setup-oauth-client.md。

$ErrorActionPreference = 'Stop'

function Section($t) { Write-Host ""; Write-Host "==> $t" -ForegroundColor Cyan }

Section "目前 gcloud 帳號"
gcloud auth list

Section "可用 Cloud Projects"
gcloud projects list --format='table(projectId,name,projectNumber)'

$projectId = Read-Host "`n請輸入要使用的 Project ID (若要新建請先在 UI 建立後再回來)"
if ([string]::IsNullOrWhiteSpace($projectId)) {
  Write-Host "未輸入，結束。" -ForegroundColor Yellow
  exit 1
}

Section "設定使用中的 Project: $projectId"
gcloud config set project $projectId

Section "目前啟用的 Service（檢查 script API）"
gcloud services list --enabled --filter='config.name:script.googleapis.com' --format='value(config.name)'

Section "啟用 script.googleapis.com"
gcloud services enable script.googleapis.com

Section "完成"
Write-Host ""
Write-Host "下一步：" -ForegroundColor Green
Write-Host "  1. 開啟 https://console.cloud.google.com/apis/credentials/consent?project=$projectId"
Write-Host "     設定 OAuth consent screen（External + Testing），加入測試使用者。"
Write-Host "  2. 開啟 https://console.cloud.google.com/apis/credentials?project=$projectId"
Write-Host "     建立 OAuth Client ID（Web application）。"
Write-Host "     Authorized redirect URI: http://localhost:3000/api/auth/google/callback"
Write-Host "  3. 將 Client ID / Client Secret 貼到 .env.local（參考 .env.example）。"
Write-Host "  4. 詳細步驟見 docs/setup-oauth-client.md"
