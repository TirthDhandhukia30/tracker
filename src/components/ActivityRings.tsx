import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { cn } from '@/lib/utils';

interface Ring {
  label: string;
  value: number;
  max: number;
  color: string;
  bgColor: string;
}

interface ActivityRingsProps {
  rings: Ring[];
  size?: number;
  strokeWidth?: number;
  className?: string;
  showCenter?: boolean;
  centerContent?: React.ReactNode;
}

export function ActivityRings({
  rings,
  size = 160,
  strokeWidth = 12,
  className,
  showCenter = true,
  centerContent,
}: ActivityRingsProps) {
  const prefersReducedMotion = useReducedMotion();
  const ringGap = strokeWidth + 4; // Gap between rings

  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      {rings.map((ring, index) => {
        const ringSize = size - (index * ringGap * 2);
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
            {/* Background ring */}
            <circle
              cx={ringSize / 2}
              cy={ringSize / 2}
              r={radius}
              fill="none"
              stroke={ring.bgColor}
              strokeWidth={strokeWidth}
            />
            {/* Progress ring */}
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

      {/* Center content */}
      {showCenter && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerContent}
        </div>
      )}
    </div>
  );
}

// Preset colors for common use cases
export const RING_COLORS = {
  red: { color: 'rgb(239, 68, 68)', bgColor: 'rgba(239, 68, 68, 0.2)' },
  green: { color: 'rgb(34, 197, 94)', bgColor: 'rgba(34, 197, 94, 0.2)' },
  blue: { color: 'rgb(59, 130, 246)', bgColor: 'rgba(59, 130, 246, 0.2)' },
  orange: { color: 'rgb(249, 115, 22)', bgColor: 'rgba(249, 115, 22, 0.2)' },
  purple: { color: 'rgb(168, 85, 247)', bgColor: 'rgba(168, 85, 247, 0.2)' },
  cyan: { color: 'rgb(6, 182, 212)', bgColor: 'rgba(6, 182, 212, 0.2)' },
  pink: { color: 'rgb(236, 72, 153)', bgColor: 'rgba(236, 72, 153, 0.2)' },
};

// Single progress ring component for simpler use cases
interface SingleRingProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  className?: string;
  children?: React.ReactNode;
}

export function SingleRing({
  value,
  max,
  size = 80,
  strokeWidth = 8,
  color = RING_COLORS.blue.color,
  bgColor = RING_COLORS.blue.bgColor,
  className,
  children,
}: SingleRingProps) {
  const prefersReducedMotion = useReducedMotion();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percent = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className={cn('relative', className)} style={{ width: size, height: size }}>
      <svg
        className="-rotate-90"
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={
            prefersReducedMotion
              ? { duration: 0 }
              : { type: 'spring', stiffness: 50, damping: 20 }
          }
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex items-center justify-center">
          {children}
        </div>
      )}
    </div>
  );
}
