import type { ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { cn } from '@/utils/cn';
import { formatCompactNumber, formatCurrency } from '@/utils/money';
import { EmptyState } from './States';

/**
 * Chart wrappers with one shared visual language: the same grid weight, the
 * same muted axes, the same tooltip. Colours come from the CSS custom
 * properties, so charts follow the theme instead of hard-coding hex values.
 */

/** Categorical palette — distinguishable, and ordered by prominence. */
export const CHART_COLORS = [
  'rgb(var(--c-brand))',
  'rgb(var(--c-accent))',
  'rgb(var(--c-info))',
  'rgb(var(--c-ok))',
  'rgb(var(--c-warn))',
  // Red sits last: it is the closest hue to the maroon brand, so it only
  // appears once a chart already has five other series to tell apart.
  'rgb(var(--c-danger))',
];

const AXIS_PROPS = {
  stroke: 'rgb(var(--c-subtle))',
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

interface TooltipEntry {
  name?: string | number;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

function ChartTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string | number;
  currency?: boolean;
}): JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-xl border border-line bg-elevated px-3 py-2 shadow-pop">
      {label != null && <p className="mb-1 text-xs font-medium text-ink">{label}</p>}
      <ul className="space-y-0.5">
        {payload.map((entry, index) => (
          <li key={index} className="flex items-center gap-2 text-xs">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: entry.color }}
              aria-hidden
            />
            <span className="text-muted">{entry.name}</span>
            <span className="ml-auto font-medium text-ink tabular-nums">
              {currency && typeof entry.value === 'number'
                ? formatCurrency(entry.value)
                : String(entry.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Charts accept arbitrary row shapes, so reads are narrowed here in one place. */
function valueAt(row: object, key: string): number {
  const value = (row as Record<string, unknown>)[key];
  return typeof value === 'number' ? value : Number(value ?? 0);
}

/** True when every series is flat zero — worth an empty state rather than a bare axis. */
function allZero(data: object[], series: { key: string }[]): boolean {
  return data.every((row) => series.every((s) => !valueAt(row, s.key)));
}

export interface ChartFrameProps {
  children: ReactNode;
  height?: number;
  className?: string;
  /** Rendered instead of the chart when there is nothing to plot. */
  isEmpty?: boolean;
  emptyMessage?: string;
}

export function ChartFrame({
  children,
  height = 260,
  className,
  isEmpty,
  emptyMessage = 'No data for this period',
}: ChartFrameProps): JSX.Element {
  if (isEmpty) {
    return (
      <div className={cn('grid min-w-0 place-items-center', className)} style={{ height }}>
        <EmptyState compact title={emptyMessage} />
      </div>
    );
  }

  return (
    // `min-w-0` is load-bearing: as a grid/flex child this div defaults to
    // `min-width: auto`, so the axis labels inside Recharts would set a floor
    // and push the whole card past a narrow viewport.
    <div className={cn('min-w-0', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        {children as React.ReactElement}
      </ResponsiveContainer>
    </div>
  );
}

export interface SeriesChartProps {
  /** Any row shape; series keys index into it. */
  data: object[];
  xKey: string;
  series: { key: string; label: string; color?: string }[];
  height?: number;
  currency?: boolean;
  className?: string;
  emptyMessage?: string;
}

export function RevenueAreaChart({
  data,
  xKey,
  series,
  height = 280,
  currency = true,
  className,
  emptyMessage,
}: SeriesChartProps): JSX.Element {
  const isEmpty = allZero(data, series);

  return (
    <ChartFrame height={height} className={className} isEmpty={isEmpty} emptyMessage={emptyMessage}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color ?? CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.22} />
              <stop offset="100%" stopColor={s.color ?? CHART_COLORS[i % CHART_COLORS.length]} stopOpacity={0.01} />
            </linearGradient>
          ))}
        </defs>

        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--c-line))" vertical={false} />
        <XAxis dataKey={xKey} {...AXIS_PROPS} />
        <YAxis {...AXIS_PROPS} tickFormatter={(v: number) => formatCompactNumber(v)} width={52} />
        <Tooltip content={<ChartTooltip currency={currency} />} />

        {series.map((s, i) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color ?? CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2}
            fill={`url(#grad-${s.key})`}
          />
        ))}
      </AreaChart>
    </ChartFrame>
  );
}

export function SimpleBarChart({
  data,
  xKey,
  series,
  height = 280,
  currency = true,
  className,
  emptyMessage,
  horizontal = false,
}: SeriesChartProps & { horizontal?: boolean }): JSX.Element {
  const isEmpty = allZero(data, series);

  return (
    <ChartFrame height={height} className={className} isEmpty={isEmpty} emptyMessage={emptyMessage}>
      <BarChart
        data={data}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={{ top: 8, right: 8, bottom: 0, left: horizontal ? 8 : -12 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--c-line))" vertical={horizontal} horizontal={!horizontal} />
        {horizontal ? (
          <>
            <XAxis type="number" {...AXIS_PROPS} tickFormatter={(v: number) => formatCompactNumber(v)} />
            <YAxis type="category" dataKey={xKey} {...AXIS_PROPS} width={130} />
          </>
        ) : (
          <>
            <XAxis dataKey={xKey} {...AXIS_PROPS} />
            <YAxis {...AXIS_PROPS} tickFormatter={(v: number) => formatCompactNumber(v)} width={52} />
          </>
        )}
        <Tooltip content={<ChartTooltip currency={currency} />} cursor={{ fill: 'rgb(var(--c-line) / 0.4)' }} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}

        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={s.color ?? CHART_COLORS[i % CHART_COLORS.length]}
            radius={horizontal ? [0, 6, 6, 0] : [6, 6, 0, 0]}
            maxBarSize={horizontal ? 22 : 44}
          />
        ))}
      </BarChart>
    </ChartFrame>
  );
}

export function TrendLineChart({
  data,
  xKey,
  series,
  height = 280,
  currency = true,
  className,
}: SeriesChartProps): JSX.Element {
  const isEmpty = allZero(data, series);

  return (
    <ChartFrame height={height} className={className} isEmpty={isEmpty}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--c-line))" vertical={false} />
        <XAxis dataKey={xKey} {...AXIS_PROPS} />
        <YAxis {...AXIS_PROPS} tickFormatter={(v: number) => formatCompactNumber(v)} width={52} />
        <Tooltip content={<ChartTooltip currency={currency} />} />
        {series.length > 1 && <Legend wrapperStyle={{ fontSize: 12 }} />}

        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={s.color ?? CHART_COLORS[i % CHART_COLORS.length]}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        ))}
      </LineChart>
    </ChartFrame>
  );
}

export interface DonutDatum {
  name: string;
  value: number;
}

export function DonutChart({
  data,
  height = 260,
  currency = true,
  className,
}: {
  data: DonutDatum[];
  height?: number;
  currency?: boolean;
  className?: string;
}): JSX.Element {
  const isEmpty = data.length === 0 || data.every((d) => d.value === 0);

  return (
    <ChartFrame height={height} className={className} isEmpty={isEmpty}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius="58%"
          outerRadius="82%"
          paddingAngle={2}
          stroke="none"
        >
          {data.map((_, index) => (
            <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<ChartTooltip currency={currency} />} />
        <Legend
          verticalAlign="bottom"
          iconType="circle"
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />
      </PieChart>
    </ChartFrame>
  );
}
