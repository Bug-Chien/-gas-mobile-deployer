# GAS Mobile Deployer 開發規格書

版本：v0.1  
文件角色：系統規劃師 / 產品規格 / 工程開發依據  
專案定位：手機友善的 Google Apps Script 程式碼管理、設定與部署工具  
建議產品名稱：GAS Mobile Deployer / GAS 手機部署助手 / GAS 快速上架工具

---

## 1. 專案背景

Google Apps Script 是許多行政自動化、表單處理、LINE Bot、Google Sheets 後台、Web App 小工具常用的開發平台。但官方 Apps Script 編輯器在手機上的操作體驗不佳，尤其在以下情境中容易卡住：

1. 手機上不方便編輯多個 `.gs`、`.html`、`appsscript.json` 檔案。
2. 不方便複製貼上大量程式碼。
3. 不方便修改 manifest 設定。
4. 不方便建立版本與重新部署 Web App。
5. 不方便查看 deployment ID、Web App URL、版本紀錄。
6. 對非工程背景使用者而言，Apps Script 編輯器、部署設定、權限授權流程門檻較高。

本專案希望開發一個網頁工具，讓使用者登入 Google 帳號後，可以在手機或平板上完成 GAS 專案的程式碼管理與部署。

---

## 2. 專案目標

### 2.1 核心目標

建立一個手機優先的 GAS 專案管理平台，讓使用者可以：

1. 使用 Google 帳號登入。
2. 讀取自己的 Apps Script 專案。
3. 建立新的 Apps Script 專案。
4. 編輯、貼上、刪除、重新命名 GAS 專案檔案。
5. 管理 `appsscript.json` 常用設定。
6. 儲存程式碼到 Apps Script 專案。
7. 建立版本。
8. 建立或更新部署。
9. 取得 Web App URL、Deployment ID、版本資訊。
10. 套用常用模板，例如 LINE Bot、Google Form 自動回信、Google Sheets 後台、簡易 Web App。

### 2.2 不建議的定位

不建議產品定位為：

> 在手機瀏覽器直接使用 Google Apps Script CLI。

原因：

1. `clasp` 是 Node.js CLI，原生執行環境不在瀏覽器端。
2. 若要使用 `clasp`，應放在後端 worker 或 CI/CD 環境。
3. 直接在前端處理 refresh token 或執行 CLI 會產生安全風險。
4. Google Apps Script API 已經能處理多數核心需求。

### 2.3 建議定位

建議產品定位為：

> 一個讓使用者不用打開 Apps Script 編輯器，也不用電腦，就能在手機上編輯、設定、上傳與部署 Apps Script 專案的網頁工具。

---

## 3. 產品範圍

### 3.1 MVP 必做範圍

| 模組 | 功能 |
|---|---|
| 使用者登入 | Google OAuth 登入 |
| 專案管理 | 輸入 Script ID、讀取專案、建立新專案 |
| 檔案管理 | 新增、編輯、刪除、重新命名 `.gs`、`.html`、`.json` |
| 程式碼編輯 | 手機友善編輯器、複製貼上、搜尋、格式輔助 |
| Manifest 管理 | 編輯 `appsscript.json`，提供視覺化常用欄位 |
| 儲存 | 將完整專案 files 陣列更新到 GAS HEAD |
| 版本管理 | 建立版本、版本描述、查看版本列表 |
| 部署管理 | 建立部署、更新既有部署、查看 Deployment ID |
| Web App 輔助 | 顯示 Web App URL、複製連結 |
| 範本 | LINE Bot、Google Sheet Web App、表單自動回信 |

### 3.2 第二階段範圍

| 模組 | 功能 |
|---|---|
| 觸發器管理 | 產生安裝觸發器程式碼，或透過 Apps Script 執行初始化函式 |
| 執行函式 | 呼叫 Apps Script API 執行指定 function |
| 日誌查看 | 整合 Cloud Logging 或執行結果回傳 |
| GitHub 匯入 | 從 GitHub Repository 匯入 GAS 專案 |
| AI 輔助修正 | 自動檢查 manifest、scope、doGet/doPost、常見部署錯誤 |
| 專案備份 | 將每次儲存內容備份到資料庫 |
| 團隊協作 | 專案分享、多人共編、角色權限 |

### 3.3 暫不納入 MVP 的範圍

| 功能 | 原因 |
|---|---|
| 完整取代 Apps Script IDE | 官方 IDE 功能太多，MVP 不應承諾全覆蓋 |
| 直接在瀏覽器執行 clasp | 技術與資安風險高 |
| Marketplace Add-on 發布 | 需要更複雜的 OAuth 驗證、審核、Cloud Project 管理 |
| 完整 Cloud Project 管理 | 涉及 Google Cloud 權限、API 啟用、帳單與組織政策 |
| 跨帳號部署代管 | 會涉及高敏感 token 與授權責任 |

---

## 4. 使用者角色

### 4.1 一般使用者

對象：行政人員、講師、補習班老師、小型企業內勤、非工程背景使用者。

需求：

1. 複製老師或 AI 給的 GAS 程式碼。
2. 貼到工具裡。
3. 修改少量設定。
4. 一鍵儲存與部署。
5. 拿到 Web App URL 或部署結果。

### 4.2 進階使用者

對象：GAS 開發者、講師、系統導入顧問。

需求：

1. 管理多個 Apps Script 專案。
2. 編輯多檔案專案。
3. 控制 manifest、OAuth scopes、版本與 deployments。
4. 建立教學模板。
5. 快速協助客戶或學生部署。

