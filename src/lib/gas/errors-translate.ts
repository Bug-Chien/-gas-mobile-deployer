import { AppError, type ErrorCode } from '@/lib/errors';

// 把 googleapis 丟的錯誤翻成內部 ErrorCode，不洩漏原始訊息給前端。
export function translateGoogleError(err: unknown): AppError {
  const status = extractStatus(err);
  const message = extractMessage(err);

  let code: ErrorCode = 'INTERNAL_ERROR';
  if (status === 401) code = 'GOOGLE_AUTH_REQUIRED';
  else if (status === 403 && /api .* not been used|api .* disabled/i.test(message))
    code = 'APPS_SCRIPT_API_DISABLED';
  else if (status === 403) code = 'PERMISSION_DENIED';
  else if (status === 404) code = 'SCRIPT_NOT_FOUND';
  else if (status === 429) code = 'RATE_LIMITED';

  return new AppError(code, process.env.NODE_ENV === 'development' ? message : undefined);
}

function extractStatus(err: unknown): number | undefined {
  if (typeof err === 'object' && err !== null) {
    const anyErr = err as { code?: number; status?: number; response?: { status?: number } };
    return anyErr.code ?? anyErr.status ?? anyErr.response?.status;
  }
  return undefined;
}

function extractMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return 'unknown error';
  }
}
