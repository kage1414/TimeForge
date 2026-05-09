import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export const tfButtonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap',
  {
    variants: {
      variant: {
        primary: 'bg-indigo-600 text-white hover:bg-indigo-700',
        success: 'bg-green-600 text-white hover:bg-green-700',
        danger: 'bg-red-600 text-white hover:bg-red-700',
        warning: 'bg-amber-600 text-white hover:bg-amber-700',
        secondary: 'bg-gray-600 text-white hover:bg-gray-700',
        outline: 'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50',
        ghost: 'text-gray-700 hover:bg-gray-100',
        muted: 'bg-gray-200 text-gray-800 hover:bg-gray-300',
        link: 'text-indigo-600 hover:underline px-0 py-0',
        linkDanger: 'text-red-600 hover:underline px-0 py-0',
      },
      size: {
        xs: 'px-2 py-1 text-xs',
        sm: 'px-3 py-1.5 text-sm',
        md: 'px-4 py-2 text-sm',
        lg: 'px-6 py-2 text-base',
      },
      block: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      block: false,
    },
  },
);

export type TFButtonVariant = NonNullable<VariantProps<typeof tfButtonVariants>['variant']>;
export type TFButtonSize = NonNullable<VariantProps<typeof tfButtonVariants>['size']>;

export interface TFButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof tfButtonVariants> {
  /**
   * Render as the immediate child instead of a `<button>`. Useful when the trigger
   * needs to be an anchor or router Link without TF taking a router dependency.
   */
  asChild?: boolean;
}

export const TFButton = forwardRef<HTMLButtonElement, TFButtonProps>(
  ({ className, variant, size, block, asChild, type, ...props }, ref) => {
    const Comp: any = asChild ? Slot : 'button';
    const buttonType = asChild ? undefined : type ?? 'button';
    return (
      <Comp
        ref={ref}
        type={buttonType}
        className={cn(tfButtonVariants({ variant, size, block }), className)}
        {...props}
      />
    );
  },
);
TFButton.displayName = 'TFButton';
