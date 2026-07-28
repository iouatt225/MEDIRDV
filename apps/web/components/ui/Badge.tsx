import { type HTMLAttributes, forwardRef } from 'react';

type BadgeVariant = 'default' | 'confirmed' | 'pending' | 'cancelled' | 'info';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  dot?: boolean;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    'bg-secondary text-primary',
  confirmed:
    'bg-success/10 text-success',
  pending:
    'bg-warning/10 text-warning',
  cancelled:
    'bg-error/10 text-error',
  info:
    'bg-accent/10 text-accent',
};

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-accent',
  confirmed: 'bg-success',
  pending: 'bg-warning',
  cancelled: 'bg-error',
  info: 'bg-accent',
};

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  (
    {
      variant = 'default',
      dot = true,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <span
        ref={ref}
        className={`
          relative inline-flex items-center gap-2
          text-sm font-medium capitalize leading-none
          rounded-full
          px-5 py-2.5
          ${dot ? 'pl-9' : ''}
          ${variantStyles[variant]}
          ${className}
        `}
        {...props}
      >
        {dot && (
          <span
            className={`
              absolute left-5 top-1/2 -translate-y-1/2
              w-1.5 h-1.5 rounded-full
              ${dotColors[variant]}
            `}
            aria-hidden="true"
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';

export default Badge;