### 4.3 管理者

對象：平台擁有者、技術維護人員。

需求：

1. 查看使用量。
2. 管理系統錯誤。
3. 管理 OAuth App 狀態。
4. 監控 API quota。
5. 管理模板庫。

---

## 5. 使用情境

### 5.1 手機貼上 LINE Bot 程式碼並部署

1. 使用者用手機打開工具。
2. 點選「Google 登入」。
3. 建立新 GAS 專案。
4. 選擇「LINE Bot Webhook 範本」。
5. 貼上 Channel Access Token、Channel Secret。
6. 點擊「儲存到 GAS」。
7. 點擊「建立版本」。
8. 點擊「部署為 Web App」。
9. 系統顯示 Web App URL。
10. 使用者複製 URL 到 LINE Developers 後台。

### 5.2 既有 GAS 專案快速重新部署

1. 使用者輸入 Script ID 或從專案列表選擇。
2. 系統讀取檔案內容。
3. 使用者修改 `Code.gs`。
4. 點擊「儲存」。
5. 系統建立新版本。
6. 使用者選擇既有 deployment。
7. 點擊「更新部署」。
8. Web App URL 維持不變，程式內容更新。

### 5.3 教學課堂使用

1. 講師給學生一組範本。
2. 學生手機登入。
3. 學生選擇範本。
4. 貼上指定設定。
5. 一鍵建立專案與部署。
6. 課堂中所有學生都能完成上架。

---

## 6. 系統架構

### 6.1 建議架構總覽

```text
[使用者手機 / 桌機瀏覽器]
        |
        v
[前端 Web App / PWA]
        |
        v
[後端 API Server]
        |
        +--> [Google OAuth 2.0]
        |
        +--> [Google Apps Script API]
        |
        +--> [Google Drive API 可選]
        |
        +--> [資料庫]
        |
        +--> [選配 clasp Worker]
```

### 6.2 架構原則

1. 前端不直接保存 refresh token。
2. 前端不直接執行 clasp CLI。
3. Apps Script API 為主要整合方式。
4. 後端負責 OAuth token refresh、API 呼叫、錯誤轉譯。
5. 資料庫只保存必要的專案索引、使用紀錄、版本快照與加密 token。
6. 使用者可隨時解除授權與刪除平台資料。

### 6.3 技術選型建議

| 層級 | 建議技術 |
|---|---|
| 前端 | Next.js / React |
| UI | Tailwind CSS、shadcn/ui |
| 手機編輯器 | CodeMirror 6 |
| 後端 | Next.js API Route / NestJS / Express |
| OAuth | Google OAuth 2.0 Authorization Code Flow |
| API Client | googleapis Node.js client |
| 資料庫 | PostgreSQL / Supabase |
| 快取 | Redis，可選 |
| Token 加密 | KMS / AES-GCM / Supabase Vault |
| 部署 | Vercel + Cloud Run，或全站 Cloud Run |
| Worker | Cloud Run Job / BullMQ Worker，可選 |
| 日誌 | Cloud Logging / Sentry |

---

## 7. Google API 整合策略

### 7.1 核心 API

本工具核心使用 Google Apps Script API。

主要操作：

| 功能 | API 操作 |
|---|---|
| 建立專案 | `projects.create` |
| 讀取專案內容 | `projects.getContent` |
| 更新專案內容 | `projects.updateContent` |
| 建立版本 | `projects.versions.create` |
| 查看版本 | `projects.versions.list` |
| 建立部署 | `projects.deployments.create` |
| 更新部署 | `projects.deployments.update` |
| 查看部署 | `projects.deployments.list` |

### 7.2 updateContent 重要限制

`projects.updateContent` 不是單檔更新，而是用新的 `files` 陣列覆蓋整個專案內容。

因此系統必須：

1. 先讀取完整 files。
2. 在前端或後端維護完整檔案狀態。
3. 使用者新增、刪除、編輯檔案後，重新組出完整 files 陣列。
4. 確保一定包含 `appsscript` manifest 檔案。
5. 儲存前進行 JSON 驗證。

錯誤設計會導致：

1. 原本檔案被清空。
2. manifest 遺失。
3. 專案無法正常部署。
4. 使用者以為只改 A 檔案，結果 B 檔案被刪除。

### 7.3 Apps Script 檔案格式

Apps Script API 使用的 file 結構大致如下：

```json
{
  "name": "Code",
  "type": "SERVER_JS",
  "source": "function doGet() { return HtmlService.createHtmlOutput('Hello'); }"
}
```

常見類型：

| GAS 檔案 | API type | 說明 |
|---|---|---|
| `.gs` | `SERVER_JS` | 伺服端 Apps Script 程式碼 |
| `.html` | `HTML` | HTML 檔案 |
| `appsscript.json` | `JSON` | manifest，API 中名稱通常為 `appsscript` |

### 7.4 Deployment 與 Version 概念

Apps Script 中，Version 與 Deployment 是不同概念。

| 名稱 | 說明 |
|---|---|
| HEAD | 目前最新儲存的程式碼，用於開發與測試 |
| Version | 不可變的程式碼快照 |
| Deployment | 將某個版本發布為 Web App、API executable、add-on 等使用形式 |

更新既有 Web App 的標準流程：

1. 儲存最新程式碼到 HEAD。
2. 建立新 Version。
3. 將既有 Deployment 更新到新 Version。
4. Deployment ID 與 Web App URL 維持不變。

---

## 8. OAuth 與權限設計

