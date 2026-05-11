import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export const tfBadgeVariants = cva(
  'inline-flex items-center rounded font-medium whitespace-nowrap',
  {
    variants: {
      tone: {
        neutral: 'bg-gray-100 text-gray-800',
        primary: 'bg-indigo-100 text-indigo-800',
        success: 'bg-green-100 text-green-800',
        danger: 'bg-red-100 text-red-800',
        warning: 'bg-amber-100 text-amber-800',
        info: 'bg-blue-100 text-blue-800',
        purple: 'bg-purple-100 text-purple-800',
      },
      size: {
        xs: 'px-1.5 py-0.5 text-xs',
        sm: 'px-2 py-0.5 text-xs',
        md: 'px-2 py-1 text-xs',
        lg: 'px-2.5 py-1 text-sm',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'md' },
  },
);

export type TFBadgeTone = NonNullable<VariantProps<typeof tfBadgeVariants>['tone']>;

export interface TFBadgeProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, 'size'>,
    VariantProps<typeof tfBadgeVariants> {}

export const TFBadge = forwardRef<HTMLSpanElement, TFBadgeProps>(
  ({ className, tone, size, ...props }, ref) => (
    <span ref={ref} className={cn(tfBadgeVariants({ tone, size }), className)} {...props} />
  ),
);
TFBadge.displayName = 'TFBadge';
