import Image from 'next/image';
import { getInitials } from '@/utils/format';

interface AvatarProps {
  name: string;
  photoURL?: string | null;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
};

export default function Avatar({ name, photoURL, size = 'md', className = '' }: AvatarProps) {
  if (photoURL) {
    return (
      <Image
        src={photoURL}
        alt={name}
        width={size === 'lg' ? 48 : size === 'md' ? 40 : 32}
        height={size === 'lg' ? 48 : size === 'md' ? 40 : 32}
        className={`${sizeClasses[size]} rounded-full object-cover shrink-0 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClasses[size]} rounded-full bg-[var(--color-accent)] text-[var(--color-primary)] font-semibold flex items-center justify-center shrink-0 ${className}`}
    >
      {getInitials(name)}
    </div>
  );
}
