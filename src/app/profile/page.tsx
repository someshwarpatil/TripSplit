'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Calendar } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/layout/Navbar';
import Avatar from '@/components/ui/Avatar';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { signOut } from '@/lib/auth';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  if (loading || !user) return null;

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-[#6B7280] text-sm mb-6 hover:text-[#1A1A2E] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <Card className="p-6 text-center">
          <Avatar
            name={user.displayName || 'User'}
            photoURL={user.photoURL}
            size="lg"
            className="mx-auto"
          />
          <h1 className="text-xl font-bold text-[#1A1A2E] mt-4">{user.displayName}</h1>
          <div className="flex items-center justify-center gap-1 text-sm text-[#6B7280] mt-1">
            <Mail className="w-3.5 h-3.5" />
            {user.email}
          </div>
          {user.metadata?.creationTime && (
            <div className="flex items-center justify-center gap-1 text-sm text-[#6B7280] mt-1">
              <Calendar className="w-3.5 h-3.5" />
              Joined {new Date(user.metadata.creationTime).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </div>
          )}
        </Card>

        <Button variant="outline" onClick={handleSignOut} className="w-full mt-6">
          Sign Out
        </Button>
      </main>
    </div>
  );
}
