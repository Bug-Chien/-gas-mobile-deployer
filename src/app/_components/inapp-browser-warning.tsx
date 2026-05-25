'use client';
import { useEffect, useState } from 'react';
import { detectInAppBrowser, isAndroid, isIOS, type InAppBrowser } from '@/lib/detect-inapp-browser';

const BROWSER_NAME: Record<string, string> = {
  line: 'LINE',
  facebook: 'Facebook',
  instagram: 'Instagram',
  wechat: 'WeChat',
};

export function InAppBrowserWarning() {
  const [detected, setDetected] = useState<InAppBrowser>(null);
  const [platform, setPlatform] = useState<'android' | 'ios' | 'other'>('other');

  useEffect(() => {
    setDetected(detectInAppBrowser());
    setPlatform(isAndroid() ? 'android' : isIOS() ? 'ios' : 'other');
  }, []);

  if (!detected) return null;

  const name = detected.kind === 'other' ? detected.name : BROWSER_NAME[detected.kind];
  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  async function copyUrl() {
    try { await navigator.clipboard.writeText(currentUrl); }
    catch { /* fall back to selection */ }
  }

  return (
    <div className="w-full rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
      <p className="font-semibold">⚠ 偵測到你正在使用 {name} 內建瀏覽器</p>
      <p className="mt-1 text-xs">
        Google 登入在內建瀏覽器中會被擋下（出現 「browser is not secure」 或登入按鈕完全沒反應）。
        請改用手機原生瀏覽器（Safari / Chrome / Edge）開啟本頁。
      </p>

      <div className="mt-2 rounded bg-white p-2 text-xs text-neutral-700">
        <p className="font-medium">操作方式：</p>
        {detected.kind === 'line' && platform === 'ios' && (
          <ol className="ml-4 list-decimal">
            <li>點右下角 <b>⋯</b>（更多）</li>
            <li>選擇「<b>在預設瀏覽器中開啟</b>」/「Open in Safari」</li>
          </ol>
        )}
        {detected.kind === 'line' && platform === 'android' && (
          <ol className="ml-4 list-decimal">
            <li>點右上角 <b>⋮</b>（三點）</li>
            <li>選擇「<b>在其他應用程式中開啟</b>」→ Chrome</li>
          </ol>
        )}
        {detected.kind === 'facebook' && (
          <ol className="ml-4 list-decimal">
            <li>點右上角 <b>⋯</b>（更多）</li>
            <li>選擇「<b>在外部瀏覽器中開啟</b>」/「Open in External Browser」</li>
          </ol>
        )}
        {(detected.kind === 'instagram' || detected.kind === 'wechat' || detected.kind === 'other') && (
          <ol className="ml-4 list-decimal">
            <li>點選右上角的「⋯」或「⋮」選單</li>
            <li>找「在瀏覽器開啟」/「Open in Browser」</li>
            <li>若找不到，請複製下方連結，貼到 Safari / Chrome 開啟</li>
          </ol>
        )}
      </div>

      <button
        onClick={copyUrl}
        className="mt-2 w-full rounded-md border border-red-300 bg-white px-3 py-2 text-xs text-red-700"
      >
        複製本頁網址
      </button>

      <p className="mt-2 break-all rounded bg-white p-2 font-mono text-[10px] text-neutral-600">
        {currentUrl}
      </p>
    </div>
  );
}
