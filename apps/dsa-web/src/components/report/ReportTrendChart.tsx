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
  price: number | null;
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
    <div className="rounded-lg border border-border/70 bg-card/95 px-3 py-2.5 shadow-lg backdrop-blur-sm">
      <p className="mb-1.5 text-xs font-medium text-foreground">
        {dataPoint?.fullDate ?? label}
      </p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-xs" style={{ color: entry.color }}>
          <span className="text-secondary-text">{entry.name}: </span>
          <span className="font-mono font-semibold">
            {entry.name === '涨跌幅'
              ? `${entry.value > 0 ? '+' : ''}${entry.value.toFixed(2)}%`
              : entry.name === '评分'
                ? entry.value.toFixed(0)
                : entry.value.toFixed(2)}
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
      price: typeof item.currentPrice === 'number' ? item.currentPrice : null,
      change: typeof item.changePct === 'number' ? item.changePct : null,
    }));
  }, [items]);

  if (isLoading || chartData.length < 2) return null;

  const priceValues = chartData.map((d) => d.price).filter((v): v is number => v !== null);
  const priceMin = priceValues.length ? Math.floor(Math.min(...priceValues) * 0.97) : 0;
  const priceMax = priceValues.length ? Math.ceil(Math.max(...priceValues) * 1.03) : 100;

  return (
    <Card variant="bordered" padding="md" className="home-panel-card">
      <DashboardPanelHeader
        eyebrow="历史趋势"
        title="评分 · 股价 · 涨跌幅"
        className="mb-3"
      />
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 4, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #333)" opacity={0.4} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: 'var(--text-secondary-text, #999)' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="left"
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: 'var(--text-secondary-text, #999)' }}
              tickLine={false}
              axisLine={false}
              width={32}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[priceMin, priceMax]}
              tick={{ fontSize: 11, fill: 'var(--text-secondary-text, #999)' }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconSize={10}
              wrapperStyle={{ fontSize: 11, paddingTop: 4 }}
            />
            <Bar
              yAxisId="left"
              dataKey="change"
              name="涨跌幅"
              barSize={14}
              radius={[2, 2, 0, 0]}
              opacity={0.7}
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
              stroke="var(--color-primary, #06b6d4)"
              strokeWidth={2}
              dot={{ r: 3, fill: 'var(--color-primary, #06b6d4)' }}
              activeDot={{ r: 5 }}
              connectNulls
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="price"
              name="股价"
              stroke="var(--color-warning, #f59e0b)"
              strokeWidth={2}
              dot={{ r: 3, fill: 'var(--color-warning, #f59e0b)' }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
};
