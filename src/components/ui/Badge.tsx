import { ReactNode } from 'react';

interface BadgeProps {
  children: ReactNode;
  variant?: 'default' | 'success' | 'error' | 'warning';
  className?: string;
}

const variants = {
  default: 'bg-[#FFF0F1] text-[#E63946]',
  success: 'bg-emerald-50 text-emerald-600',
  error: 'bg-red-50 text-red-600',
  warning: 'bg-amber-50 text-amber-600',
};

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
