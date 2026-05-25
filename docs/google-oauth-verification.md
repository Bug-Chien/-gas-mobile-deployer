# Google OAuth Verification 全流程

> 適用本專案的具體狀況：
> - App: **GAS Mobile Deployer**
> - 使用的 Sensitive scopes：`script.projects` + `script.deployments`
> - 沒有用到 Restricted scope（Gmail / Drive 完整存取），所以**不需要做 CASA 安全評估**。
> - 預估時程：**4 ~ 8 週**（取決於審查員回覆速度與你修正速度）。

## 0. 先決定：你真的需要 verification 嗎？

Google 不強迫所有 App 都 verification。你有三條路：

| 模式 | 上限 | 使用者體驗 | 何時選 |
|---|---|---|---|
| **Testing** | 100 個 test user | 第一次登入會看到「已封鎖：未完成驗證」紅字頁，需在 Test users 名單內 | 自己用 / 學生 / 客戶 < 100 人 |
| **In production (unverified)** | 任何人但每帳號每次都看到「Google has not verified this app」警告畫面，要點「Advanced → Go to ... (unsafe)」 | 嚇人，但能用 | 不太可能想用 |
| **In production + verified** | 任何人，無警告 | 正常 Google 登入流程 | 正式對外服務 |

**建議**：MVP 階段先維持 Testing；當測試使用者快滿 100 或要對外正式推廣，再啟動 verification。

---

## 1. 準備檢查清單（送審前必須齊備）

如果缺任何一項，審查員會打回票讓你補件（會延長 1–2 週）。

### A. 域名擁有權

