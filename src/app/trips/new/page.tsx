'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Navbar from '@/components/layout/Navbar';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { createTripLocal, addActivityLocal } from '@/lib/firestore';
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

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  if (authLoading || !user) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { id: tripId, promise } = createTripLocal({
      name,
      destination,
      startDate,
      endDate,
      currency,
      adminUid: user.uid,
    });
    promise.catch((err) => {
      console.error('Trip create failed', err);
      toast.error('Failed to create trip');
    });
    addActivityLocal(tripId, {
      type: 'trip_created',
      actorUid: user.uid,
      description: `${user.displayName} created the trip "${name}"`,
    }).promise.catch((err) => console.error('Activity log failed', err));
    toast.success('Trip created!');
    router.push(`/trips/${tripId}`);
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

        <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text)] mb-6">Create a New Trip</h1>

        <form onSubmit={handleSubmit} className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-5 sm:p-6 space-y-5">
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
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
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
            <label className="block text-sm font-medium text-[var(--color-text)]">
              Currency
            </label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-[var(--color-border-strong)] bg-[var(--color-input-bg)] text-[var(--color-text)] text-base focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"
            >
              {currencies.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <Button type="submit" className="w-full">
            Create Trip
          </Button>
        </form>
      </main>
    </div>
  );
}
