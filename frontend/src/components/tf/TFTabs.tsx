import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
} from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { cn } from '../../lib/utils';

export const TFTabs = TabsPrimitive.Root;

export const TFTabsList = forwardRef<
  ElementRef<typeof TabsPrimitive.List>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.List
    ref={ref}
    className={cn(
      'flex flex-wrap items-center gap-1 border-b border-gray-200 mb-6',
      className,
    )}
    {...props}
  />
));
TFTabsList.displayName = 'TFTabsList';

export const TFTabsTrigger = forwardRef<
  ElementRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      'inline-flex items-center px-4 py-2 -mb-px text-sm font-medium text-gray-500 border-b-2 border-transparent rounded-t transition-colors hover:text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 data-[state=active]:text-indigo-600 data-[state=active]:border-indigo-600 disabled:opacity-50 disabled:pointer-events-none',
      className,
    )}
    {...props}
  />
));
TFTabsTrigger.displayName = 'TFTabsTrigger';

export const TFTabsContent = forwardRef<
  ElementRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn('focus-visible:outline-none', className)}
    {...props}
  />
));
TFTabsContent.displayName = 'TFTabsContent';
