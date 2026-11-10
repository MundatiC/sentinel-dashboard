import { describe, expect, it } from 'vitest';
import { gradeOf, scoreOf } from './grade';

describe('scoreOf', () => {
  it('is 100 for a clean scan and ignores INFO findings', () => {
    expect(scoreOf({})).toBe(100);
    expect(scoreOf({ INFO: 12 })).toBe(100);
  });

  it('subtracts a penalty per finding by severity', () => {
    expect(scoreOf({ MEDIUM: 3, LOW: 2 })).toBe(70); // 100 - 24 - 6
    expect(scoreOf({ CRITICAL: 1 })).toBe(75);
  });

  it('never goes below zero', () => {
    expect(scoreOf({ CRITICAL: 10 })).toBe(0);
  });
});

describe('gradeOf', () => {
  it('maps scores to letters at the documented boundaries', () => {
    expect(gradeOf(100)).toBe('A');
    expect(gradeOf(90)).toBe('A');
    expect(gradeOf(89)).toBe('B');
    expect(gradeOf(80)).toBe('B');
    expect(gradeOf(79)).toBe('C');
    expect(gradeOf(65)).toBe('C');
    expect(gradeOf(64)).toBe('D');
    expect(gradeOf(50)).toBe('D');
    expect(gradeOf(49)).toBe('F');
    expect(gradeOf(0)).toBe('F');
  });
});
