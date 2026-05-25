import 'server-only';

// 結構化 logger。輸出 JSON 行給 stdout，方便 Cloud Logging / Vercel 收集。
// 紅線：絕對不可寫入 access_token / refresh_token / 完整檔案 source。

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type LogContext = {
  userId?: string;
  scriptId?: string;
  deploymentId?: string;
  api?: string;
  status?: number;
  durationMs?: number;
  errorCode?: string;
  /** 任意安全欄位；嚴禁 token / source */
  meta?: Record<string, unknown>;
};

function emit(level: LogLevel, message: string, ctx?: LogContext) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...ctx,
  };
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(JSON.stringify(payload));
}

export const logger = {
  debug: (m: string, c?: LogContext) => emit('debug', m, c),
  info:  (m: string, c?: LogContext) => emit('info', m, c),
  warn:  (m: string, c?: LogContext) => emit('warn', m, c),
  error: (m: string, c?: LogContext) => emit('error', m, c),
};
