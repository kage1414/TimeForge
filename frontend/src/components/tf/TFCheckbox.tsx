import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../../lib/utils';

export interface TFCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: ReactNode;
  description?: ReactNode;
}

export const TFCheckbox = forwardRef<HTMLInputElement, TFCheckboxProps>(
  ({ className, label, description, id, ...props }, ref) => {
    const input = (
      <input
        ref={ref}
        type="checkbox"
        id={id}
        className={cn(
          'rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 disabled:opacity-50',
          className,
        )}
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
TFCheckbox.displayName = 'TFCheckbox';
