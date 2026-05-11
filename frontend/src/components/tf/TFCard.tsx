import { forwardRef, type HTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export const tfCardVariants = cva('bg-white rounded-lg shadow', {
  variants: {
    padding: {
      none: '',
      sm: 'p-3',
      md: 'p-4',
      lg: 'p-6',
    },
    bordered: {
      true: 'border border-gray-200 shadow-none',
      false: '',
    },
  },
  defaultVariants: { padding: 'md', bordered: false },
});

export interface TFCardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof tfCardVariants> {}

export const TFCard = forwardRef<HTMLDivElement, TFCardProps>(
  ({ className, padding, bordered, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(tfCardVariants({ padding, bordered }), className)}
      {...props}
    />
  ),
);
TFCard.displayName = 'TFCard';

export const TFCardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center justify-between mb-4', className)} {...props} />
  ),
);
TFCardHeader.displayName = 'TFCardHeader';

export const TFCardTitle = forwardRef<HTMLHeadingElement, HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={cn('font-semibold', className)} {...props} />
  ),
);
TFCardTitle.displayName = 'TFCardTitle';

export const TFCardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn('', className)} {...props} />,
);
TFCardContent.displayName = 'TFCardContent';
