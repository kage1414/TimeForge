import { forwardRef, type SelectHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export const tfSelectVariants = cva(
  'border rounded p-2 w-full text-sm bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
  {
    variants: {
      tone: {
        default: 'border-gray-300',
        error: 'border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500',
      },
      size: {
        sm: 'p-1.5 text-xs',
        md: 'p-2 text-sm',
        lg: 'p-3 text-base',
      },
    },
    defaultVariants: { tone: 'default', size: 'md' },
  },
);

export interface TFSelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'>,
    VariantProps<typeof tfSelectVariants> {}

export const TFSelect = forwardRef<HTMLSelectElement, TFSelectProps>(
  ({ className, tone, size, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(tfSelectVariants({ tone, size }), className)}
      {...props}
    >
      {children}
    </select>
  ),
);
TFSelect.displayName = 'TFSelect';
