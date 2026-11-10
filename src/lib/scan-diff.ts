import type { ApiFinding } from '@/lib/api/schemas';

/** What changed between two scans of the same target. Findings are matched by their check id. */
export function diffFindings(previous: ApiFinding[], current: ApiFinding[]) {
  const before = new Set(previous.map((f) => f.checkId));
  const now = new Set(current.map((f) => f.checkId));
  return {
    added: current.filter((f) => !before.has(f.checkId)),
    fixed: previous.filter((f) => !now.has(f.checkId)),
    unchanged: current.filter((f) => before.has(f.checkId)).length,
  };
}
