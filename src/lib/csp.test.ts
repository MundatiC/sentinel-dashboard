import { describe, expect, it } from 'vitest';
import { connectSrc } from './csp';

describe('connectSrc', () => {
  it('allows the API origin when the browser calls it directly', () => {
    expect(connectSrc('http://localhost:4000')).toBe("'self' http://localhost:4000");
  });

  it("is just 'self' in same-origin mode, never an invalid '/' source", () => {
    expect(connectSrc('/')).toBe("'self'");
    expect(connectSrc('')).toBe("'self'");
  });
});
