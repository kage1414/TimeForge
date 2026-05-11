import { forwardRef, type AnchorHTMLAttributes } from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export const tfLinkVariants = cva(
  'hover:underline transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded',
  {
    variants: {
      tone: {
        primary: 'text-indigo-600 hover:text-indigo-700',
        danger: 'text-red-600 hover:text-red-700',
        muted: 'text-gray-500 hover:text-gray-700',
      },
      size: {
        sm: 'text-xs',
        md: 'text-sm',
        lg: 'text-base',
      },
    },
    defaultVariants: { tone: 'primary', size: 'md' },
  },
);

export interface TFLinkProps
  extends AnchorHTMLAttributes<HTMLAnchorElement>,
    VariantProps<typeof tfLinkVariants> {
  /**
   * Render as the immediate child (e.g. a router Link) instead of a plain `<a>`.
   * The TF library never imports a router; pass your router's Link as the child.
   */
  asChild?: boolean;
}

export const TFLink = forwardRef<HTMLAnchorElement, TFLinkProps>(
  ({ className, tone, size, asChild, ...props }, ref) => {
    const Comp: any = asChild ? Slot : 'a';
    return (
      <Comp
        ref={ref}
        className={cn(tfLinkVariants({ tone, size }), className)}
        {...props}
      />
    );
  },
);
TFLink.displayName = 'TFLink';
