import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export const tfTextareaVariants = cva(
  'border rounded p-2 w-full text-sm bg-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed resize-y',
  {
    variants: {
      tone: {
        default: 'border-gray-300',
        error: 'border-red-500 focus-visible:ring-red-500 focus-visible:border-red-500',
      },
    },
    defaultVariants: { tone: 'default' },
  },
);

export interface TFTextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement>,
    VariantProps<typeof tfTextareaVariants> {}

export const TFTextarea = forwardRef<HTMLTextAreaElement, TFTextareaProps>(
  ({ className, tone, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(tfTextareaVariants({ tone }), className)}
      {...props}
    />
  ),
);
TFTextarea.displayName = 'TFTextarea';
