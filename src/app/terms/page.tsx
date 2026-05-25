export const metadata = { title: '服務條款 - GAS Mobile Deployer' };

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-8 prose prose-sm">
      <h1 className="text-2xl font-bold">服務條款</h1>
      <p className="text-xs text-neutral-500">最後更新：2026-05-24</p>

      <h2 className="mt-6 text-base font-semibold">1. 服務性質</h2>
      <p>
        GAS Mobile Deployer 是一個讓你在手機或瀏覽器上管理、編輯與部署 Google Apps Script
        專案的工具。本服務目前為開發測試階段，**不提供 SLA 保證**，可能會因功能調整而暫停或改變行為。
      </p>

      <h2 className="mt-6 text-base font-semibold">2. 你的責任</h2>
      <ul className="ml-5 list-disc">
        <li>你應遵守 Google Apps Script 服務條款與 Google API 服務條款。</li>
        <li>你應對自己在本服務操作的 Apps Script 專案內容負完全責任。</li>
        <li>不得使用本服務從事違法、侵權、或對其他人造成傷害的行為。</li>
      </ul>

      <h2 className="mt-6 text-base font-semibold">3. 我們的免責</h2>
      <ul className="ml-5 list-disc">
        <li>本服務「按現狀」提供，不對使用結果作任何明示或默示的擔保。</li>
        <li>對於因 Google API 行為改變、Apps Script 配額限制等不可抗力造成的功能異常，本服務不承擔賠償責任。</li>
        <li>強烈建議重要專案在 Google 端另行備份；本服務的快照僅作工具內備援用。</li>
      </ul>

      <h2 className="mt-6 text-base font-semibold">4. 刪除帳號</h2>
      <p>
        你可隨時於「帳號設定」刪除本服務保存的所有資料。詳見
        <a href="/privacy" className="underline">隱私權政策</a>。
      </p>

      <h2 className="mt-6 text-base font-semibold">5. 條款變更</h2>
      <p>本服務保留調整本條款的權利。重大變更會在登入後顯示通知。</p>

      <p className="mt-8 text-xs text-neutral-500">
        <a href="/" className="underline">回首頁</a>
      </p>
    </main>
  );
}
