import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ReactNode,
} from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

export const TFDialog = DialogPrimitive.Root;
export const TFDialogTrigger = DialogPrimitive.Trigger;
export const TFDialogClose = DialogPrimitive.Close;
export const TFDialogPortal = DialogPrimitive.Portal;

export const TFDialogOverlay = forwardRef<
  ElementRef<typeof DialogPrimitive.Overlay>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/50 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className,
    )}
    {...props}
  />
));
TFDialogOverlay.displayName = 'TFDialogOverlay';

export const tfDialogContentVariants = cva(
  'fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-full bg-white rounded-lg shadow-xl mx-4 outline-none focus-visible:outline-none',
  {
    variants: {
      size: {
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: 'max-w-xl',
        '2xl': 'max-w-2xl',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

export interface TFDialogContentProps
  extends ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof tfDialogContentVariants> {}

export const TFDialogContent = forwardRef<
  ElementRef<typeof DialogPrimitive.Content>,
  TFDialogContentProps
>(({ className, size, children, ...props }, ref) => (
  <TFDialogPortal>
    <TFDialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(tfDialogContentVariants({ size }), className)}
      {...props}
    >
      {children}
    </DialogPrimitive.Content>
  </TFDialogPortal>
));
TFDialogContent.displayName = 'TFDialogContent';

export function TFDialogHeader({ className, children }: { className?: string; children?: ReactNode }) {
  return <div className={cn('px-6 py-4 border-b', className)}>{children}</div>;
}

export const TFDialogTitle = forwardRef<
  ElementRef<typeof DialogPrimitive.Title>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn('text-lg font-semibold', className)}
    {...props}
  />
));
TFDialogTitle.displayName = 'TFDialogTitle';

export const TFDialogDescription = forwardRef<
  ElementRef<typeof DialogPrimitive.Description>,
  ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-gray-500 mt-1', className)}
    {...props}
  />
));
TFDialogDescription.displayName = 'TFDialogDescription';

export function TFDialogBody({ className, children }: { className?: string; children?: ReactNode }) {
  return <div className={cn('px-6 py-4', className)}>{children}</div>;
}

export function TFDialogFooter({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <div className={cn('px-6 py-4 border-t flex justify-end gap-2', className)}>{children}</div>
  );
}
