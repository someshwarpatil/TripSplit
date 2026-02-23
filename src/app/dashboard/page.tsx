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
import { formatCurrency, formatDateRange } from '@/utils/format';
import { Trip } from '@/types';

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
    <div className="min-h-screen bg-[#FAFAFA]">
      <Navbar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#1A1A2E]">Your Trips</h1>
            <p className="text-[#6B7280] text-sm mt-1">
              Manage and track your shared expenses
            </p>
          </div>
          <Link href="/trips/new">
            <Button>
              <Plus className="w-4 h-4" />
              New Trip
            </Button>
          </Link>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-[#FFF0F1] rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-[#E63946]" />
            </div>
            <h2 className="text-xl font-semibold text-[#1A1A2E] mb-2">
              No trips yet
            </h2>
            <p className="text-[#6B7280] mb-6 max-w-sm mx-auto">
              Create your first trip or join one with an invite code to get started.
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/trips/new">
                <Button>
                  <Plus className="w-4 h-4" />
                  Create Trip
                </Button>
              </Link>
              <Link href="/join">
                <Button variant="outline">Join Trip</Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trips.map((trip) => (
              <Card
                key={trip.id}
                className="p-5"
                onClick={() => router.push(`/trips/${trip.id}`)}
              >
                <h3 className="font-semibold text-[#1A1A2E] text-lg">
                  {trip.name}
                </h3>
                {trip.destination && (
                  <div className="flex items-center gap-1 text-[#6B7280] text-sm mt-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {trip.destination}
                  </div>
                )}
                <div className="flex items-center gap-1 text-[#6B7280] text-sm mt-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {formatDateRange(trip.startDate, trip.endDate)}
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1 text-[#6B7280] text-sm">
                    <Users className="w-3.5 h-3.5" />
                    {trip.memberUids.length} members
                  </div>
                  <span className="text-sm font-medium text-[#E63946]">
                    {trip.currency}
                  </span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
