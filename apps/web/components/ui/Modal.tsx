'use client';

import { type HTMLAttributes, forwardRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';

interface ModalProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'max-w-md',
  md: 'max-w-xl',
  lg: 'max-w-3xl',
};

const Modal = forwardRef<HTMLDivElement, ModalProps>(
  (
    {
      open,
      onClose,
      title,
      size = 'md',
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const handleEscape = useCallback(
      (e: KeyboardEvent) => {
        if (e.key === 'Escape') onClose();
      },
      [onClose]
    );

    useEffect(() => {
      if (open) {
        document.addEventListener('keydown', handleEscape);
        document.body.style.overflow = 'hidden';
      }
      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = '';
      };
    }, [open, handleEscape]);

    if (!open) return null;

    return (
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-primary/60 backdrop-blur-sm animate-fade-in"
          onClick={onClose}
          aria-hidden="true"
        />

        {/* Dialog */}
        <div
          ref={ref}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className={`
            relative z-10
            w-full ${sizeStyles[size]}
            bg-white rounded-pluxes
            shadow-card-hover
            animate-scale-in
            ${className}
          `}
          {...props}
        >
          {/* Header */}
          {title && (
            <div className="flex items-center justify-between px-8 pt-8 pb-4">
              <h2 className="text-xl font-bold text-primary">{title}</h2>
              <button
                onClick={onClose}
                className="
                  p-2 rounded-full
                  text-text hover:text-primary hover:bg-secondary
                  transition-colors duration-200
                  cursor-pointer
                "
                aria-label="Fermer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Body */}
          <div className={`px-8 ${title ? 'pb-8' : 'py-8'}`}>
            {children}
          </div>
        </div>
      </div>
    );
  }
);

Modal.displayName = 'Modal';

export default Modal;
