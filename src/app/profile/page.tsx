'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Calendar, Smartphone, Bell, BellOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/layout/Navbar';
import Avatar from '@/components/ui/Avatar';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { signOut } from '@/lib/auth';
import { getUserDoc, updateUserDoc } from '@/lib/firestore';
import { useFCM } from '@/hooks/useFCM';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [upiId, setUpiId] = useState('');
  const { status: notifStatus, working: notifWorking, enable: enableNotifs } = useFCM();

  useEffect(() => {
    if (!loading && !user) router.push('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      getUserDoc(user.uid).then((doc) => {
        if (doc?.upiId) setUpiId(doc.upiId);
      });
    }
  }, [user]);

  if (loading || !user) return null;

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  const handleSaveUpi = () => {
    updateUserDoc(user.uid, { upiId: upiId.trim() }).catch((err) => {
      console.error('UPI save failed', err);
      toast.error('Failed to save UPI ID');
    });
    toast.success('UPI ID saved!');
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-6 sm:py-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-[var(--color-text-secondary)] text-sm mb-6 hover:text-[var(--color-text)] transition-colors p-1 -ml-1 rounded-lg"
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
          <h1 className="text-xl font-bold text-[var(--color-text)] mt-4">{user.displayName}</h1>
          <div className="flex items-center justify-center gap-1 text-sm text-[var(--color-text-secondary)] mt-1">
            <Mail className="w-3.5 h-3.5" />
            {user.email}
          </div>
          {user.metadata?.creationTime && (
            <div className="flex items-center justify-center gap-1 text-sm text-[var(--color-text-secondary)] mt-1">
              <Calendar className="w-3.5 h-3.5" />
              Joined {new Date(user.metadata.creationTime).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
            </div>
          )}
        </Card>

        <Card className="p-5 sm:p-6 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Smartphone className="w-4 h-4 text-[var(--color-text-secondary)]" />
            <h2 className="text-sm font-medium text-[var(--color-text-secondary)]">Payment Settings</h2>
          </div>
          <Input
            label="UPI ID"
            placeholder="yourname@upi"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
          />
          <p className="text-xs text-[var(--color-text-secondary)] mt-1.5">
            Other members can use this to pay you directly via UPI apps.
          </p>
          <Button
            onClick={handleSaveUpi}
            className="w-full mt-3"
            variant="secondary"
          >
            Save UPI ID
          </Button>
        </Card>

        <Card className="p-5 sm:p-6 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4 text-[var(--color-text-secondary)]" />
            <h2 className="text-sm font-medium text-[var(--color-text-secondary)]">Notifications</h2>
          </div>
          {notifStatus === 'unsupported' ? (
            <p className="text-xs text-[var(--color-text-secondary)]">
              Push notifications aren&apos;t supported in this browser. On iPhone, install TripSplit to your home screen first.
            </p>
          ) : notifStatus === 'denied' ? (
            <div className="flex items-center gap-2 text-xs text-[var(--color-text-secondary)]">
              <BellOff className="w-3.5 h-3.5" />
              Blocked. Enable notifications for this site in your browser settings.
            </div>
          ) : notifStatus === 'granted' ? (
            <p className="text-xs text-[var(--color-text-secondary)]">
              You&apos;ll get a push when someone adds an expense, settles up, or records an advance.
            </p>
          ) : (
            <>
              <p className="text-xs text-[var(--color-text-secondary)] mb-3">
                Get a push when someone adds an expense, settles up, or records an advance.
              </p>
              <Button
                onClick={enableNotifs}
                loading={notifWorking}
                variant="secondary"
                className="w-full"
                icon={<Bell className="w-4 h-4" />}
              >
                Enable Notifications
              </Button>
            </>
          )}
        </Card>

        <Button variant="outline" onClick={handleSignOut} className="w-full mt-6">
          Sign Out
        </Button>
      </main>
    </div>
  );
}
