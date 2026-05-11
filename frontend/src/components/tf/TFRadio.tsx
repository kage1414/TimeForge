import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface TFRadioProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  description?: ReactNode;
}

export const TFRadio = forwardRef<HTMLInputElement, TFRadioProps>(
  ({ className, label, description, id, ...props }, ref) => {
    const input = (
      <input
        ref={ref}
        type="radio"
        id={id}
        className={cn('accent-indigo-600 disabled:opacity-50', className)}
        {...props}
      />
    );
    if (!label && !description) return input;
    return (
      <label
        htmlFor={id}
        className={cn(
          'flex items-start gap-2 text-sm text-gray-700',
          props.disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        )}
      >
        <span className="flex h-5 items-center">{input}</span>
        <span>
          {label && <span>{label}</span>}
          {description && <span className="block text-xs text-gray-500">{description}</span>}
        </span>
      </label>
    );
  },
);
TFRadio.displayName = 'TFRadio';

export interface TFRadioGroupProps {
  className?: string;
  orientation?: 'horizontal' | 'vertical';
  children: ReactNode;
}

export function TFRadioGroup({
  className,
  orientation = 'vertical',
  children,
}: TFRadioGroupProps) {
  return (
    <div
      role="radiogroup"
      className={cn('flex gap-3', orientation === 'vertical' ? 'flex-col' : 'flex-row', className)}
    >
      {children}
    </div>
  );
}
