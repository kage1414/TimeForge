import { cn } from '../../lib/utils';

export interface TFSpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizes = {
  sm: 'h-4 w-4 border-2',
  md: 'h-6 w-6 border-2',
  lg: 'h-10 w-10 border-4',
};

export function TFSpinner({ className, size = 'md' }: TFSpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        'inline-block animate-spin rounded-full border-gray-300 border-t-indigo-600',
        sizes[size],
        className,
      )}
    />
  );
}

export function TFLoading({ label = 'Loading...' }: { label?: string }) {
  return <div className="text-center py-12 text-gray-500">{label}</div>;
}