### 8.1 OAuth Flow

建議使用 Authorization Code Flow。

流程：

1. 使用者點擊「使用 Google 登入」。
2. 導向 Google OAuth Consent Screen。
3. 使用者授權。
4. Google redirect 回後端 callback。
5. 後端取得 authorization code。
6. 後端交換 access token 與 refresh token。
7. 後端加密保存 refresh token。
8. 前端使用 session cookie 或 JWT 與後端互動。

### 8.2 建議 OAuth Scopes

MVP 最小權限建議：

```text
openid
email
profile
https://www.googleapis.com/auth/script.projects
https://www.googleapis.com/auth/script.deployments
```

若需要列出 Google Drive 中的 Apps Script 專案，可能需要加入 Drive 相關 scope。但 MVP 可先避免過度請求 Drive 權限，改用輸入 Script ID 或使用 Apps Script API 建立專案。

### 8.3 權限策略

1. 優先使用最小必要權限。
2. MVP 避免 Gmail、Calendar、Drive 全域存取等高敏感權限。
3. 若模板需要 Gmail 或 Sheets scope，應該是寫入使用者的 `appsscript.json`，不是平台本身 OAuth 一開始就要求全部 scope。
4. 平台自己的 OAuth scopes 與使用者 GAS 專案的 `oauthScopes` 要分開理解。
5. 平台需要的是「管理 Apps Script 專案」的權限。
6. GAS 專案需要的是「執行該腳本時」要存取 Google 服務的權限。

### 8.4 OAuth 驗證風險

若產品要公開給大量使用者，使用敏感 scopes 時可能需要 Google OAuth App Verification。

建議準備：

1. 正式網域。
2. 隱私權政策頁。
3. 服務條款頁。
4. OAuth consent screen 品牌資訊。
5. 使用者資料刪除機制。
6. 說明影片，展示每個 scope 的使用目的。
7. 資料安全與 token 保存說明。

---

## 9. 功能需求規格

## 9.1 登入模組

### 功能說明

使用 Google 帳號登入系統，授權平台管理 Apps Script 專案。

### 使用者故事

作為使用者，我希望可以直接用 Google 帳號登入，讓系統可以讀取與更新我的 GAS 專案。

### 功能需求

| 編號 | 需求 |
|---|---|
| AUTH-001 | 使用者可以點擊 Google 登入 |
| AUTH-002 | 系統導向 Google OAuth 授權頁 |
| AUTH-003 | 授權成功後回到系統首頁 |
| AUTH-004 | 系統顯示使用者名稱與 Email |
| AUTH-005 | 使用者可以登出 |
| AUTH-006 | 使用者可以解除平台授權並刪除本地資料 |

### 驗收條件

1. 使用者首次登入會看到 Google 授權畫面。
2. 登入後可以進入專案列表或建立專案頁。
3. 登出後無法呼叫專案 API。
4. refresh token 不得出現在前端。

---

## 9.2 專案管理模組

### 功能說明

讓使用者建立或開啟 Apps Script 專案。

### 功能需求

| 編號 | 需求 |
|---|---|
| PROJ-001 | 使用者可以建立新的 GAS 專案 |
| PROJ-002 | 使用者可以輸入 Script ID 讀取既有專案 |
| PROJ-003 | 系統可以顯示專案名稱、Script ID、最後同步時間 |
| PROJ-004 | 系統可以將使用者曾開啟的專案加入最近清單 |
| PROJ-005 | 系統可以重新整理專案內容 |
| PROJ-006 | 系統可以顯示專案是否存在本地未儲存變更 |

### 專案建立流程

1. 使用者輸入專案名稱。
2. 系統呼叫 `projects.create`。
3. 系統建立預設檔案：
   - `Code.gs`
   - `appsscript.json`
4. 系統進入編輯器畫面。

### Script ID 開啟流程

1. 使用者貼上 Script ID。
2. 系統呼叫 `projects.getContent`。
3. 若成功，解析 files。
4. 顯示檔案樹與編輯器。
5. 將專案加入最近清單。

---

## 9.3 檔案管理模組

### 功能需求

| 編號 | 需求 |
|---|---|
| FILE-001 | 使用者可以查看檔案列表 |
| FILE-002 | 使用者可以新增 `.gs` 檔案 |
| FILE-003 | 使用者可以新增 `.html` 檔案 |
| FILE-004 | 使用者可以編輯 `appsscript.json` |
| FILE-005 | 使用者可以重新命名檔案 |
| FILE-006 | 使用者可以刪除檔案 |
| FILE-007 | 系統禁止刪除最後一個 manifest 檔案 |
| FILE-008 | 系統檢查檔名不可重複 |
| FILE-009 | 系統檢查檔名不可包含副檔名衝突 |
| FILE-010 | 系統可以將 `.gs`、`.html`、manifest 轉成 API files 陣列 |

### 檔名規則

使用者看到：

```text
Code.gs
Index.html
appsscript.json
```

送到 Apps Script API 時：

```json
{
  "name": "Code",
  "type": "SERVER_JS"
}
```

```json
{
  "name": "Index",
  "type": "HTML"
}
```

```json
{
  "name": "appsscript",
  "type": "JSON"
}
```

---

## 9.4 程式碼編輯模組

### 功能需求

