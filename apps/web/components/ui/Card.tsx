import { type HTMLAttributes, forwardRef } from 'react';

type CardVariant = 'default' | 'secondary' | 'dark';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  hoverable?: boolean;
  padding?: 'sm' | 'md' | 'lg';
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-white',
  secondary: 'bg-secondary',
  dark: 'bg-primary text-white',
};

const paddingStyles = {
  sm: 'p-4',
  md: 'p-[30px]',
  lg: 'p-10',
};

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'default',
      hoverable = true,
      padding = 'md',
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={`
          rounded-pluxes
          shadow-card
          transition-all duration-400 ease-in-out
          ${variantStyles[variant]}
          ${paddingStyles[padding]}
          ${hoverable ? 'hover:-translate-y-1 hover:shadow-card-hover' : ''}
          ${className}
        `}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

export default Card;
