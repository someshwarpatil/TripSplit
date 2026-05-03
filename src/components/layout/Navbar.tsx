'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, Map, Moon, Sun } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme } from '@/context/ThemeContext';
import { signOut } from '@/lib/auth';
import Avatar from '@/components/ui/Avatar';

export default function Navbar() {
  const { user } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const toggleTheme = () => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  const isDark = resolvedTheme === 'dark';

  return (
    <nav className="sticky top-0 z-40 bg-[var(--color-navbar)] backdrop-blur-md border-b border-[var(--color-border)]">
      <div className="max-w-5xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
        <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[var(--color-primary)] rounded-lg flex items-center justify-center">
            <Map className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-[var(--color-text)]">TripSplit</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          <button
            onClick={toggleTheme}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="press p-2.5 rounded-lg hover:bg-[var(--color-surface-hover)] text-[var(--color-text-secondary)] t-fast"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {user && (
            <>
              <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity p-1 -m-1 rounded-lg">
                <Avatar
                  name={user.displayName || 'User'}
                  photoURL={user.photoURL}
                  size="sm"
                />
                <span className="text-sm font-medium text-[var(--color-text)] hidden sm:block max-w-[120px] truncate">
                  {user.displayName}
                </span>
              </Link>
              <button
                onClick={handleSignOut}
                className="p-2.5 rounded-lg hover:bg-[var(--color-surface-hover)] transition-colors text-[var(--color-text-secondary)]"
                title="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