| 編號 | 需求 |
|---|---|
| EDIT-001 | 支援手機版程式碼編輯 |
| EDIT-002 | 支援複製貼上大量程式碼 |
| EDIT-003 | 支援搜尋文字 |
| EDIT-004 | 支援復原與重做 |
| EDIT-005 | 支援基本語法高亮 |
| EDIT-006 | 支援 JSON 格式檢查 |
| EDIT-007 | 支援未儲存提醒 |
| EDIT-008 | 支援離開頁面前確認 |
| EDIT-009 | 支援快速插入常用片段 |
| EDIT-010 | 支援一鍵格式化 JSON |

### 手機 UX 重點

1. 編輯區高度要適應鍵盤彈出。
2. 檔案列表可以用抽屜式側欄呈現。
3. 常用操作要放底部固定工具列。
4. 儲存、部署等高風險操作要有明確狀態提示。
5. 長按貼上與全選不能被 UI 干擾。

---

## 9.5 Manifest 設定模組

### 功能說明

使用者可以直接編輯 `appsscript.json`，也可以透過表單修改常用設定。

### 常用設定

| 欄位 | 說明 |
|---|---|
| `timeZone` | 專案時區，例如 `Asia/Taipei` |
| `exceptionLogging` | 例外記錄方式 |
| `runtimeVersion` | V8 runtime |
| `oauthScopes` | 明確指定 OAuth scopes |
| `webapp.executeAs` | Web App 執行身分 |
| `webapp.access` | Web App 存取權限 |
| `dependencies` | 函式庫依賴 |
| `enabledAdvancedServices` | 啟用進階服務資訊 |

### 視覺化表單需求

| 編號 | 需求 |
|---|---|
| MAN-001 | 顯示目前 manifest JSON |
| MAN-002 | 提供表單切換時區 |
| MAN-003 | 提供 OAuth scopes 新增 / 刪除功能 |
| MAN-004 | 提供 Web App 執行身分設定 |
| MAN-005 | 提供 Web App 存取權限設定 |
| MAN-006 | 儲存前檢查 JSON 格式 |
| MAN-007 | 若 manifest 缺少必要欄位，提供自動補齊 |

### 預設 manifest

```json
{
  "timeZone": "Asia/Taipei",
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "webapp": {
    "executeAs": "USER_DEPLOYING",
    "access": "ANYONE"
  }
}
```

---

## 9.6 儲存模組

### 功能說明

將目前編輯器中的完整專案內容同步到 Apps Script HEAD。

### 儲存流程

1. 前端檢查所有檔案狀態。
2. 檢查是否存在 `appsscript.json`。
3. 檢查 manifest JSON 是否合法。
4. 組成 Apps Script API `files` 陣列。
5. 呼叫後端 API。
6. 後端呼叫 `projects.updateContent`。
7. 成功後更新本地同步時間。
8. 將 dirty state 設為 false。
9. 建立本地備份紀錄。

### 風險控管

因為 `updateContent` 會覆蓋全部檔案，儲存前必須：

1. 重新確認 files 陣列不為空。
2. 確認包含 manifest。
3. 若遠端版本在本地讀取後有變動，顯示衝突提醒。
4. 儲存前可自動建立本地 snapshot。

---

## 9.7 版本管理模組

### 功能需求

| 編號 | 需求 |
|---|---|
| VER-001 | 使用者可以建立新版本 |
| VER-002 | 使用者可以輸入版本描述 |
| VER-003 | 系統可以顯示版本列表 |
| VER-004 | 系統可以查看版本號與建立時間 |
| VER-005 | 系統可以用指定版本建立部署 |

### 建立版本流程

1. 檢查是否有未儲存變更。
2. 若有未儲存變更，提示先儲存。
3. 使用者輸入描述，例如：`手機部署助手 v1`。
4. 後端呼叫 `projects.versions.create`。
5. 回傳 versionNumber。
6. 系統顯示建立成功。

---

## 9.8 部署管理模組

### 功能需求

| 編號 | 需求 |
|---|---|
| DEP-001 | 使用者可以查看 deployments 列表 |
| DEP-002 | 使用者可以建立新 deployment |
| DEP-003 | 使用者可以更新既有 deployment 到新版本 |
| DEP-004 | 使用者可以輸入 deployment 描述 |
| DEP-005 | 系統可以顯示 deployment ID |
| DEP-006 | 系統可以顯示 Web App URL 或可複製的部署資訊 |
| DEP-007 | 系統可以保留最近一次部署紀錄 |

### 新部署流程

1. 使用者確認已建立 version。
2. 選擇 deployment 類型，MVP 以 Web App 為主。
3. 設定描述。
4. 呼叫 `projects.deployments.create`。
5. 回傳 deployment 資訊。
6. 顯示部署成功。

### 更新既有部署流程

1. 系統列出既有 deployments。
2. 使用者選擇要更新的 deployment。
3. 建立新版本。
4. 呼叫 `projects.deployments.update`。
5. deployment 指向新 version。
6. 原 Web App URL 維持不變。

### 部署引導文案

部署成功後顯示：

```text
部署完成！

Deployment ID：xxxxxxxx
Web App URL：https://script.google.com/macros/s/xxxxxxx/exec

下一步：
1. 如果這是 LINE Bot，請將 Web App URL 貼到 LINE Developers 的 Webhook URL。
2. 如果這是表單或試算表工具，請先打開連結測試授權。
3. 第一次執行時，Google 可能會要求你授權此 Apps Script 專案。
```

---

## 9.9 範本模組

### 功能說明

提供常見 GAS 應用模板，降低非工程使用者門檻。

### MVP 範本

