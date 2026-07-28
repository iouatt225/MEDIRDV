import { type HTMLAttributes, forwardRef } from 'react';
import Image from 'next/image';

type AvatarSize = 'sm' | 'md' | 'lg';

interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  size?: AvatarSize;
  initials?: string;
}

const sizeStyles: Record<AvatarSize, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-20 h-20 text-xl',
};

const sizePixels: Record<AvatarSize, number> = {
  sm: 32,
  md: 48,
  lg: 80,
};

const Avatar = forwardRef<HTMLDivElement, AvatarProps>(
  (
    {
      src,
      alt = '',
      size = 'md',
      initials,
      className = '',
      ...props
    },
    ref
  ) => {
    const fallbackInitials = initials || alt
      .split(' ')
      .map((word) => word[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    return (
      <div
        ref={ref}
        className={`
          relative inline-flex items-center justify-center
          rounded-full overflow-hidden
          bg-secondary
          flex-shrink-0
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {src ? (
          <Image
            src={src}
            alt={alt}
            width={sizePixels[size]}
            height={sizePixels[size]}
            className="w-full h-full object-cover"
          />
        ) : (
          <span className="font-bold text-primary">
            {fallbackInitials}
          </span>
        )}
      </div>
    );
  }
);

Avatar.displayName = 'Avatar';

export default Avatar;
