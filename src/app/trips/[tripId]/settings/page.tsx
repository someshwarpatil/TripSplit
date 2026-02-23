'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, RefreshCw, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTrip } from '@/hooks/useTrip';
import Navbar from '@/components/layout/Navbar';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Modal from '@/components/ui/Modal';
import { updateTrip, deleteTrip, regenerateInviteCode, addActivity } from '@/lib/firestore';
import { toast } from 'sonner';

export default function TripSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tripId = params.tripId as string;
  const { trip } = useTrip(tripId);

  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    if (trip) {
      setName(trip.name);
      setDestination(trip.destination);
      setStartDate(trip.startDate);
      setEndDate(trip.endDate);
    }
  }, [trip]);

  if (authLoading || !user || !trip) return null;
  if (trip.adminUid !== user.uid) {
    router.push(`/trips/${tripId}`);
    return null;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateTrip(tripId, { name, destination, startDate, endDate });
      await addActivity(tripId, {
        type: 'trip_updated',
        actorUid: user.uid,
        description: `${user.displayName} updated trip settings`,
      });
      toast.success('Trip updated!');
      router.push(`/trips/${tripId}`);
    } catch {
      toast.error('Failed to update trip');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      const newCode = await regenerateInviteCode(tripId);
      toast.success(`New invite code: ${newCode}`);
    } catch {
      toast.error('Failed to regenerate code');
    } finally {
      setRegenerating(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteTrip(tripId);
      toast.success('Trip deleted');
      router.push('/dashboard');
    } catch {
      toast.error('Failed to delete trip');
    } finally {
      setDeleting(false);
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

        <h1 className="text-2xl font-bold text-[#1A1A2E] mb-6">Trip Settings</h1>

        <form onSubmit={handleSave} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <Input label="Trip Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Destination" value={destination} onChange={(e) => setDestination(e.target.value)} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            <Input label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
          </div>
          <Button type="submit" loading={saving} className="w-full">Save Changes</Button>
        </form>

        <div className="mt-6 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-medium text-[#1A1A2E]">Invite Code</h3>
              <p className="text-sm text-[#6B7280]">Current: <span className="font-mono font-medium">{trip.inviteCode}</span></p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRegenerate} loading={regenerating}>
              <RefreshCw className="w-3.5 h-3.5" />
              Regenerate
            </Button>
          </div>
        </div>

        <div className="mt-6 bg-white rounded-2xl border border-red-100 shadow-sm p-6">
          <h3 className="font-medium text-[#EF4444]">Danger Zone</h3>
          <p className="text-sm text-[#6B7280] mt-1">Permanently delete this trip and all its data.</p>
          <Button variant="danger" size="sm" onClick={() => setShowDelete(true)} className="mt-3">
            <Trash2 className="w-3.5 h-3.5" />
            Delete Trip
          </Button>
        </div>

        <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Delete Trip">
          <div className="space-y-4">
            <p className="text-sm text-[#6B7280]">
              Are you sure you want to delete <strong>{trip.name}</strong>? All expenses, settlements, and data will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowDelete(false)} className="flex-1">Cancel</Button>
              <Button variant="danger" onClick={handleDelete} loading={deleting} className="flex-1">Delete</Button>
            </div>
          </div>
        </Modal>
      </main>
    </div>
  );
}