| 範本 | 檔案 | 用途 |
|---|---|---|
| Hello Web App | `Code.gs` | 測試部署 |
| LINE Bot Echo | `Code.gs` | LINE Webhook 回覆訊息 |
| Google Form Auto Reply | `Code.gs` | 表單送出後自動寄信 |
| Google Sheets Web App | `Code.gs`、`Index.html` | 用 Web App 讀寫試算表 |
| Simple Admin Panel | `Code.gs`、`Index.html` | 簡易後台頁面 |

### 範本結構

```json
{
  "templateId": "line-bot-echo",
  "name": "LINE Bot Echo 範本",
  "description": "建立一個可以接收 LINE Webhook 並回覆訊息的 Apps Script 專案。",
  "files": [
    {
      "name": "Code.gs",
      "type": "SERVER_JS",
      "source": "..."
    },
    {
      "name": "appsscript.json",
      "type": "JSON",
      "source": "..."
    }
  ],
  "requiredSettings": [
    {
      "key": "LINE_CHANNEL_ACCESS_TOKEN",
      "label": "LINE Channel Access Token",
      "type": "password"
    }
  ]
}
```

---

## 10. 非功能需求

### 10.1 效能需求

| 項目 | 目標 |
|---|---|
| 首頁載入 | 3 秒內可互動 |
| 開啟小型 GAS 專案 | 5 秒內完成 |
| 儲存專案 | 10 秒內完成 |
| 建立版本 | 10 秒內完成 |
| 部署 | 15 秒內完成 |
| 手機操作 | 主要操作不超過 3 次點擊 |

### 10.2 安全需求

1. refresh token 必須加密保存。
2. access token 不得寫入前端 localStorage。
3. API 必須驗證使用者 session。
4. 使用者只能存取自己的專案紀錄。
5. 後端 log 不得記錄 token。
6. 程式碼內容備份若保存資料庫，需明確告知使用者。
7. 使用者可刪除平台保存的專案快照。
8. 對所有 Google API error 做安全轉譯，不回傳敏感資訊。

### 10.3 可用性需求

1. 手機優先設計。
2. 可安裝成 PWA。
3. 支援深色模式。
4. 重要操作要有二次確認。
5. 錯誤訊息要轉成白話說明。
6. 儲存與部署流程要有進度提示。

### 10.4 維護性需求

1. 前後端型別共用。
2. API 回應格式統一。
3. Google API wrapper 獨立封裝。
4. OAuth token 管理獨立封裝。
5. 模板庫獨立成 JSON 或資料表。
6. 錯誤碼要集中管理。

---

## 11. 資料庫設計

### 11.1 users

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | uuid | 使用者 ID |
| google_sub | text | Google 使用者唯一 ID |
| email | text | 使用者 Email |
| name | text | 使用者名稱 |
| avatar_url | text | 頭像 |
| created_at | timestamp | 建立時間 |
| updated_at | timestamp | 更新時間 |

### 11.2 oauth_tokens

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | uuid | token 紀錄 ID |
| user_id | uuid | 對應 users |
| provider | text | google |
| encrypted_refresh_token | text | 加密 refresh token |
| scope | text | 授權 scope |
| expiry_date | timestamp | access token 到期時間，可選 |
| created_at | timestamp | 建立時間 |
| updated_at | timestamp | 更新時間 |

### 11.3 script_projects

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | uuid | 系統內部 ID |
| user_id | uuid | 擁有者 |
| script_id | text | Apps Script Script ID |
| title | text | 專案名稱 |
| last_synced_at | timestamp | 最後同步時間 |
| last_deployed_at | timestamp | 最後部署時間 |
| created_at | timestamp | 建立時間 |
| updated_at | timestamp | 更新時間 |

### 11.4 project_snapshots

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | uuid | snapshot ID |
| project_id | uuid | 對應專案 |
| user_id | uuid | 使用者 |
| source | jsonb | 完整 files 快照 |
| reason | text | save / deploy / manual_backup |
| created_at | timestamp | 建立時間 |

### 11.5 deployments

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | uuid | 系統內部 ID |
| project_id | uuid | 對應專案 |
| deployment_id | text | Google deployment ID |
| version_number | int | 對應版本 |
| description | text | 描述 |
| web_app_url | text | Web App URL，可選 |
| created_at | timestamp | 建立時間 |
| updated_at | timestamp | 更新時間 |

### 11.6 templates

| 欄位 | 型別 | 說明 |
|---|---|---|
| id | text | 範本 ID |
| name | text | 範本名稱 |
| description | text | 範本描述 |
| category | text | 分類 |
| files | jsonb | 範本檔案 |
| settings_schema | jsonb | 使用者需填欄位 |
| is_public | boolean | 是否公開 |
| created_at | timestamp | 建立時間 |
| updated_at | timestamp | 更新時間 |

---

## 12. 後端 API 設計

### 12.1 API 回應格式

成功：

```json
{
  "success": true,
  "data": {}
}
```

失敗：

```json
{
  "success": false,
  "error": {
    "code": "GOOGLE_AUTH_REQUIRED",
    "message": "需要重新授權 Google 帳號。",
    "detail": "..."
  }
}
```

### 12.2 Auth API

| Method | Path | 說明 |
|---|---|---|
| GET | `/api/auth/google/start` | 開始 Google OAuth |
| GET | `/api/auth/google/callback` | OAuth callback |
| POST | `/api/auth/logout` | 登出 |
| GET | `/api/me` | 取得目前使用者 |
| DELETE | `/api/me` | 刪除帳號與本地資料 |

### 12.3 Project API

