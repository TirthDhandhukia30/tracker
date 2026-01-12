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

    // Calculate change from yesterday (previous entry)
    const prevEntry = sorted.length >= 2 ? sorted[sorted.length - 2] : null;
    const prev = prevEntry?.weight || latest;
    const change = prevEntry ? latest - prev : 0;
    const enough = sorted.length >= 2;

    // Determine trend based on daily change
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
    if (trend === 'down') {
      return {
        stroke: isDark ? '#22c55e' : '#16a34a',
        gradientStart: isDark ? 'rgba(34, 197, 94, 0.3)' : 'rgba(22, 163, 74, 0.2)',
        gradientEnd: 'rgba(34, 197, 94, 0)',
      };
    } else if (trend === 'up') {
      return {
        stroke: isDark ? '#f97316' : '#ea580c',
        gradientStart: isDark ? 'rgba(249, 115, 22, 0.3)' : 'rgba(234, 88, 12, 0.2)',
        gradientEnd: 'rgba(249, 115, 22, 0)',
      };
    }
    return {
      stroke: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)',
      gradientStart: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
      gradientEnd: 'rgba(128,128,128,0)',
    };
  }, [trend, isDark]);

  const handleClick = () => {
    haptics.light();
    navigate('/weight-history');
  };

  if (data.length === 0) return null;

  return (
    <button
      onClick={handleClick}
      className="w-full glass-card rounded-2xl p-5 text-left transition-all hover:shadow-glass-lg active:scale-[0.99] group overflow-hidden relative"
      aria-label="View weight history"
    >
      {/* Subtle gradient background based on trend */}
      <div className={cn(
        "absolute inset-0 opacity-30 transition-opacity",
        trend === 'down' && "bg-gradient-to-br from-green-500/20 via-transparent to-transparent",
        trend === 'up' && "bg-gradient-to-br from-orange-500/20 via-transparent to-transparent",
      )} />

      <div className="relative z-10">
        {/* Header with weight and delta */}
        <div className="flex items-start justify-between mb-1">
          <div>
            {/* Main weight display */}
            <div className="flex items-baseline gap-1">
              <motion.span
                key={latestWeight}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-4xl font-bold tracking-tight tabular-nums"
              >
                {latestWeight.toFixed(1)}
              </motion.span>
              <span className="text-lg font-medium text-muted-foreground">kg</span>
            </div>

            {/* Previous weight reference */}
            {hasEnoughData && (
              <p className="text-xs text-muted-foreground/60 mt-0.5">
                from {previousWeight.toFixed(1)} kg
              </p>
            )}
          </div>

          {/* Delta badge */}
          {hasEnoughData && (
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-xl backdrop-blur-sm",
                trend === 'down' && "bg-green-500/15",
                trend === 'up' && "bg-orange-500/15",
                trend === 'stable' && "glass-subtle"
              )}
            >
              {trend === 'down' && (
                <svg className="w-3.5 h-3.5 text-green-600 dark:text-green-400" viewBox="0 0 12 12" fill="none">
                  <path d="M6 2L6 10M6 10L2 6M6 10L10 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              {trend === 'up' && (
                <svg className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" viewBox="0 0 12 12" fill="none">
                  <path d="M6 10L6 2M6 2L2 6M6 2L10 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
              <span className={cn(
                "text-sm font-bold tabular-nums",
                trend === 'down' && "text-green-600 dark:text-green-400",
                trend === 'up' && "text-orange-600 dark:text-orange-400",
                trend === 'stable' && "text-muted-foreground"
              )}>
                {trend === 'stable' ? 'Holding' : `${Math.abs(dailyChange).toFixed(1)} kg`}
              </span>
            </motion.div>
          )}
        </div>

        {/* Chart with gradient fill */}
        {sortedData.length > 1 && (
          <div className="h-20 -mx-2 mt-2" style={{ minWidth: 0 }}>
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart data={sortedData.slice(-CHART_DATA_POINTS)} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
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
                  strokeWidth={2.5}
                  fill={`url(#weightGradient-${trend})`}
                  dot={false}
                  activeDot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {!hasEnoughData && (
          <p className="text-xs text-muted-foreground/50 mt-2">Log a few more days to see your trend</p>
        )}

        {/* Footer with live indicator */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
          <div className="flex items-center gap-2">
            {/* Pulsing live dot */}
            <span className="relative flex h-2 w-2">
              <span className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                trend === 'down' && "bg-green-500",
                trend === 'up' && "bg-orange-500",
                trend === 'stable' && "bg-muted-foreground"
              )} />
              <span className={cn(
                "relative inline-flex rounded-full h-2 w-2",
                trend === 'down' && "bg-green-500",
                trend === 'up' && "bg-orange-500",
                trend === 'stable' && "bg-muted-foreground"
              )} />
            </span>
            <span className="text-[10px] font-medium text-muted-foreground/60 uppercase tracking-wider">
              Daily
            </span>
          </div>

          <div className="flex items-center text-xs text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
            <span>View history</span>
            <span className="ml-0.5 group-hover:translate-x-0.5 transition-transform">→</span>
          </div>
        </div>
      </div>
    </button>
  );
}