- 你必須擁有一個**正式網域**（不能是 `*.vercel.app`、`*.run.app` 等 PaaS 子網域）。
- 到 [Google Search Console](https://search.google.com/search-console) 驗證網域所有權（DNS TXT 或 HTML file）。
- 同一 Google 帳號擁有的網域才能用在 OAuth Consent Screen 的 Authorized domain。

### B. 公開可存取的法律頁

兩個 URL 必須回 200、可被 Google 爬蟲讀取、內容是「真的」（不是 lorem ipsum）：

- **隱私權政策**：本專案有 [/privacy](../src/app/privacy/page.tsx)；上線前要把「最後更新日期」、聯絡信箱、實際資料保存位置改成你的營運單位。
- **服務條款**：本專案有 [/terms](../src/app/terms/page.tsx)；同上。

兩頁都必須：
- 明確列出 App 使用 Google API 的目的。
- 列出存取的 Google 使用者資料類型（本專案：Apps Script 專案內容、部署資訊）。
- 說明保存、加密、刪除流程。
- 提供聯絡方式。
- **重要**：頁面從 OAuth Consent Screen 與 App 內都要連得到。

### C. App 品牌資料

到 OAuth Consent Screen → Branding：

- **App name**：建議改成你的正式品牌名（例如 `<你的公司> GAS Deployer`）。
  - **不要**直接叫「Google Apps Script Deployer」會被認定為侵用 Google 商標。
  - 加 "for"、"compatible with" 之類的緩衝詞較安全。
- **User support email**：你會回覆使用者問題的信箱。
- **App logo**：120×120 PNG。可用簡單方塊文字 logo（本專案 `public/icon.svg` 是個起點，但 verification 通常要 PNG）。
- **Authorized domain**：步驟 A 驗證過的網域。
- **Developer contact email**：Google 跟你聯絡用，會收到審查回覆。

### D. 示範影片（最常被打回票的環節）

Google 要求 **YouTube unlisted 影片**，內容必須清楚展示：

1. App 的完整 URL（網址列看得到）
2. **OAuth consent screen 的截圖**（含 App name、要求的 scopes）
3. **每一個 sensitive scope 的實際使用**：
   - `script.projects`：示範使用者登入後，App 如何呼叫此 scope 讀取 / 寫入專案內容（建議錄：登入 → Dashboard 看專案列表 → 開啟編輯器 → 修改 Code.gs → 儲存 → 顯示「已儲存到 GAS HEAD」）。
   - `script.deployments`：示範部署流程（建立版本 → 部署為 Web App → 顯示 webAppUrl）。
4. **資料流動說明**：明確說明「為什麼這個 scope 是必須的」。本專案的標準說法：
   > "Our app helps users manage their Apps Script projects from mobile devices.
   > We need `script.projects` to read project files and save user's edits back to their Apps Script.
   > We need `script.deployments` to create and update Web App deployments so users can publish their scripts."

影片建議規格：
- 長度 2~5 分鐘
- 螢幕錄影即可，可以無人聲（用字幕 / 標題卡），有口白更好
- 1080p、清楚看得到網址列與 UI
- YouTube → **Unlisted**（不要 Private、也不要 Public）

### E. Scope justification 文字

每個 sensitive scope 都要寫一段「為什麼非用不可」說明，Google 表單會逐個問。

本專案的範本（可直接複製到審查表單）：

**`https://www.googleapis.com/auth/script.projects`**
```
Required to enable users to manage their own Google Apps Script projects from
our mobile-friendly interface. Specifically used for:
- projects.create: when users create a new project
- projects.get / projects.getContent: to read project metadata and file contents
  for in-app editing
- projects.updateContent: to save user-edited code back to their Apps Script

We only access projects that the authenticated user already owns. No data is
shared with third parties. Source code is optionally snapshotted in our
encrypted database for crash recovery and conflict detection, and can be
deleted by the user at any time via the in-app account deletion flow.

No narrower scope exists; script.projects.readonly would not allow the core
"save to Apps Script" feature.
```

**`https://www.googleapis.com/auth/script.deployments`**
```
Required to enable users to publish their Apps Script as Web Apps from our
mobile interface. Specifically used for:
- projects.versions.create / list
- projects.deployments.create / list / update / delete

We only access deployments belonging to the authenticated user's projects.
Without this scope users cannot complete the core flow of "edit on phone →
deploy → get Web App URL" which is the primary value proposition of the app.

No narrower scope exists for deployment management.
```

### F. 資料安全頁面 / 揭露

OAuth Consent Screen 會問你資料相關問題：

- 是否傳輸資料到伺服器：**Yes**（refresh token 加密保存在後端）
- 是否與第三方分享：**No**
- 是否販售：**No**
- 安全措施：勾選對應項（AES-256-GCM 加密、HTTPS、最小權限原則）

---

## 2. 送審流程（實際操作）

### 步驟 1：把 App 從 Testing 切到 Production

到 [Cloud Console → APIs & Services → OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)：

1. 確認所有 Branding 欄位都填好（步驟 1 C）。
2. 點 **Publish App** → 「Push to production」。
3. 此時狀態變成 `In production`，**但 verification 還沒做** —— 使用者登入會看到 unverified 警告。

### 步驟 2：填 Data Access 區的 Scopes

1. 到 **Data Access** 分頁。
2. 確認你的 Scopes 清單只有：
   - `openid`、`.../auth/userinfo.email`、`.../auth/userinfo.profile`（非 sensitive，免審）
   - `script.projects`（**Sensitive**）
   - `script.deployments`（**Sensitive**）
3. 如果有不必要的 scope，**移除**（會直接影響審查時間，留越少越快）。

### 步驟 3：申請 verification

1. 在 OAuth consent screen 主頁面找到 **Prepare for verification** 或 **Submit for verification** 按鈕。
2. 依序填：
   - App functionality 描述（一段 200 字左右說明 App 做什麼）。
   - 每個 sensitive scope 的 justification（用步驟 1 E 的範本）。
   - **YouTube 影片 URL**（步驟 1 D）。
   - 確認 Privacy / Terms URL 可達。
3. Submit。

### 步驟 4：等待回覆

- 第一封自動信通常 1–3 天內：確認收件。
- 第一次人工回覆通常 5–14 天：審查員會列出問題（幾乎一定有）。
- 你修正後回覆，再等 5–14 天 → 直到 approved。

---

## 3. 常見 rejection 原因（先避開）

依本專案的特性，最可能踩到的點：

### R1. 影片沒清楚展示 OAuth consent screen
**處理**：影片裡明確錄到 consent 畫面，要看得到 App name 與每一個被請求的 scope。

### R2. 影片沒「展示每一個 scope 的使用」
**處理**：每個 sensitive scope 都要看到實際用到的功能。本專案最少要錄到：
- 儲存程式碼（用到 `script.projects`）
- 部署為 Web App（用到 `script.deployments`）

### R3. Privacy policy 太空泛
**處理**：必須明確列出「我們存取的 Google 使用者資料是 X、Y、Z」「保存於 ...」「用於 ...」「使用者可如何刪除」。本專案的 [/privacy](../src/app/privacy/page.tsx) 已有架構，調整營運單位後可用。

### R4. Privacy / Terms URL 無法被 Google 爬蟲讀取
**處理**：確認頁面：
- 不需要登入就能看
- 沒有 `noindex` meta（本專案沒設）
- HTTP 200、不是 SPA 純前端後渲染（本專案是 SSR，OK）

### R5. App name 觸犯 Google 商標
**處理**：避免 `Google Apps Script ...` 這種寫法。改成 `Mobile Deployer for Apps Script` 之類。

### R6. Scope 比實際需要多
**處理**：本專案已最小化，OK。但如果你之後加了 Drive / Gmail / Sheets scope，每多一個都會延長審查。

### R7. Authorized domain 沒驗證
**處理**：步驟 1 A 做完才送審。

---

## 4. 等待期間能做什麼

審查期間（4–8 週）App 是 `In production` 但 unverified，使用者會看到警告。建議：

- 維持 Testing 狀態到送審前一刻，讓現有 test users 不受影響。
- 送審當天再 publish。
- 在登入頁加註：「目前為審查中，登入會看到 Google 警告，點 Advanced → Go to ... 即可」。

---

## 5. 通過後

- App 在 OAuth consent screen 狀態變 `Verified`。
- 使用者登入流程恢復正常（無警告）。
- 每年可能會收到 re-verification 提醒，特別是改動 scope 或 OAuth Client 時。

---

## 6. 何時需要再做一次

| 動作 | 是否要重新審 |
|---|---|
| 改 App name | 是（brand re-verification） |
| 改 logo | 是（brand re-verification，較快） |
| 加新 sensitive scope | 是（scope re-verification） |
| 移除 scope | 否 |
| 換 OAuth Client ID（同 scope、同 project） | 通常不用，但要在 consent screen 重新關聯 |
| 換到新 Cloud Project | **要整套重做** |
| 改 redirect URI | 否 |

---

## 7. 本專案具體 to-do（如果你決定要送審）

1. [ ] 註冊正式網域（建議：`gas-deployer.com` 之類，越短越好）
2. [ ] DNS 驗證進 Google Search Console
3. [ ] 部署 App 到該網域（[deploy-vercel.md](deploy-vercel.md) 最快）
4. [ ] 用該網域開啟 `/privacy`、`/terms` 確認顯示正常
5. [ ] 調整 privacy / terms 內容為實際營運主體
6. [ ] 製作 logo 120×120 PNG
7. [ ] 錄製示範影片，上 YouTube unlisted
8. [ ] 拿步驟 1 E 的 justification 範本，填到 verification 表單
9. [ ] Cloud Console → OAuth consent screen → Publish App
10. [ ] Submit for verification
11. [ ] 等回覆，每次修正 1–2 個工作天內回覆審查員（拖太久要重排隊）

---

## 8. 預算 & 成本

verification 本身 **免費**。
你需要付的：
- 域名（年費約 USD 12）
- DB / hosting（Supabase free tier + Vercel Hobby 可撐 MVP）
- YouTube（免費，但需要 Google 帳號）

沒有任何 Google 收費。

---

## 參考連結

- [Google OAuth verification 官方說明](https://support.google.com/cloud/answer/13463073)
- [Scope 分級](https://support.google.com/cloud/answer/9110914)
- [品牌驗證指南](https://support.google.com/cloud/answer/10311615)
- [常見駁回原因](https://support.google.com/cloud/answer/13464327)