| Method | Path | 說明 |
|---|---|---|
| POST | `/api/projects` | 建立 GAS 專案 |
| GET | `/api/projects/recent` | 最近開啟專案 |
| POST | `/api/projects/open` | 用 Script ID 開啟專案 |
| GET | `/api/projects/:scriptId/content` | 取得專案內容 |
| PUT | `/api/projects/:scriptId/content` | 儲存完整專案內容 |

### 12.4 Version API

| Method | Path | 說明 |
|---|---|---|
| GET | `/api/projects/:scriptId/versions` | 取得版本列表 |
| POST | `/api/projects/:scriptId/versions` | 建立版本 |

### 12.5 Deployment API

| Method | Path | 說明 |
|---|---|---|
| GET | `/api/projects/:scriptId/deployments` | 取得部署列表 |
| POST | `/api/projects/:scriptId/deployments` | 建立部署 |
| PATCH | `/api/projects/:scriptId/deployments/:deploymentId` | 更新既有部署 |

### 12.6 Template API

| Method | Path | 說明 |
|---|---|---|
| GET | `/api/templates` | 取得模板列表 |
| GET | `/api/templates/:templateId` | 取得模板內容 |
| POST | `/api/projects/from-template` | 用模板建立專案 |

---

## 13. 前端頁面規劃

### 13.1 頁面架構

```text
/
/login
/dashboard
/projects/new
/projects/open
/editor/:scriptId
/editor/:scriptId/settings
/editor/:scriptId/versions
/editor/:scriptId/deployments
/templates
/account
```

### 13.2 Dashboard

顯示：

1. 使用者資訊。
2. 最近開啟專案。
3. 建立新專案按鈕。
4. 輸入 Script ID 按鈕。
5. 範本入口。

### 13.3 Editor

手機版 Layout：

```text
[上方列]
專案名稱 / 儲存狀態 / 更多

[檔案切換列]
Code.gs | Index.html | appsscript.json

[程式碼編輯器]

[底部操作列]
檔案 | 儲存 | 版本 | 部署 | 設定
```

桌機版 Layout：

```text
左側：檔案樹
中間：程式碼編輯器
右側：專案資訊 / 部署資訊 / AI 輔助
底部：狀態列
```

### 13.4 部署頁

顯示：

1. 目前最新版本。
2. 是否有未儲存變更。
3. 建立新版本按鈕。
4. 既有 deployments 清單。
5. 新建 deployment 按鈕。
6. 更新 deployment 按鈕。
7. Web App URL 複製按鈕。
8. 部署成功教學提示。

---

## 14. 錯誤處理設計

### 14.1 常見錯誤碼

| 錯誤碼 | 使用者訊息 | 處理方式 |
|---|---|---|
| GOOGLE_AUTH_REQUIRED | Google 授權已失效，請重新登入。 | 導向登入 |
| SCRIPT_NOT_FOUND | 找不到這個 GAS 專案，請確認 Script ID。 | 請使用者檢查 ID |
| PERMISSION_DENIED | 你沒有權限存取這個專案。 | 提醒使用正確帳號 |
| INVALID_MANIFEST | appsscript.json 格式錯誤。 | 顯示 JSON 錯誤位置 |
| MISSING_MANIFEST | 專案缺少 appsscript.json。 | 提供自動建立 |
| EMPTY_FILES | 儲存失敗：專案檔案不可為空。 | 阻止儲存 |
| UPDATE_CONTENT_FAILED | 儲存到 GAS 失敗。 | 顯示重試 |
| VERSION_CREATE_FAILED | 建立版本失敗。 | 顯示原因 |
| DEPLOYMENT_FAILED | 部署失敗。 | 顯示部署檢查清單 |
| OAUTH_SCOPE_MISSING | 權限不足，需要重新授權。 | 重新 OAuth |
| RATE_LIMITED | Google API 暫時達到流量限制。 | 稍後重試 |

### 14.2 錯誤訊息原則

1. 不直接顯示 Google 原始錯誤長文。
2. 將錯誤翻譯成使用者能理解的中文。
3. 顯示「可能原因」與「建議處理」。
4. 高階錯誤可展開看 technical detail。

範例：

```text
部署失敗

可能原因：
1. 尚未建立版本。
2. appsscript.json 的 webapp 設定不完整。
3. Google 授權權限不足。

建議處理：
請先點選「儲存」，再點選「建立版本」，最後重新部署。
```

---

## 15. 安全與隱私設計

### 15.1 Token 保護

1. refresh token 使用 KMS 或應用層加密。
2. 加密金鑰不得寫入程式碼庫。
3. refresh token 不出現在 log。
4. 使用者刪除帳號時，同步刪除 token。
5. 提供解除 Google 授權指引。

### 15.2 程式碼內容保存策略

有兩種模式：

#### 模式 A：不保存程式碼內容

優點：隱私風險低。  
缺點：無法提供版本快照、復原功能。

#### 模式 B：保存程式碼快照

優點：可復原、可比較、可提供歷史紀錄。  
缺點：需明確揭露保存程式碼內容，增加資安責任。

MVP 建議：

1. 預設只保存最近專案索引與部署紀錄。
2. 程式碼快照作為可選功能。
3. 使用者手動開啟「保存備份」才保存完整 source。

### 15.3 權限最小化

1. 平台只要求管理 Apps Script 專案所需 scopes。
2. 模板所需服務權限寫入 GAS manifest。
3. 不因模板需要 Gmail，就讓平台 OAuth 要求 Gmail 權限。

---

