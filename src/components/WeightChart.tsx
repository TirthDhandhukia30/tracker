import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ResponsiveContainer, AreaChart, Area, YAxis } from 'recharts';
import { useTheme } from '@/components/theme-provider';
import { cn } from '@/lib/utils';
import { CHART_DATA_POINTS } from '@/lib/constants';
import { haptics } from '@/lib/haptics';

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

  const { sortedData, latestWeight, weekChange, hasEnoughData, trend, minWeight, maxWeight } = useMemo(() => {
    if (data.length === 0) {
      return { sortedData: [], latestWeight: 0, weekChange: 0, hasEnoughData: false, trend: 'stable' as const, minWeight: 0, maxWeight: 0 };
    }

    const sorted = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const latest = sorted[sorted.length - 1]?.weight || 0;

    // Calculate 7-day change
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const weekOldEntry = sorted.find(d => new Date(d.date) <= sevenDaysAgo) || sorted[0];
    const change = latest - (weekOldEntry?.weight || latest);
    const enough = sorted.length >= 2;

    // Determine trend
    const trendValue = change < -0.1 ? 'down' : change > 0.1 ? 'up' : 'stable';

    const weights = sorted.map(d => d.weight);

    return {
      sortedData: sorted,
      latestWeight: latest,
      weekChange: change,
      hasEnoughData: enough,
      trend: trendValue as 'down' | 'up' | 'stable',
      minWeight: Math.min(...weights),
      maxWeight: Math.max(...weights),
    };
  }, [data]);

  const strokeColor = useMemo(() => {
    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    return isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)';
  }, [theme]);

  const handleClick = () => {
    haptics.light();
    navigate('/weight-history');
  };

  if (data.length === 0) return null;

  return (
    <button
      onClick={handleClick}
      className="w-full glass-card rounded-2xl p-5 text-left transition-all hover:shadow-glass-lg active:scale-[0.99] group"
      aria-label="View weight history"
    >
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-4xl font-bold tracking-tight">{latestWeight}</p>
          <p className="text-xs text-muted-foreground mt-1">kg</p>
        </div>

        {hasEnoughData && (
          <div className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium backdrop-blur-sm",
            trend === 'down' && "bg-green-500/15 text-green-600 dark:text-green-400",
            trend === 'up' && "bg-orange-500/15 text-orange-600 dark:text-orange-400",
            trend === 'stable' && "glass-subtle text-muted-foreground"
          )}>
            <span className="text-sm">
              {trend === 'down' ? '↓' : trend === 'up' ? '↑' : '–'}
            </span>
            <span>
              {trend === 'stable' ? 'Holding' : `${Math.abs(weekChange).toFixed(1)} kg`}
            </span>
          </div>
        )}
      </div>

      {/* Minimal sparkline - no axes, no labels */}
      {sortedData.length > 1 && (
        <div className="h-16 -mx-2" style={{ minWidth: 0 }}>
          <ResponsiveContainer width="100%" height={64}>
            <AreaChart data={sortedData.slice(-CHART_DATA_POINTS)} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
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

      {/* Subtle indicator that it's tappable */}
      <div className="flex items-center justify-center mt-3 text-xs text-muted-foreground/60 group-hover:text-muted-foreground transition-colors">
        <span>View history</span>
        <span className="ml-0.5">→</span>
      </div>
    </button>
  );
}
