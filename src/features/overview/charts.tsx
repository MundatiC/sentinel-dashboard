'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SEVERITY_COLORS } from '@/components/ui/severity';
import { STACK_ORDER, describeChart, type ChartPoint } from './chart-data';

const TICK = { fill: '#859490', fontSize: 11 };

export function EventsBySeverityChart({ points }: { points: ChartPoint[] }) {
  return (
    // The chart is a picture: screen readers get a text summary instead of 24 unlabeled bars.
    <div role="img" aria-label={describeChart(points)} className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          accessibilityLayer={false}
          data={points}
          margin={{ top: 8, right: 8, left: -12, bottom: 0 }}
        >
          <CartesianGrid
            vertical={false}
            stroke="#3c4947"
            strokeOpacity={0.5}
            strokeDasharray="3 4"
          />
          <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={false} interval={3} />
          <YAxis
            tick={TICK}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            tickCount={4}
          />
          <Tooltip
            cursor={{ fill: '#ffffff10' }}
            contentStyle={{
              background: '#262a30',
              border: 0,
              borderRadius: 8,
              color: '#e0e2ea',
              fontSize: 12,
            }}
            labelFormatter={(label) => `${label} UTC`}
          />
          {STACK_ORDER.map((severity) => (
            <Bar
              key={severity}
              dataKey={severity}
              stackId="a"
              fill={SEVERITY_COLORS[severity]}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface DonutSlice {
  name: string;
  value: number;
  color: string;
}

export function StatusDonut({ slices, total }: { slices: DonutSlice[]; total: number }) {
  return (
    <div className="relative h-40 w-40 shrink-0" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart accessibilityLayer={false}>
          <Pie
            rootTabIndex={-1}
            data={total ? slices : [{ name: 'none', value: 1, color: '#31353b' }]}
            dataKey="value"
            innerRadius={52}
            outerRadius={72}
            paddingAngle={total ? 2 : 0}
            stroke="none"
            isAnimationActive={false}
          >
            {(total ? slices : [{ name: 'none', value: 1, color: '#31353b' }]).map((s) => (
              <Cell key={s.name} fill={s.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[1.5rem] font-semibold leading-none">{total}</span>
        <span className="text-label-default text-on-surface-variant">Total</span>
      </div>
    </div>
  );
}