## 16. clasp Worker 可選方案

### 16.1 使用時機

不建議 MVP 依賴 clasp，但可作為進階功能：

1. 從 GitHub repo 建置 GAS 專案。
2. 支援 TypeScript 編譯。
3. 支援本地檔案結構與 `.clasp.json`。
4. 支援 CI/CD 式部署。

### 16.2 clasp Worker 架構

```text
[前端]
   |
   v
[後端 API]
   |
   v
[Job Queue]
   |
   v
[clasp Worker Container]
   |
   v
[Google Apps Script]
```

### 16.3 注意事項

1. Worker 不應長期保存使用者 token。
2. 每次 job 使用短期 access token。
3. 工作目錄執行後清除。
4. 不允許任意 shell command。
5. 僅允許白名單 clasp 操作。

---

## 17. MVP 開發里程碑

### Sprint 0：技術驗證，3 至 5 天

目標：確認核心 API 都可運作。

任務：

1. 建立 Google Cloud OAuth Client。
2. 完成 Google 登入。
3. 呼叫 `projects.create`。
4. 呼叫 `projects.getContent`。
5. 呼叫 `projects.updateContent`。
6. 呼叫 `projects.versions.create`。
7. 呼叫 `projects.deployments.create`。

交付物：

1. 技術 PoC。
2. API scope 清單。
3. 主要錯誤清單。

### Sprint 1：登入與專案管理，1 週

任務：

1. 登入 / 登出。
2. 使用者資料表。
3. token 加密保存。
4. 建立專案。
5. 輸入 Script ID 開啟專案。
6. 最近專案列表。

### Sprint 2：手機編輯器與檔案管理，1 週

任務：

1. CodeMirror 編輯器。
2. 檔案樹。
3. 新增、刪除、重新命名檔案。
4. manifest JSON 檢查。
5. dirty state。
6. 儲存至 GAS。

### Sprint 3：版本與部署，1 週

任務：

1. 建立版本。
2. 版本列表。
3. deployments 列表。
4. 新建 deployment。
5. 更新 deployment。
6. 顯示 Web App URL / Deployment ID。

### Sprint 4：模板與教學引導，1 週

任務：

1. 模板列表。
2. 模板建立專案。
3. LINE Bot 範本。
4. Web App 範本。
5. 部署成功教學頁。
6. 錯誤訊息白話化。

### Sprint 5：封測與上線準備，1 週

任務：

1. OAuth consent screen 整理。
2. 隱私權政策。
3. 服務條款。
4. 使用者資料刪除功能。
5. Sentry / Log。
6. PWA 安裝。
7. 手機測試。

---

## 18. 驗收標準

### 18.1 MVP 驗收情境

| 編號 | 情境 | 驗收結果 |
|---|---|---|
| AC-001 | 使用者能用 Google 帳號登入 | 成功登入並看到 Email |
| AC-002 | 使用者能建立新 GAS 專案 | Google Apps Script 中存在新專案 |
| AC-003 | 使用者能貼上 Code.gs 並儲存 | Apps Script 遠端內容更新 |
| AC-004 | 使用者能新增 HTML 檔案 | 遠端專案存在 HTML 檔案 |
| AC-005 | 使用者能修改 appsscript.json | 遠端 manifest 更新 |
| AC-006 | 使用者能建立版本 | 版本列表出現新 versionNumber |
| AC-007 | 使用者能建立 deployment | 取得 deployment ID |
| AC-008 | 使用者能更新 deployment | 既有 deployment 指向新版本 |
| AC-009 | 手機上可完成完整流程 | 不需開電腦即可部署成功 |
| AC-010 | manifest 錯誤會被阻擋 | 顯示可理解錯誤 |

---

## 19. 主要風險與對策

| 風險 | 等級 | 說明 | 對策 |
|---|---|---|---|
| OAuth 驗證 | 高 | 公開產品可能需 Google 驗證 | 早期先內部測試，準備隱私權政策與驗證資料 |
| updateContent 覆蓋全部檔案 | 高 | 儲存錯誤可能刪除遠端檔案 | 儲存前 snapshot、manifest 檢查、完整 files 驗證 |
| 使用者不懂 Script ID | 中 | 開啟既有專案門檻高 | 提供教學圖、之後整合 Drive 搜尋 |
| 部署設定複雜 | 中 | Web App 權限與執行身分容易混淆 | 提供預設值與白話說明 |
| 手機編輯體驗 | 中 | 程式碼編輯器在手機不一定好用 | 使用 CodeMirror 6，底部工具列，支援大字與全螢幕 |
| Google API quota | 中 | 大量使用可能被限制 | 快取、節流、錯誤重試 |
| Token 安全 | 高 | refresh token 泄漏風險 | 加密保存、最小權限、刪除機制 |
| Apps Script API 限制 | 中 | 有些 IDE 設定不一定能 API 化 | MVP 明確標示支援功能，不承諾完全取代 IDE |

---

## 20. 建議產品文案

### 20.1 一句話定位

手機也能完成 Google Apps Script 編輯、上傳與部署。

### 20.2 產品說明

GAS Mobile Deployer 是一個手機友善的 Apps Script 專案管理工具。你可以直接登入 Google 帳號，建立或開啟 GAS 專案，貼上程式碼、編輯檔案、修改常用設定，並一鍵建立版本與部署 Web App。

### 20.3 適合對象

1. Google Apps Script 教學講師。
2. 行政自動化學習者。
3. 補習班與中小企業內勤人員。
4. LINE Bot 初學者。
5. 需要快速部署 GAS 小工具的顧問。

