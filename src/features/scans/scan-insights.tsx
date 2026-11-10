'use client';

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { formatTimestamp } from '@/lib/format';
import { PENALTY, gradeOf, scoreOf, type Grade } from '@/lib/grade';
import type { ApiFinding } from '@/lib/api/schemas';
import { diffFindings } from '@/lib/scan-diff';

const GRADE_STYLE: Record<Grade, string> = {
  A: 'bg-[#14b8a6]/15 text-[#5eead4]',
  B: 'bg-[#14b8a6]/15 text-[#5eead4]',
  C: 'bg-[#eab308]/15 text-[#fde047]',
  D: 'bg-[#f97316]/15 text-[#fdba74]',
  F: 'bg-[#ef4444]/15 text-[#fca5a5]',
};

export function GradeBadge({ grade, className }: { grade: Grade; className?: string }) {
  return (
    <span
      aria-label={`Grade ${grade}`}
      className={cn(
        'inline-flex h-16 w-16 items-center justify-center rounded-xl font-headline-xl text-4xl font-semibold',
        GRADE_STYLE[grade],
        className,
      )}
    >
      {grade}
    </span>
  );
}

/** Compact grade for table rows: the letter plus the score, never colour alone. */
export function GradeChip({ summary }: { summary: Parameters<typeof scoreOf>[0] }) {
  const score = scoreOf(summary);
  const grade = gradeOf(score);
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-label-mono text-label-mono',
        GRADE_STYLE[grade],
      )}
    >
      <strong>{grade}</strong>
      <span aria-label={`score ${score} out of 100`}>{score}</span>
    </span>
  );
}

type HistoryItem = { id: string; finishedAt: string; summary: Parameters<typeof scoreOf>[0] };

function Trend({ history }: { history: HistoryItem[] }) {
  // The API returns newest first; a chart reads left to right in time.
  const points = [...history]
    .reverse()
    .map((s) => ({ date: formatTimestamp(s.finishedAt).slice(0, 10), score: scoreOf(s.summary) }));
  const first = points[0]!.score;
  const last = points[points.length - 1]!.score;
  return (
    <div className="w-full sm:w-72">
      <p className="mb-1 text-label-default text-on-surface-variant">
        Trend: {first} → {last} over {points.length} scans
      </p>
      <div
        role="img"
        aria-label={`Score over time: ${points.map((p) => p.score).join(', ')}`}
        className="h-28 w-full"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            <XAxis dataKey="date" hide />
            {/* Zoomed to the range actually seen, so a small improvement is visible. */}
            <YAxis domain={[Math.max(0, Math.min(first, last) - 15), 100]} hide />
            <Tooltip
              contentStyle={{ background: '#121821', border: '1px solid #1F2937', fontSize: 12 }}
              formatter={(value) => [`${value}/100`, 'Score']}
            />
            <Line type="monotone" dataKey="score" stroke="#14b8a6" strokeWidth={2} dot />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function ScanInsights({
  scan,
  previous,
  history,
}: {
  scan: { summary: HistoryItem['summary']; findings: ApiFinding[] };
  previous?: { finishedAt: string; findings: ApiFinding[] };
  history: HistoryItem[];
}) {
  const score = scoreOf(scan.summary);
  const grade = gradeOf(score);
  const diff = previous ? diffFindings(previous.findings, scan.findings) : null;
  return (
    <Card className="mb-4 flex flex-col gap-6 sm:flex-row sm:items-center">
      <div className="flex items-center gap-4">
        <GradeBadge grade={grade} />
        <div>
          <p className="font-headline-md text-headline-md">{score}/100</p>
          <p className="text-label-default text-on-surface-variant">Security score</p>
        </div>
      </div>
      <div className="min-w-0 flex-1 text-body-default">
        {diff ? (
          <p>
            Since the previous scan ({formatTimestamp(previous!.finishedAt).slice(0, 10)}):{' '}
            <strong className="text-tertiary">{diff.fixed.length} fixed</strong>,{' '}
            <strong>{diff.added.length} new</strong>, {diff.unchanged} unchanged.
          </p>
        ) : (
          <p className="text-on-surface-variant">First scan of this target.</p>
        )}
        <p className="mt-1 text-label-default text-on-surface-variant">
          Score = 100 minus {PENALTY.CRITICAL} per critical, {PENALTY.HIGH} per high,{' '}
          {PENALTY.MEDIUM} per medium and {PENALTY.LOW} per low finding. A is 90 or more.
        </p>
      </div>
      {history.length >= 2 && <Trend history={history} />}
    </Card>
  );
}
