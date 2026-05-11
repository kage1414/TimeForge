import { type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { TFLabel } from './TFLabel';

export interface TFFieldProps {
  label?: ReactNode;
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  error?: ReactNode;
  className?: string;
  children: ReactNode;
}

export function TFField({ label, htmlFor, required, hint, error, className, children }: TFFieldProps) {
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <TFLabel htmlFor={htmlFor}>
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </TFLabel>
      )}
      {children}
      {error ? (
        <p className="text-xs text-red-600 mt-1">{error}</p>
      ) : hint ? (
        <p className="text-xs text-gray-400 mt-1">{hint}</p>
      ) : null}
    </div>
  );
}
