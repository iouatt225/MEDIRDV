'use client';

import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-accent text-white hover:shadow-card-hover relative overflow-hidden group',
  secondary:
    'bg-transparent text-primary border-2 border-primary hover:bg-primary hover:text-white',
  ghost:
    'bg-transparent text-primary hover:bg-secondary',
  danger:
    'bg-error text-white hover:opacity-90',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'text-sm px-4 py-2',
  md: 'text-base px-5 py-[17px]',
  lg: 'text-lg px-8 py-5',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      disabled,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          relative inline-flex items-center justify-center gap-2
          font-bold leading-none capitalize
          rounded-pluxes-btn
          transition-all duration-400 ease-in-out
          cursor-pointer
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${fullWidth ? 'w-full' : ''}
          ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${className}
        `}
        {...props}
      >
        {/* Fill-from-right hover effect (primary only) */}
        {variant === 'primary' && (
          <span
            className="
              absolute inset-0 bg-primary z-0
              w-0 group-hover:w-full
              transition-all duration-400 ease-in-out
            "
            aria-hidden="true"
          />
        )}

        {/* Content */}
        <span className="relative z-10 flex items-center gap-2">
          {loading && (
            <Loader2 className="w-4 h-4 animate-spin" />
          )}
          {children}
        </span>
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
