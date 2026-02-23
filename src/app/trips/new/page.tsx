'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/layout/Navbar';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { createTrip } from '@/lib/firestore';
import { addActivity } from '@/lib/firestore';
import { toast } from 'sonner';

const currencies = ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AUD', 'CAD'];

export default function NewTripPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  if (authLoading || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const tripId = await createTrip({
        name,
        destination,
        startDate,
        endDate,
        currency,
        adminUid: user.uid,
      });
      await addActivity(tripId, {
        type: 'trip_created',
        actorUid: user.uid,
        description: `${user.displayName} created the trip "${name}"`,
      });
      toast.success('Trip created!');
      router.push(`/trips/${tripId}`);
    } catch {
      toast.error('Failed to create trip');
    } finally {
      setLoading(false);
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

        <h1 className="text-2xl font-bold text-[#1A1A2E] mb-6">Create a New Trip</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <Input
            label="Trip Name"
            placeholder="e.g., Summer Road Trip"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            label="Destination (optional)"
            placeholder="e.g., Paris, France"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Start Date"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
            <Input
              label="End Date"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[#1A1A2E]">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-white text-[#1A1A2E] focus:outline-none focus:ring-2 focus:ring-[#E63946] focus:border-transparent transition-all"
            >
              {currencies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <Button type="submit" loading={loading} className="w-full">
            Create Trip
          </Button>
        </form>
      </main>
    </div>
  );
}
