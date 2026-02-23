import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

export default function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${
        onClick ? 'cursor-pointer hover:shadow-md transition-shadow duration-200' : ''
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
