const publishedDevelopmentPassword = 'dev-password-please-set-32-chars-min';

export function requireSessionPassword(value: string | undefined): string {
  if (!value || value.trim().length < 32 || value === publishedDevelopmentPassword) {
    throw new Error('SESSION_PASSWORD must be a private secret of at least 32 characters');
  }
  return value;
}
