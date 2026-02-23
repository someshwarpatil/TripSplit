'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Users, MapPin } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/layout/Navbar';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import { getTripByInviteCode, joinTrip, addActivity } from '@/lib/firestore';
import { Trip } from '@/types';
import { toast } from 'sonner';

export default function JoinPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [trip, setTrip] = useState<Trip | null>(null);
  const [searching, setSearching] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  if (authLoading || !user) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 6) { toast.error('Enter a valid 6-character code'); return; }
    setSearching(true);
    try {
      const found = await getTripByInviteCode(code.toUpperCase());
      if (found) {
        setTrip(found);
        if (found.memberUids.includes(user.uid)) {
          toast.info('You are already a member of this trip');
        }
      } else {
        toast.error('No trip found with that code');
        setTrip(null);
      }
    } catch {
      toast.error('Failed to search');
    } finally {
      setSearching(false);
    }
  };

  const handleJoin = async () => {
    if (!trip) return;
    setJoining(true);
    try {
      await joinTrip(trip.id, user.uid);
      await addActivity(trip.id, {
        type: 'member_joined',
        actorUid: user.uid,
        description: `${user.displayName} joined the trip`,
      });
      toast.success('Joined trip!');
      router.push(`/trips/${trip.id}`);
    } catch {
      toast.error('Failed to join trip');
    } finally {
      setJoining(false);
    }
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

        <h1 className="text-2xl font-bold text-[#1A1A2E] mb-6">Join a Trip</h1>

        <form onSubmit={handleSearch} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <Input
            label="Invite Code"
            placeholder="e.g., ABC123"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={6}
            required
          />
          <Button type="submit" loading={searching} className="w-full">
            Find Trip
          </Button>
        </form>

        {trip && (
          <Card className="mt-6 p-6">
            <h2 className="text-lg font-semibold text-[#1A1A2E]">{trip.name}</h2>
            {trip.destination && (
              <p className="flex items-center gap-1 text-sm text-[#6B7280] mt-1">
                <MapPin className="w-3.5 h-3.5" />
                {trip.destination}
              </p>
            )}
            <p className="flex items-center gap-1 text-sm text-[#6B7280] mt-1">
              <Users className="w-3.5 h-3.5" />
              {trip.memberUids.length} members
            </p>
            {trip.memberUids.includes(user.uid) ? (
              <Button
                variant="secondary"
                className="w-full mt-4"
                onClick={() => router.push(`/trips/${trip.id}`)}
              >
                Go to Trip
              </Button>
            ) : (
              <Button
                className="w-full mt-4"
                onClick={handleJoin}
                loading={joining}
              >
                Join Trip
              </Button>
            )}
          </Card>
        )}
      </main>
    </div>
  );
}
