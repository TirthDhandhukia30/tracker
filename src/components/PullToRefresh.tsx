import { useState, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { haptics } from '@/lib/haptics';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  disabled?: boolean;
}

const PULL_THRESHOLD = 80;
const MAX_PULL = 120;

export function PullToRefresh({ onRefresh, children, disabled }: PullToRefreshProps) {
  const prefersReducedMotion = useReducedMotion();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const isPulling = useRef(false);
  
  const pullDistance = useMotionValue(0);
  const pullOpacity = useTransform(pullDistance, [0, 40], [0, 1]);
  const pullRotation = useTransform(pullDistance, [0, PULL_THRESHOLD, MAX_PULL], [0, 180, 360]);
  const pullScale = useTransform(pullDistance, [0, PULL_THRESHOLD], [0.5, 1]);
  const contentOffset = useTransform(pullDistance, (v) => v * 0.5);
  const indicatorY = useTransform(pullDistance, (v) => Math.min(v - 40, 40));

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    const scrollTop = containerRef.current?.scrollTop || 0;
    if (scrollTop <= 0) {
      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    }
  }, [disabled, isRefreshing]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPulling.current || disabled || isRefreshing) return;

    const currentY = e.touches[0].clientY;
    const diff = Math.max(0, Math.min(MAX_PULL, currentY - startY.current));
    
    if (diff > 0) {
      pullDistance.set(diff);
      
      // Haptic feedback at threshold
      const prev = pullDistance.getPrevious();
      if (diff >= PULL_THRESHOLD && prev !== undefined && prev < PULL_THRESHOLD) {
        haptics.medium();
      }
    }
  }, [disabled, isRefreshing, pullDistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current || disabled) return;
    
    isPulling.current = false;
    const currentPull = pullDistance.get();

    if (currentPull >= PULL_THRESHOLD && !isRefreshing) {
      setIsRefreshing(true);
      haptics.success();
      
      // Animate to refreshing position
      animate(pullDistance, 60, { type: 'spring', stiffness: 300, damping: 30 });
      
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        animate(pullDistance, 0, { type: 'spring', stiffness: 400, damping: 30 });
      }
    } else {
      animate(pullDistance, 0, { type: 'spring', stiffness: 400, damping: 30 });
    }
  }, [disabled, isRefreshing, onRefresh, pullDistance]);

  return (
    <div 
      ref={containerRef}
      className="relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <motion.div
        className="absolute left-1/2 top-0 -translate-x-1/2 z-50 flex items-center justify-center"
        style={{
          y: indicatorY,
          opacity: pullOpacity,
        }}
      >
        <motion.div
          className="w-10 h-10 rounded-full glass-card flex items-center justify-center shadow-lg"
          style={{ scale: pullScale }}
        >
          <motion.div
            style={{ rotate: isRefreshing ? undefined : pullRotation }}
            animate={isRefreshing ? { rotate: 360 } : {}}
            transition={isRefreshing ? { repeat: Infinity, duration: 1, ease: 'linear' } : {}}
            className={`text-lg ${isRefreshing ? 'text-primary' : 'text-muted-foreground'}`}
          >
            ↻
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Content with pull offset */}
      <motion.div
        style={{
          y: prefersReducedMotion ? 0 : contentOffset,
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
