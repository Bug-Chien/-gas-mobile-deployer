---
name: gas-deploy-flow
description: GAS 儲存 → 版本 → 部署的正確順序與更新既有 Web App 的標準流程。實作部署相關 UI 或 API 前先讀。
---

# 部署流程 SOP

## 三個必須分清楚的東西

| 名稱 | 是什麼 |
|---|---|
| **HEAD** | 最新儲存的程式碼。直接寫入。可變。 |
| **Version** | 不可變的程式碼快照。`versions.create` 後就凍結。 |
| **Deployment** | 把某個 Version 發布成 Web App / API。有 `deploymentId` 和 `webAppUrl`。 |

## 新建 Web App（第一次部署）

```
1. (前端) 確認沒有 dirty state
2. updateContent  → HEAD 更新
3. versions.create(description)  → 拿到 versionNumber
4. deployments.create({ versionNumber, manifestFileName: "appsscript", description })
5. 回傳 deploymentId + webAppUrl
```

## 更新既有 Web App（第二次以後）

**重點：deploymentId 與 webAppUrl 維持不變**，使用者貼到 LINE Developers 的 webhook 不用改。

```
1. updateContent                       → HEAD 更新
2. versions.create                     → 必須建立「新」versionNumber，禁止重用舊版本
3. deployments.update(
     deploymentId,
     { versionNumber: <new>, manifestFileName: "appsscript", description }
   )                                   ↑ 是 update 不是 create
4. 同樣 deploymentId / webAppUrl，但指向新版本
```

**禁止**：
- 跳過步驟 2，直接 `deployments.update` 指向 HEAD 或舊 version。
- 對既有 Web App 用 `deployments.create`（會生新 URL，使用者外部設定全部失效）。
- 在 `versions.create` 失敗後仍嘗試 `deployments.update`。

## 常見炸點

| 症狀 | 原因 | 修正 |
|---|---|---|
| 部署成功但 Web App 還是舊內容 | 忘記先 `versions.create`，或 deploy 指向舊 version | 流程強制：save → version → deploy |
| 部署回 400 invalid_argument | `manifestFileName` 沒帶 | 永遠帶 `manifestFileName: "appsscript"` |
| Web App URL 開啟跳授權頁 | 第一次執行需使用者授權，**正常**，不是 bug | UI 提示「第一次開啟需授權」 |
| 部署成功但找不到 webAppUrl | `deployments.create` 回傳 `entryPoints` 陣列，要找 `entryPointType === "WEB_APP"` 的 | parse 邏輯放 `lib/gas/deploy.ts` |
| `webapp.executeAs` / `webapp.access` 錯誤 | manifest 缺欄位 | 預設 `executeAs: USER_DEPLOYING`、`access: ANYONE`（規格書 §9.5 預設 manifest） |

## UI 強制流程
部署頁的 CTA 順序：
1. 先檢查是否有 dirty state → 有 → disable「建立版本」，提示先儲存。
2. 「建立版本」成功後 →「建立部署」或「更新部署」才能按。
3. 部署成功後顯示規格書 §9.8 的引導文案（LINE Bot / 表單 / Sheets 三種情境）。

## 不要做的事
- ❌ 把「儲存 + 版本 + 部署」三個按鈕合成一個「一鍵發布」**而沒有錯誤 fallback**。若中間任一步失敗，使用者會卡在「不知道現在到哪一步」。要嘛分開，要嘛做完整的步驟狀態顯示。
- ❌ 對既有 Web App 用 `deployments.create` 而不是 `update` —— 會產生新的 deploymentId / URL，使用者外部設定全部失效。
