import type React from 'react';
import { useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts';
import type { HistoryItem } from '../../types/analysis';
import { Card } from '../common';
import { DashboardPanelHeader } from '../dashboard';

interface ReportTrendChartProps {
  items: HistoryItem[];
  isLoading?: boolean;
}

interface ChartDataPoint {
  date: string;
  fullDate: string;
  score: number | null;
  change: number | null;
}

const formatDateShort = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const formatDateFull = (dateStr: string): string => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const CustomTooltip: React.FC<{
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string; payload?: ChartDataPoint }>;
  label?: string;
}> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  const dataPoint = payload[0]?.payload;

  return (
    <div className="rounded-lg border border-border/70 bg-card px-3.5 py-3 shadow-xl backdrop-blur-sm">
      <p className="mb-2 text-sm font-medium text-foreground">
        {dataPoint?.fullDate ?? label}
      </p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-sm leading-relaxed" style={{ color: entry.color }}>
          <span className="text-secondary-text">{entry.name}: </span>
          <span className="font-mono font-semibold">
            {entry.name === '涨跌幅'
              ? `${entry.value > 0 ? '+' : ''}${entry.value.toFixed(2)}%`
              : entry.value.toFixed(0)}
          </span>
        </p>
      ))}
    </div>
  );
};

export const ReportTrendChart: React.FC<ReportTrendChartProps> = ({ items, isLoading }) => {
  const chartData = useMemo((): ChartDataPoint[] => {
    const sorted = items
      .filter((item) => item.createdAt)
      .slice()
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    return sorted.map((item) => ({
      date: formatDateShort(item.createdAt),
      fullDate: formatDateFull(item.createdAt),
      score: typeof item.sentimentScore === 'number' ? item.sentimentScore : null,
      change: typeof item.changePct === 'number' ? item.changePct : null,
    }));
  }, [items]);

  if (isLoading || chartData.length < 2) return null;

  const changeValues = chartData.map((d) => d.change).filter((v): v is number => v !== null);
  const absMax = changeValues.length
    ? Math.ceil(Math.max(...changeValues.map(Math.abs)) * 1.2)
    : 5;
  const changeMax = Math.max(absMax, 1);

  return (
    <Card variant="bordered" padding="md" className="home-panel-card">
      <DashboardPanelHeader
        eyebrow="历史趋势"
        title="评分 · 涨跌幅"
        className="mb-3"
      />
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 12, bottom: 4, left: -4 }}>
            <CartesianGrid strokeDasharray="4 4" stroke="var(--color-border, #444)" opacity={0.55} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: 'var(--text-secondary-text, #aaa)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="left"
              domain={[0, 100]}
              tick={{ fontSize: 12, fill: 'var(--text-secondary-text, #aaa)' }}
              tickLine={false}
              axisLine={false}
              width={32}
              label={{ value: '评分', position: 'insideTopLeft', offset: -4, style: { fontSize: 11, fill: 'var(--text-muted-text, #888)' } }}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[-changeMax, changeMax]}
              tick={{ fontSize: 12, fill: 'var(--text-secondary-text, #aaa)' }}
              tickFormatter={(v: number) => `${v}%`}
              tickLine={false}
              axisLine={false}
              width={48}
              label={{ value: '涨跌幅', position: 'insideTopRight', offset: -4, style: { fontSize: 11, fill: 'var(--text-muted-text, #888)' } }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconSize={12}
              wrapperStyle={{ fontSize: 12, paddingTop: 6 }}
            />
            <Bar
              yAxisId="right"
              dataKey="change"
              name="涨跌幅"
              barSize={18}
              radius={[3, 3, 0, 0]}
              opacity={0.85}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.change !== null && entry.change >= 0
                      ? 'var(--home-price-up, #ef4444)'
                      : 'var(--home-price-down, #22c55e)'
                  }
                />
              ))}
            </Bar>
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="score"
              name="评分"
              stroke="hsl(var(--primary, 193 100% 43%))"
              strokeWidth={2.5}
              dot={{ r: 4, fill: 'hsl(var(--primary, 193 100% 43%))', strokeWidth: 0 }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: 'hsl(var(--primary, 193 100% 43%))' }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
