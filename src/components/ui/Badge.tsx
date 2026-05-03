import { CSSProperties, ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'error' | 'warning' | 'neutral';
  size?: 'sm' | 'md';
  icon?: ReactNode;
  bg?: string;
  color?: string;
  className?: string;
  style?: CSSProperties;
}

const variants: Record<string, { bg: string; color: string }> = {
  default: { bg: 'var(--color-primary-light)', color: 'var(--color-primary)' },
  success: { bg: 'rgba(16, 185, 129, 0.12)', color: 'var(--color-success)' },
  error: { bg: 'rgba(239, 68, 68, 0.12)', color: 'var(--color-error)' },
  warning: { bg: 'rgba(245, 158, 11, 0.14)', color: 'var(--color-warning)' },
  neutral: { bg: 'var(--color-surface-hover)', color: 'var(--color-text-secondary)' },
};

export default function Badge({
  children,
  variant = 'default',
  size = 'sm',
  icon,
  bg,
  color,
  className = '',
  style,
}: BadgeProps) {
  const v = variants[variant];
  const sz =
    size === 'md'
      ? 'px-3 py-1 text-xs gap-1.5'
      : 'px-2.5 py-0.5 text-[11px] gap-1';
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sz} ${className}`}
      style={{ background: bg ?? v.bg, color: color ?? v.color, ...style }}
    >
      {icon && <span className="inline-flex items-center">{icon}</span>}
      {children}
    </span>
  );
}
