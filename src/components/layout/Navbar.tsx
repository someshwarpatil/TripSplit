'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogOut, User, Map } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { signOut } from '@/lib/auth';
import Avatar from '@/components/ui/Avatar';

export default function Navbar() {
  const { user } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <nav className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href={user ? '/dashboard' : '/'} className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#E63946] rounded-lg flex items-center justify-center">
            <Map className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-[#1A1A2E]">TripSplit</span>
        </Link>

        {user && (
          <div className="flex items-center gap-3">
            <Link href="/profile" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Avatar
                name={user.displayName || 'User'}
                photoURL={user.photoURL}
                size="sm"
              />
              <span className="text-sm font-medium text-[#1A1A2E] hidden sm:block">
                {user.displayName}
              </span>
            </Link>
            <button
              onClick={handleSignOut}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-[#6B7280]"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
