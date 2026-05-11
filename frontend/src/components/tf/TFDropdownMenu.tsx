import {
  forwardRef,
  type ComponentPropsWithoutRef,
  type ElementRef,
  type ReactNode,
} from 'react';
import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu';
import { cn } from '../../lib/utils';
import { TFButton, type TFButtonProps } from './TFButton';

export const TFDropdownMenu = DropdownMenuPrimitive.Root;
export const TFDropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
export const TFDropdownMenuPortal = DropdownMenuPrimitive.Portal;

export const TFDropdownMenuContent = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Content>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, align = 'end', ...props }, ref) => (
  <TFDropdownMenuPortal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        'z-50 min-w-[140px] overflow-hidden rounded-md border border-gray-200 bg-white py-1 shadow-lg outline-none',
        className,
      )}
      {...props}
    />
  </TFDropdownMenuPortal>
));
TFDropdownMenuContent.displayName = 'TFDropdownMenuContent';

export const TFDropdownMenuItem = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Item>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & { destructive?: boolean }
>(({ className, destructive, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      'relative flex w-full cursor-pointer select-none items-center px-4 py-2 text-sm outline-none focus:bg-gray-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
      destructive ? 'text-red-600 focus:bg-red-50' : 'text-gray-700',
      className,
    )}
    {...props}
  />
));
TFDropdownMenuItem.displayName = 'TFDropdownMenuItem';

export const TFDropdownMenuSeparator = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Separator>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn('my-1 h-px bg-gray-100', className)}
    {...props}
  />
));
TFDropdownMenuSeparator.displayName = 'TFDropdownMenuSeparator';

export const TFDropdownMenuLabel = forwardRef<
  ElementRef<typeof DropdownMenuPrimitive.Label>,
  ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn('px-4 py-1.5 text-xs uppercase tracking-wide text-gray-400', className)}
    {...props}
  />
));
TFDropdownMenuLabel.displayName = 'TFDropdownMenuLabel';

/**
 * Convenience: a button + dropdown wired together.
 * Usage: <TFButtonMenu trigger={{ children: 'Export', variant: 'secondary' }} items={[...]} />
 */
export interface TFButtonMenuItem {
  label: ReactNode;
  onSelect: () => void;
  destructive?: boolean;
  disabled?: boolean;
}

export interface TFButtonMenuProps {
  trigger: TFButtonProps & { children: ReactNode };
  items: TFButtonMenuItem[];
  align?: 'start' | 'center' | 'end';
}

export function TFButtonMenu({ trigger, items, align = 'end' }: TFButtonMenuProps) {
  const { children: triggerChildren, ...triggerProps } = trigger;
  return (
    <TFDropdownMenu>
      <TFDropdownMenuTrigger asChild>
        <TFButton {...triggerProps}>
          {triggerChildren}
          <svg className="h-3 w-3 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </TFButton>
      </TFDropdownMenuTrigger>
      <TFDropdownMenuContent align={align}>
        {items.map((item, i) => (
          <TFDropdownMenuItem
            key={i}
            destructive={item.destructive}
            disabled={item.disabled}
            onSelect={(e) => {
              e.preventDefault();
              item.onSelect();
            }}
          >
            {item.label}
          </TFDropdownMenuItem>
        ))}
      </TFDropdownMenuContent>
    </TFDropdownMenu>
  );
}
