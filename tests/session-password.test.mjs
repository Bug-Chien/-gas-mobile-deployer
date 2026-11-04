import test from 'node:test';
import assert from 'node:assert/strict';
import { requireSessionPassword } from '../src/lib/auth/session-password.ts';

test('missing, empty, short and whitespace-only secrets fail closed', () => {
  for (const value of [undefined, '', 'short', ' '.repeat(40), 'x'.repeat(31)]) {
    assert.throws(() => requireSessionPassword(value), /SESSION_PASSWORD/);
  }
});
test('the published development fallback is rejected', () => {
  assert.throws(() => requireSessionPassword('dev-password-please-set-32-chars-min'), /SESSION_PASSWORD/);
});
test('an explicitly configured secret passes through unchanged', () => {
  const configured = 'test-fixture-only-1234567890-ABCDE-xyz';
  assert.equal(requireSessionPassword(configured), configured);
});
