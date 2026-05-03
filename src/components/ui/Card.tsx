import { CSSProperties, ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  elevated?: boolean;
  style?: CSSProperties;
}

const PAD: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
};

export default function Card({
  children,
  className = '',
  onClick,
  padding = 'md',
  hover,
  elevated,
  style,
}: CardProps) {
  const interactive = onClick || hover;
  return (
    <div
      className={[
        'bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] t-fast',
        elevated ? 'shadow-[var(--shadow-md)]' : 'shadow-[var(--shadow-sm)]',
        PAD[padding],
        interactive ? 'press cursor-pointer hover:shadow-[var(--shadow-md)]' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={onClick}
      style={style}
    >
      {children}
    </div>
  );
}
