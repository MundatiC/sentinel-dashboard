import { describe, expect, it } from 'vitest';
import type { ApiFinding } from '@/lib/api/schemas';
import { diffFindings } from './scan-diff';

const finding = (checkId: string): ApiFinding => ({
  id: `id-${checkId}`,
  checkId,
  category: 'HEADERS',
  severity: 'LOW',
  title: checkId,
  description: '',
  evidence: {},
  remediation: '',
  references: [],
});

describe('diffFindings', () => {
  it('reports new, fixed and unchanged findings by check id', () => {
    const result = diffFindings(
      [finding('a'), finding('b'), finding('c')],
      [finding('b'), finding('c'), finding('d')],
    );
    expect(result.added.map((f) => f.checkId)).toEqual(['d']);
    expect(result.fixed.map((f) => f.checkId)).toEqual(['a']);
    expect(result.unchanged).toBe(2);
  });

  it('handles the first scan of a target (nothing before it)', () => {
    const result = diffFindings([], [finding('a')]);
    expect(result.added).toHaveLength(1);
    expect(result.fixed).toHaveLength(0);
  });
});
