'use client';

import { type SelectHTMLAttributes, forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

type SelectVariant = 'light' | 'dark';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> {
  label?: string;
  error?: string;
  variant?: SelectVariant;
  options: SelectOption[];
  placeholder?: string;
  fullWidth?: boolean;
}

const variantStyles: Record<SelectVariant, string> = {
  light:
    'bg-white text-primary border border-divider focus:border-accent',
  dark:
    'bg-divider-dark text-white backdrop-blur-[50px] border-none',
};

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      variant = 'light',
      options,
      placeholder,
      fullWidth = true,
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const selectId = id || props.name;

    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-semibold text-primary mb-2"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`
              w-full text-base font-normal leading-[1.25em]
              rounded-pluxes-xs
              px-5 py-5 pr-12
              outline-none appearance-none
              transition-all duration-300 ease-in-out
              ${variantStyles[variant]}
              ${error ? 'border-error! ring-1 ring-error/30' : ''}
              ${className}
            `}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((option) => (
              <option key={option.value} value={option.value} className="text-primary">
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text pointer-events-none"
            aria-hidden="true"
          />
        </div>
        {error && (
          <p className="mt-1.5 text-sm font-medium text-error">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export default Select;
