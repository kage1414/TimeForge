import {
  forwardRef,
  type HTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from 'react';
import { cn } from '../../lib/utils';

export const TFTable = forwardRef<HTMLTableElement, HTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    <div className="overflow-x-auto">
      <table ref={ref} className={cn('w-full text-sm', className)} {...props} />
    </div>
  ),
);
TFTable.displayName = 'TFTable';

export const TFTHead = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <thead ref={ref} className={cn('bg-gray-50 text-left text-gray-600', className)} {...props} />
  ),
);
TFTHead.displayName = 'TFTHead';

export const TFTBody = forwardRef<HTMLTableSectionElement, HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <tbody ref={ref} className={cn('', className)} {...props} />,
);
TFTBody.displayName = 'TFTBody';

export const TFTr = forwardRef<HTMLTableRowElement, HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn('border-t border-gray-100 hover:bg-gray-50', className)}
      {...props}
    />
  ),
);
TFTr.displayName = 'TFTr';

export const TFTh = forwardRef<HTMLTableCellElement, ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn('px-4 py-3 text-left font-medium text-xs uppercase tracking-wide', className)}
      {...props}
    />
  ),
);
TFTh.displayName = 'TFTh';

export const TFTd = forwardRef<HTMLTableCellElement, TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn('px-4 py-3', className)} {...props} />
  ),
);
TFTd.displayName = 'TFTd';
