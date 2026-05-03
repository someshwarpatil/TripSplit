'use client';

import { ButtonHTMLAttributes, forwardRef, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  icon?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading,
      children,
      className = '',
      disabled,
      icon,
      iconRight,
      fullWidth,
      style,
      ...props
    },
    ref
  ) => {
    const base =
      'press t-fast inline-flex items-center justify-center font-medium rounded-[var(--radius-md)] focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed select-none';

    const variants: Record<string, string> = {
      primary:
        'bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] shadow-[var(--shadow-coral)]',
      secondary:
        'bg-[var(--color-primary-light)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light-hover)]',
      outline:
        'border border-[var(--color-border-strong)] text-[var(--color-text)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] bg-transparent',
      ghost:
        'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text)]',
      danger: 'bg-[var(--color-error)] text-white hover:opacity-90',
      success: 'bg-[var(--color-success)] text-white hover:opacity-90',
    };

    const sizes: Record<string, string> = {
      sm: 'px-3 py-1.5 text-sm gap-1.5',
      md: 'px-5 py-2.5 text-sm gap-2',
      lg: 'px-6 py-3 text-base gap-2',
    };

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
        style={style}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          icon && <span className="inline-flex items-center">{icon}</span>
        )}
        {children}
        {iconRight && !loading && <span className="inline-flex items-center">{iconRight}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
export default Button;
