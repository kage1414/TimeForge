import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface TFEmptyProps {
  children: ReactNode;
  className?: string;
}

export function TFEmpty({ children, className }: TFEmptyProps) {
  return (
    <div className={cn('text-center py-12 text-gray-500 text-sm', className)}>{children}</div>
  );
}
