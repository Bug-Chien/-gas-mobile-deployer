// Client-only：偵測使用者是否在 App 內嵌瀏覽器中
// （Google OAuth 在 LINE / FB / IG 等 in-app browser 內常被擋下或被劫持）

export type InAppBrowser =
  | { kind: 'line' }
  | { kind: 'facebook' }
  | { kind: 'instagram' }
  | { kind: 'wechat' }
  | { kind: 'other'; name: string }
  | null;

export function detectInAppBrowser(ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''): InAppBrowser {
  if (!ua) return null;

  // LINE: 含 "Line/" (大小寫不一)
  if (/\bLine\/[\d.]+/i.test(ua)) return { kind: 'line' };

  // Facebook: FBAN / FBAV
  if (/\bFBAN\/|\bFBAV\//.test(ua)) return { kind: 'facebook' };

  // Instagram
  if (/\bInstagram\b/.test(ua)) return { kind: 'instagram' };

  // WeChat
  if (/\bMicroMessenger\b/i.test(ua)) return { kind: 'wechat' };

  // KakaoTalk
  if (/\bKAKAOTALK\b/i.test(ua)) return { kind: 'other', name: 'KakaoTalk' };

  return null;
}

export function isAndroid(ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''): boolean {
  return /Android/i.test(ua);
}

export function isIOS(ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''): boolean {
  return /iPhone|iPad|iPod/i.test(ua);
}
