'use client';

import { type InputHTMLAttributes, forwardRef } from 'react';

type InputVariant = 'light' | 'dark';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  variant?: InputVariant;
  fullWidth?: boolean;
}

const variantStyles: Record<InputVariant, string> = {
  light:
    'bg-white text-primary border border-divider placeholder:text-text/50 focus:border-accent',
  dark:
    'bg-divider-dark text-white backdrop-blur-[50px] border-none placeholder:text-white placeholder:opacity-60',
};

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      variant = 'light',
      fullWidth = true,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || props.name;

    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-semibold text-primary mb-2"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full text-base font-normal leading-[1.25em]
            rounded-pluxes-xs
            px-5 py-5
            outline-none
            transition-all duration-300 ease-in-out
            ${variantStyles[variant]}
            ${error ? 'border-error! ring-1 ring-error/30' : ''}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="mt-1.5 text-sm font-medium text-error">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
