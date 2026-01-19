import { Loading01Icon } from 'hugeicons-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  message?: string;
  className?: string;
}

export function LoadingState({ message, className }: LoadingStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12', className)}>
      <Loading01Icon className="w-6 h-6 animate-spin text-muted-foreground" />
      {message && (
        <p className="mt-3 text-sm text-muted-foreground">{message}</p>
      )}
    </div>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ message = 'Something went wrong', onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12', className)}>
      <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
        <span className="text-red-400 text-xl">!</span>
      </div>
      <p className="text-sm text-muted-foreground text-center">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 text-sm text-primary hover:text-primary/80 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  className?: string;
}

export function EmptyState({ icon = '📭', title, description, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 text-center', className)}>
      <span className="text-4xl mb-3">{icon}</span>
      <p className="text-sm font-medium">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      )}
    </div>
  );
}