---

## 21. 初版首頁內容建議

主標題：

```text
手機也能部署 Google Apps Script
```

副標題：

```text
不用打開複雜的 Apps Script 編輯器，登入 Google 帳號後，就能在手機上貼程式碼、改設定、建立版本與部署 Web App。
```

主要按鈕：

```text
使用 Google 登入
```

功能卡片：

1. 手機友善程式碼編輯。
2. 一鍵儲存到 GAS。
3. 快速建立版本。
4. Web App 重新部署。
5. LINE Bot / 表單 / 試算表範本。

---

## 22. 開發優先順序

### 必須先做

1. Google OAuth。
2. Apps Script API PoC。
3. 專案讀取與儲存。
4. manifest 保護。
5. 建立版本。
6. 建立部署。

### 可以晚點做

1. AI 程式碼輔助。
2. GitHub 匯入。
3. clasp Worker。
4. 團隊協作。
5. 觸發器視覺化管理。
6. 完整 Drive 專案搜尋。

---

## 23. 工程師開發注意事項

1. 不要把 `updateContent` 當成單檔更新 API。
2. 不要在前端保存 refresh token。
3. 不要讓使用者刪掉唯一 manifest。
4. 不要預設請求過多 Google scopes。
5. 不要直接承諾能完成所有 Apps Script IDE 設定。
6. 部署流程必須強制確認 version 與 deployment 關係。
7. 儲存前一定要檢查 files 陣列。
8. 每次儲存前最好保留可復原 snapshot。
9. 手機版 UI 要優先，不是桌機版縮小。
10. 錯誤訊息要轉成中文白話。

---

## 24. 建議第一版成功標準

第一版不需要做到完整 IDE，也不需要支援所有 Apps Script 類型。

只要能完成以下流程，就已經有產品價值：

```text
Google 登入
→ 建立 GAS 專案
→ 貼上 Code.gs
→ 編輯 appsscript.json
→ 儲存到 GAS
→ 建立版本
→ 部署 Web App
→ 複製 Web App URL
```

若這個流程能在手機上穩定完成，就已經解決了核心痛點。

---

## 25. 下一步建議

建議下一步先做技術 PoC，而不是直接做完整產品。

PoC 目標：

1. 用 Google OAuth 登入。
2. 建立一個 GAS 專案。
3. 寫入以下程式碼：

```javascript
function doGet() {
  return HtmlService.createHtmlOutput('Hello from GAS Mobile Deployer');
}
```

4. 儲存到 GAS。
5. 建立版本。
6. 建立 Web App deployment。
7. 手機上取得可開啟的 Web App URL。

PoC 成功後，再進入正式產品化開發。

---

# 附錄 A：後端核心 Service 建議

```text
GoogleAuthService
- getAuthUrl()
- handleCallback(code)
- refreshAccessToken(userId)
- revokeToken(userId)

AppsScriptProjectService
- createProject(userId, title)
- getContent(userId, scriptId)
- updateContent(userId, scriptId, files)

AppsScriptVersionService
- listVersions(userId, scriptId)
- createVersion(userId, scriptId, description)

AppsScriptDeploymentService
- listDeployments(userId, scriptId)
- createDeployment(userId, scriptId, versionNumber, description)
- updateDeployment(userId, scriptId, deploymentId, versionNumber, description)

TemplateService
- listTemplates()
- getTemplate(templateId)
- createProjectFromTemplate(userId, templateId, settings)
```

---

# 附錄 B：前端狀態模型建議

```ts
type GasFileType = 'SERVER_JS' | 'HTML' | 'JSON';

type GasFile = {
  id: string;
  displayName: string;
  apiName: string;
  type: GasFileType;
  source: string;
  dirty: boolean;
};

type GasProjectState = {
  scriptId: string;
  title: string;
  files: GasFile[];
  activeFileId: string;
  isDirty: boolean;
  lastSyncedAt?: string;
  latestVersionNumber?: number;
  deployments: GasDeployment[];
};

type GasDeployment = {
  deploymentId: string;
  versionNumber: number;
  description?: string;
  webAppUrl?: string;
};
```

---

# 附錄 C：MVP 使用者流程圖

```text
開始
  ↓
Google 登入
  ↓
建立新專案 / 輸入 Script ID
  ↓
讀取專案 files
  ↓
手機編輯程式碼
  ↓
檢查 manifest
  ↓
儲存到 GAS HEAD
  ↓
建立 Version
  ↓
建立或更新 Deployment
  ↓
取得 Web App URL
  ↓
完成
```

---

# 附錄 D：建議開發順序 Checklist

- [ ] 建立 Google Cloud Project
- [ ] 啟用 Apps Script API
- [ ] 設定 OAuth Consent Screen
- [ ] 建立 OAuth Client ID
- [ ] 完成登入流程
- [ ] 完成 token 加密保存
- [ ] 完成 projects.create
- [ ] 完成 projects.getContent
- [ ] 完成前端檔案樹
- [ ] 完成 CodeMirror 編輯器
- [ ] 完成 manifest JSON 驗證
- [ ] 完成 projects.updateContent
- [ ] 完成 versions.create
- [ ] 完成 deployments.create
- [ ] 完成 deployments.update
- [ ] 完成 LINE Bot 範本
- [ ] 完成 Web App 範本
- [ ] 完成手機版 UI 測試
- [ ] 完成隱私權政策
- [ ] 完成錯誤訊息白話化
- [ ] 進行封測

