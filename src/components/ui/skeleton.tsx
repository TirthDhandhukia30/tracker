import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl bg-muted/30 backdrop-blur-sm',
        // Shimmer effect using pseudo-element
        'before:absolute before:inset-0',
        'before:bg-gradient-to-r before:from-transparent before:via-white/20 before:to-transparent',
        'before:animate-shimmer',
        className
      )}
      aria-hidden="true"
    />
  );
}

// Pre-built skeleton patterns for common UI elements
export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <Skeleton className="h-32 w-full rounded-3xl" />
    </div>
  );
}

export function SkeletonChart({ className }: SkeletonProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <Skeleton className="h-24 w-full rounded-2xl" />
    </div>
  );
}

export function SkeletonCalendar({ className }: SkeletonProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-20 rounded-lg" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-48 w-full rounded-3xl" />
    </div>
  );
}

export function SkeletonHabitButton({ className }: SkeletonProps) {
  return <Skeleton className={cn('h-16 w-full rounded-2xl', className)} />;
}

export function SkeletonExercise({ className }: SkeletonProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Skeleton className="h-6 w-32 rounded-lg" />
      <div className="pl-3 space-y-2">
        <Skeleton className="h-8 w-full rounded-xl" />
        <Skeleton className="h-8 w-full rounded-xl" />
      </div>
    </div>
  );
}
