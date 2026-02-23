'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Map, Users, MapPin } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { getTripByInviteCode, joinTrip, addActivity } from '@/lib/firestore';
import { Trip } from '@/types';
import { toast } from 'sonner';
import Link from 'next/link';

export default function JoinByCodePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const inviteCode = (params.inviteCode as string).toUpperCase();

  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    getTripByInviteCode(inviteCode).then((t) => {
      setTrip(t);
      setLoading(false);
    });
  }, [inviteCode]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="animate-pulse text-[#6B7280]">Loading...</div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-[#1A1A2E] mb-2">Invalid invite code</h2>
          <p className="text-[#6B7280] mb-4">This invite link is invalid or has expired.</p>
          <Link href="/">
            <Button variant="outline">Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (authLoading) return null;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center">
          <div className="w-12 h-12 bg-[#E63946] rounded-xl flex items-center justify-center mx-auto mb-4">
            <Map className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-[#1A1A2E] mb-1">Join {trip.name}</h2>
          {trip.destination && (
            <p className="text-[#6B7280] text-sm">{trip.destination}</p>
          )}
          <p className="text-[#6B7280] text-sm mt-4 mb-6">Sign in or create an account to join this trip.</p>
          <div className="flex flex-col gap-3">
            <Link href={`/login?redirect=/join/${inviteCode}`}>
              <Button className="w-full">Sign In</Button>
            </Link>
            <Link href={`/signup?redirect=/join/${inviteCode}`}>
              <Button variant="outline" className="w-full">Create Account</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const alreadyMember = trip.memberUids.includes(user.uid);

  const handleJoin = async () => {
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
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center px-4">
      <Card className="w-full max-w-sm p-6 text-center">
        <div className="w-12 h-12 bg-[#E63946] rounded-xl flex items-center justify-center mx-auto mb-4">
          <Map className="w-7 h-7 text-white" />
        </div>
        <h2 className="text-xl font-semibold text-[#1A1A2E]">{trip.name}</h2>
        {trip.destination && (
          <p className="flex items-center justify-center gap-1 text-sm text-[#6B7280] mt-1">
            <MapPin className="w-3.5 h-3.5" />
            {trip.destination}
          </p>
        )}
        <p className="flex items-center justify-center gap-1 text-sm text-[#6B7280] mt-1">
          <Users className="w-3.5 h-3.5" />
          {trip.memberUids.length} members
        </p>
        {alreadyMember ? (
          <Button
            variant="secondary"
            className="w-full mt-6"
            onClick={() => router.push(`/trips/${trip.id}`)}
          >
            Go to Trip
          </Button>
        ) : (
          <Button className="w-full mt-6" onClick={handleJoin} loading={joining}>
            Join Trip
          </Button>
        )}
      </Card>
    </div>
  );
}
