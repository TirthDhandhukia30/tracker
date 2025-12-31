import { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, YAxis } from 'recharts';
import { useTheme } from '@/components/theme-provider';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DataPoint {
  date: string;
  weight: number;
}

interface WeightChartProps {
  data: DataPoint[];
}

export function WeightChart({ data }: WeightChartProps) {
  const { theme } = useTheme();

  if (data.length === 0) return null;

  const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  // Get the latest weight
  const latestWeight = sortedData[sortedData.length - 1]?.weight || 0;

  // Calculate 7-day change
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const weekOldEntry = sortedData.find(d => new Date(d.date) <= sevenDaysAgo) || sortedData[0];
  const weekChange = latestWeight - (weekOldEntry?.weight || latestWeight);
  const hasEnoughData = sortedData.length >= 2;

  // Determine trend
  const trend = weekChange < -0.1 ? 'down' : weekChange > 0.1 ? 'up' : 'stable';

  const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const strokeColor = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)';

  const weights = sortedData.map(d => d.weight);
  const minWeight = Math.min(...weights);
  const maxWeight = Math.max(...weights);

  return (
    <div className="rounded-2xl bg-card/30 border border-border/30 p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-4xl font-bold tracking-tight">{latestWeight}</p>
          <p className="text-xs text-muted-foreground mt-1">kg</p>
        </div>

        {hasEnoughData && (
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium",
            trend === 'down' && "bg-green-500/10 text-green-600 dark:text-green-400",
            trend === 'up' && "bg-orange-500/10 text-orange-600 dark:text-orange-400",
            trend === 'stable' && "bg-secondary text-muted-foreground"
          )}>
            {trend === 'down' && <TrendingDown className="h-4 w-4" />}
            {trend === 'up' && <TrendingUp className="h-4 w-4" />}
            {trend === 'stable' && <Minus className="h-4 w-4" />}
            <span>
              {trend === 'stable' ? 'Holding' : `${Math.abs(weekChange).toFixed(1)} kg`}
            </span>
          </div>
        )}
      </div>

      {/* Minimal sparkline - no axes, no labels */}
      {sortedData.length > 1 && (
        <div className="h-16 -mx-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={sortedData.slice(-14)} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <YAxis hide domain={[minWeight - 1, maxWeight + 1]} />
              <Area
                type="monotone"
                dataKey="weight"
                stroke={strokeColor}
                strokeWidth={2}
                fill="transparent"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {!hasEnoughData && (
        <p className="text-xs text-muted-foreground/50 mt-2">Log a few more days to see your trend</p>
      )}
    </div>
  );
}
