import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
  showPercentage?: boolean;
  children?: React.ReactNode;
  color?: string;
  bgColor?: string;
}

export function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 6,
  className,
  showPercentage = true,
  children,
  color,
  bgColor,
}: ProgressRingProps) {
  const prefersReducedMotion = useReducedMotion();
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        aria-hidden="true"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor || "currentColor"}
          strokeWidth={strokeWidth}
          className={bgColor ? undefined : "text-muted/30"}
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color || "hsl(var(--primary))"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { type: 'spring', stiffness: 50, damping: 15, delay: 0.2 }
          }
        />
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        {children || (
          showPercentage && (
            <motion.span
              className="text-lg font-bold tabular-nums"
              initial={prefersReducedMotion ? {} : { opacity: 0, scale: 0.5 }}
              animate={prefersReducedMotion ? {} : { opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
            >
              {Math.round(progress)}%
            </motion.span>
          )
        )}
      </div>
    </div>
  );
}

// Compact version for inline use
export function ProgressRingSmall({
  progress,
  size = 32,
  strokeWidth = 3,
  className,
  color,
  bgColor,
}: Omit<ProgressRingProps, 'showPercentage' | 'children'>) {
  const prefersReducedMotion = useReducedMotion();
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      className={cn('transform -rotate-90', className)}
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={bgColor || "currentColor"}
        strokeWidth={strokeWidth}
        className={bgColor ? undefined : "text-muted/20"}
      />
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color || "hsl(var(--primary))"}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={
          prefersReducedMotion
            ? { duration: 0 }
            : { type: 'spring', stiffness: 100, damping: 20 }
        }
      />
    </svg>
  );
}

// Apple Watch style multi-ring component
interface Ring {
  label: string;
  value: number;
  max: number;
  color: string;
  bgColor: string;
}

interface MultiRingProps {
  rings: Ring[];
  size?: number;
  strokeWidth?: number;
  gap?: number;
  className?: string;
  children?: React.ReactNode;
}

export function MultiRing({
  rings,
  size = 140,
  strokeWidth = 10,
  gap = 4,
  className,
  children,
}: MultiRingProps) {
  const prefersReducedMotion = useReducedMotion();
  const ringStep = strokeWidth + gap;

  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      {rings.map((ring, index) => {
        const ringSize = size - (index * ringStep * 2);
        const radius = (ringSize - strokeWidth) / 2;
        const circumference = 2 * Math.PI * radius;
        const percent = ring.max > 0 ? Math.min((ring.value / ring.max) * 100, 100) : 0;
        const offset = circumference - (percent / 100) * circumference;

        return (
          <svg
            key={ring.label}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90"
            width={ringSize}
            height={ringSize}
            viewBox={`0 0 ${ringSize} ${ringSize}`}
          >
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke={ring.bgColor}
              strokeWidth={strokeWidth}
            />
            <motion.circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke={ring.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: offset }}
              transition={
                prefersReducedMotion
                  ? { duration: 0 }
                  : {
                    type: 'spring',
                    stiffness: 50,
                    damping: 20,
                    delay: index * 0.1,
                  }
              }
            />
          </svg>
        );
      })}

      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}

// Preset colors matching Apple Watch
export const RING_COLORS = {
  move: { color: 'rgb(239, 68, 68)', bgColor: 'rgba(239, 68, 68, 0.2)' },      // Red
  exercise: { color: 'rgb(34, 197, 94)', bgColor: 'rgba(34, 197, 94, 0.2)' },  // Green
  stand: { color: 'rgb(59, 130, 246)', bgColor: 'rgba(59, 130, 246, 0.2)' },   // Blue
  // Custom colors for this app
  running: { color: 'rgb(239, 68, 68)', bgColor: 'rgba(239, 68, 68, 0.2)' },   // Red
  work: { color: 'rgb(34, 197, 94)', bgColor: 'rgba(34, 197, 94, 0.2)' },      // Green
  gym: { color: 'rgb(59, 130, 246)', bgColor: 'rgba(59, 130, 246, 0.2)' },     // Blue
  steps: { color: 'rgb(6, 182, 212)', bgColor: 'rgba(6, 182, 212, 0.2)' },     // Cyan
  weight: { color: 'rgb(168, 85, 247)', bgColor: 'rgba(168, 85, 247, 0.2)' },  // Purple
};
