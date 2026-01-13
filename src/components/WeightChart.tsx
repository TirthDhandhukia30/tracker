import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, YAxis } from 'recharts';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import { CHART_DATA_POINTS } from '@/lib/constants';
import { haptics } from '@/lib/haptics';
import { motion } from 'framer-motion';

interface DataPoint {
  date: string;
  weight: number;
}

interface WeightChartProps {
  data: DataPoint[];
}

export function WeightChart({ data }: WeightChartProps) {
  const navigate = useNavigate();
  const { theme } = useTheme();

  const { sortedData, latestWeight, dailyChange, hasEnoughData, trend, minWeight, maxWeight, previousWeight } = useMemo(() => {
    if (data.length === 0) {
      return { sortedData: [], latestWeight: 0, dailyChange: 0, hasEnoughData: false, trend: 'stable' as const, minWeight: 0, maxWeight: 0, previousWeight: 0 };
    }

    const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const latest = sorted[sorted.length - 1]?.weight || 0;
    const prevEntry = sorted.length >= 2 ? sorted[sorted.length - 2] : null;
    const prev = prevEntry?.weight || latest;
    const change = prevEntry ? latest - prev : 0;
    const enough = sorted.length >= 2;
    const trendValue = change < -0.1 ? 'down' : change > 0.1 ? 'up' : 'stable';
    const weights = sorted.map(d => d.weight);

    return {
      sortedData: sorted,
      latestWeight: latest,
      dailyChange: change,
      hasEnoughData: enough,
      trend: trendValue as 'down' | 'up' | 'stable',
      minWeight: Math.min(...weights),
      maxWeight: Math.max(...weights),
      previousWeight: prev,
    };
  }, [data]);

  const isDark = useMemo(() => {
    return theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, [theme]);

  const chartColors = useMemo(() => {
    // Monochrome with subtle hint for trend
    if (trend === 'down') {
      return {
        stroke: isDark ? '#4ade80' : '#16a34a',
        gradientStart: isDark ? 'rgba(74, 222, 128, 0.15)' : 'rgba(22, 163, 74, 0.1)',
        gradientEnd: 'transparent',
      };
    } else if (trend === 'up') {
      return {
        stroke: isDark ? '#fb923c' : '#ea580c',
        gradientStart: isDark ? 'rgba(251, 146, 60, 0.15)' : 'rgba(234, 88, 12, 0.1)',
        gradientEnd: 'transparent',
      };
    }
    return {
      stroke: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)',
      gradientStart: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
      gradientEnd: 'transparent',
    };
  }, [trend, isDark]);

  const handleClick = () => {
    haptics.light();
    navigate('/weight-history');
  };

  if (data.length === 0) return null;

  return (
    <motion.button
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      onClick={handleClick}
      className="w-full text-left p-5 rounded-2xl bg-muted/40 hover:bg-muted/60 transition-colors"
      aria-label="View weight history"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Weight
          </p>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-semibold tracking-tight tabular-nums">
              {latestWeight.toFixed(1)}
            </span>
            <span className="text-lg text-muted-foreground">kg</span>
          </div>
          {hasEnoughData && (
            <p className="text-xs text-muted-foreground/60 mt-1">
              from {previousWeight.toFixed(1)} kg
            </p>
          )}
        </div>

        {/* Delta */}
        {hasEnoughData && dailyChange !== 0 && (
          <div className={cn(
            "px-2.5 py-1.5 rounded-lg text-sm font-medium",
            trend === 'down' && "bg-green-500/10 text-green-600 dark:text-green-400",
            trend === 'up' && "bg-orange-500/10 text-orange-600 dark:text-orange-400",
            trend === 'stable' && "bg-muted text-muted-foreground"
          )}>
            {dailyChange > 0 ? '+' : ''}{dailyChange.toFixed(1)}
          </div>
        )}
      </div>

      {/* Chart */}
      {sortedData.length > 1 && (
        <div className="h-16 -mx-2 mt-4">
          <ResponsiveContainer width="100%" height={64}>
            <AreaChart data={sortedData.slice(-CHART_DATA_POINTS)} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id={`weightGradient-${trend}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={chartColors.gradientStart} />
                  <stop offset="100%" stopColor={chartColors.gradientEnd} />
                </linearGradient>
              </defs>
              <YAxis hide domain={[minWeight - 0.5, maxWeight + 0.5]} />
              <Area
                type="monotone"
                dataKey="weight"
                stroke={chartColors.stroke}
                strokeWidth={2}
                fill={`url(#weightGradient-${trend})`}
                dot={false}
                activeDot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {!hasEnoughData && (
        <p className="text-xs text-muted-foreground/50 mt-3">Log more days to see trend</p>
      )}
    </motion.button>
  );
}
