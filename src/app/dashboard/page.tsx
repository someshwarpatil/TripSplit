'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, MapPin, Users, Calendar } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/layout/Navbar';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { CardSkeleton } from '@/components/ui/Skeleton';
import { getUserTrips } from '@/lib/firestore';
import { formatDateRange } from '@/utils/format';
import { Trip } from '@/types';

const TRIP_GRADIENTS = [
  'linear-gradient(135deg, #E63946 0%, #F4A261 100%)',
  'linear-gradient(135deg, #457B9D 0%, #2A9D8F 100%)',
  'linear-gradient(135deg, #7A4A9D 0%, #E63946 100%)',
  'linear-gradient(135deg, #2A9D8F 0%, #E9C46A 100%)',
  'linear-gradient(135deg, #F4A261 0%, #E76F51 100%)',
  'linear-gradient(135deg, #1D3557 0%, #457B9D 100%)',
];

function gradientFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return TRIP_GRADIENTS[hash % TRIP_GRADIENTS.length];
}

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      getUserTrips(user.uid).then((t) => {
        setTrips(t);
        setLoading(false);
      });
    }
  }, [user]);

  if (authLoading || !user) return null;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
        <div className="flex items-center justify-between mb-6 sm:mb-8 animate-fade-in">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text)]">
              Hey, {(user.displayName || 'there').split(' ')[0]} <span aria-hidden>👋</span>
            </h1>
            <p className="text-[var(--color-text-secondary)] text-sm mt-1">
              {trips.length > 0 ? `${trips.length} ${trips.length === 1 ? 'trip' : 'trips'} on the go` : 'Ready for your next adventure?'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/join">
              <Button variant="outline" size="sm">
                <span className="hidden sm:inline">Join Trip</span>
                <span className="sm:hidden">Join</span>
              </Button>
            </Link>
            <Link href="/trips/new">
              <Button size="sm" icon={<Plus className="w-4 h-4" />}>
                <span className="hidden sm:inline">New Trip</span>
                <span className="sm:hidden">New</span>
              </Button>
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-16 sm:py-20">
            <div className="w-16 h-16 bg-[var(--color-primary-light)] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-[var(--color-primary)]" />
            </div>
            <h2 className="text-xl font-semibold text-[var(--color-text)] mb-2">
              No trips yet
            </h2>
            <p className="text-[var(--color-text-secondary)] mb-6 max-w-sm mx-auto">
              Create your first trip or join one with an invite code to get started.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center px-4 sm:px-0">
              <Link href="/trips/new">
                <Button className="w-full sm:w-auto" icon={<Plus className="w-4 h-4" />}>
                  Create Trip
                </Button>
              </Link>
              <Link href="/join">
                <Button variant="outline" className="w-full sm:w-auto">Join Trip</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 stagger">
            {trips.map((trip) => (
              <Card
                key={trip.id}
                padding="none"
                onClick={() => router.push(`/trips/${trip.id}`)}
                className="overflow-hidden"
              >
                <div
                  className="h-20 sm:h-24 w-full relative"
                  style={
                    trip.coverImageUrl
                      ? {
                          backgroundImage: `url(${trip.coverImageUrl})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                        }
                      : { background: gradientFor(trip.id) }
                  }
                >
                  <span className="absolute top-3 right-3 text-[11px] font-semibold text-white/95 bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
                    {trip.currency}
                  </span>
                </div>
                <div className="p-4 sm:p-5">
                  <h3 className="font-semibold text-[var(--color-text)] text-lg truncate">
                    {trip.name}
                  </h3>
                  {trip.destination && (
                    <div className="flex items-center gap-1 text-[var(--color-text-secondary)] text-sm mt-1">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{trip.destination}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-[var(--color-text-secondary)] text-sm mt-1">
                    <Calendar className="w-3.5 h-3.5 shrink-0" />
                    {formatDateRange(trip.startDate, trip.endDate)}
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--color-border)]">
                    <div className="flex items-center gap-1 text-[var(--color-text-secondary)] text-sm">
                      <Users className="w-3.5 h-3.5" />
                      {trip.memberUids.length} {trip.memberUids.length === 1 ? 'member' : 'members'}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
