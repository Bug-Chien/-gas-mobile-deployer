import { getSession } from '@/lib/auth/session';
import { AppsScriptProjectService } from '@/lib/gas/project-service';
import { DashboardClient } from './_components/dashboard-client';
import { InAppBrowserWarning } from './_components/inapp-browser-warning';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const session = await getSession();
  const isLoggedIn = Boolean(session.userId);

  if (!isLoggedIn) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-6 px-6 py-12">
        <div className="text-center">
          <h1 className="text-3xl font-bold">手機也能部署 Google Apps Script</h1>
          <p className="mt-3 text-sm text-neutral-600">
            不用打開 Apps Script 編輯器，登入 Google 帳號後，就能在手機上貼程式碼、改設定、建立版本與部署 Web App。
          </p>
        </div>
        <InAppBrowserWarning />
        <a
          href="/api/auth/google/start"
          className="w-full rounded-lg bg-neutral-900 px-4 py-3 text-center font-medium text-white"
        >
          使用 Google 登入
        </a>

        <details className="w-full rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          <summary className="cursor-pointer font-medium">
            登入時會看到「Google 尚未驗證」警告？這是預期的，點開看怎麼處理
          </summary>
          <div className="mt-2 space-y-2 leading-relaxed">
            <p>
              本服務目前正在申請 Google 官方驗證（需 4–8 週）。在驗證通過前，
              第一次登入時會看到這個畫面：
            </p>
            <pre className="rounded bg-white p-2 text-[11px] leading-tight text-neutral-700">
{`Google hasn't verified this app
...

  [ Go back to safety ]   ← 不要按這個
  Advanced ↓              ← 點這個
    Go to GAS Mobile
    Deployer (unsafe)     ← 再點這個`}
            </pre>
            <p>
              同一個 Google 帳號完成一次後就不會再出現。本服務只請求管理你自己
              Apps Script 專案的權限，不會存取 Gmail / Drive / Sheets。
            </p>
            <p>
              詳細權限與資料處理見{' '}
              <a href="/privacy" className="underline">隱私權政策</a>。
            </p>
          </div>
        </details>

        <p className="text-center text-xs text-neutral-400">
          登入即代表同意 <a href="/terms" className="underline">服務條款</a> 與{' '}
          <a href="/privacy" className="underline">隱私權政策</a>
        </p>
      </main>
    );
  }

  const recent = await AppsScriptProjectService.listRecent(session.userId!);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">我的 Apps Script 專案</h1>
          <p className="text-xs text-neutral-500">{session.email}</p>
        </div>
        <div className="flex gap-2">
          <a href="/account" className="rounded-md border px-3 py-1.5 text-xs">帳號</a>
          <form action="/api/auth/logout" method="post">
            <button type="submit" className="rounded-md border px-3 py-1.5 text-xs">登出</button>
          </form>
        </div>
      </header>

      <DashboardClient recent={recent.map((r) => ({
        scriptId: r.scriptId,
        title: r.title,
        lastOpenedAt: r.lastOpenedAt.toISOString(),
        lastSyncedAt: r.lastSyncedAt?.toISOString() ?? null,
      }))} />
    </main>
  );
}
