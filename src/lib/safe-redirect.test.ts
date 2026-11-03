import { describe, expect, it } from 'vitest';
import { safeNextPath } from './safe-redirect';

describe('safeNextPath (open-redirect protection)', () => {
  it.each(['/alerts', '/alerts/123?tab=events', '/events?severity=HIGH&page=2', '/admin/users'])(
    'allows the in-app path %s',
    (path) => expect(safeNextPath(path)).toBe(path),
  );

  it.each([
    'https://evil.example',
    'http://evil.example/login',
    '//evil.example',
    '///evil.example',
    '/\\evil.example',
    'javascript:alert(1)',
    '/javascript:alert(1)',
    'evil.example',
    '/ok\nSet-Cookie: x=1',
    '',
  ])('rejects %j and uses the default', (value) => expect(safeNextPath(value)).toBe('/overview'));

  it('falls back when there is no value, and never loops back to /login', () => {
    expect(safeNextPath(null)).toBe('/overview');
    expect(safeNextPath(undefined, '/x')).toBe('/x');
    expect(safeNextPath('/login?next=/alerts')).toBe('/overview');
  });
});
