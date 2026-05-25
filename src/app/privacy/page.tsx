export const metadata = { title: '隱私權政策 - GAS Mobile Deployer' };

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 prose prose-sm">
      <h1 className="text-2xl font-bold">隱私權政策</h1>
      <p className="text-xs text-neutral-500">最後更新：2026-05-24</p>

      <h2 className="mt-6 text-base font-semibold">1. 我們處理的資料</h2>
      <p>本服務只保存協助你管理 Apps Script 專案所必需的資料：</p>
      <ul className="ml-5 list-disc">
        <li><b>帳號識別</b>：你的 Google sub ID、Email、姓名、頭像 URL。</li>
        <li><b>授權憑證</b>：Google refresh token，以 AES-256-GCM 加密後保存在後端資料庫。</li>
        <li><b>專案索引</b>：你曾用本工具開啟過的 Script ID、名稱、最後開啟 / 同步時間。</li>
        <li><b>程式碼快照</b>：每次儲存前後的完整 files 陣列（用於失敗回溯與衝突偵測）。</li>
      </ul>

      <h2 className="mt-6 text-base font-semibold">2. 我們不做的事</h2>
      <ul className="ml-5 list-disc">
        <li>不出售你的資料給第三方。</li>
        <li>不用 access token / refresh token 做你授權範圍以外的事。</li>
        <li>不會將你的 token 寫入伺服器 log。</li>
        <li>不會在前端 localStorage 存任何 Google token。</li>
      </ul>

      <h2 className="mt-6 text-base font-semibold">3. OAuth 權限範圍</h2>
      <p>本服務向 Google 請求以下最小權限：</p>
      <ul className="ml-5 list-disc text-xs font-mono">
        <li>openid / email / profile（識別你）</li>
        <li>script.projects（管理你的 Apps Script 專案內容）</li>
        <li>script.deployments（管理你的 Apps Script 部署）</li>
      </ul>
      <p>本服務不請求 Gmail、Drive、Calendar、Sheets 等存取權。</p>

      <h2 className="mt-6 text-base font-semibold">4. 刪除你的資料</h2>
      <p>
        進入「帳號設定」可一鍵刪除本服務保存的所有資料（帳號 / token / 專案索引 / 程式碼快照）。
        Apps Script 上的專案本身不會被刪除。
      </p>
      <p>
        若要進一步解除 Google 帳號對本服務的授權，請到 {' '}
        <a href="https://myaccount.google.com/permissions" target="_blank" rel="noreferrer" className="underline">
          https://myaccount.google.com/permissions
        </a>{' '}
        移除「GAS Mobile Deployer (Dev)」。
      </p>

      <h2 className="mt-6 text-base font-semibold">5. 資料保存位置</h2>
      <p>
        資料保存在本服務的後端資料庫。本工具目前為開發測試階段（OAuth Consent Screen 為 Testing 狀態），
        僅供經授權的測試使用者使用。
      </p>

      <h2 className="mt-6 text-base font-semibold">6. 聯絡</h2>
      <p>有任何疑問請聯絡：bug.chien@gmail.com</p>

      <p className="mt-8 text-xs text-neutral-500">
        <a href="/" className="underline">回首頁</a>
      </p>
    </main>
  );
}
