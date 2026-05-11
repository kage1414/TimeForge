import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface TFPageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function TFPageHeader({ title, subtitle, actions, className }: TFPageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap justify-between items-center gap-3 mb-6',
        className,
      )}
    >
      <div>
        <h1 className="text-2xl font-bold">{title}</h1>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
