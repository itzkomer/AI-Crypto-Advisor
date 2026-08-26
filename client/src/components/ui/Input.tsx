import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import clsx from 'clsx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string | undefined;
  hint?: string;
  leftIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon, className, id, ...rest }, ref) => {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const describedById = error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined;

    return (
      <div className="space-y-1.5">
        <label htmlFor={inputId} className="block text-sm font-medium text-ink-300">
          {label}
        </label>

        <div className="relative">
          {leftIcon ? (
            <span
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-500"
              aria-hidden="true"
            >
              {leftIcon}
            </span>
          ) : null}

          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedById}
            className={clsx(
              'h-11 w-full rounded-lg border bg-surface-850/80 px-3 text-sm text-ink-100',
              'placeholder:text-ink-500 transition-colors',
              'focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-500/25',
              leftIcon && 'pl-10',
              error ? 'border-bear/70' : 'border-white/10 hover:border-white/20',
              className,
            )}
            {...rest}
          />
        </div>

        {error ? (
          <p id={`${inputId}-error`} role="alert" className="text-xs text-bear">
            {error}
          </p>
        ) : hint ? (
          <p id={`${inputId}-hint`} className="text-xs text-ink-500">
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
