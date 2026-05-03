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
import { updateTrip, deleteTrip, regenerateInviteCode, addActivityLocal } from '@/lib/firestore';
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
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [showDelete, setShowDelete] = useState(false);
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
      setCoverImageUrl(trip.coverImageUrl || '');
    }
  }, [trip]);

  if (authLoading || !user || !trip) return null;
  if (trip.adminUid !== user.uid) {
    router.push(`/trips/${tripId}`);
    return null;
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateTrip(tripId, {
      name,
      destination,
      startDate,
      endDate,
      coverImageUrl: coverImageUrl.trim() || '',
    }).catch((err) => {
      console.error('Trip update failed', err);
      toast.error('Failed to update trip');
    });
    addActivityLocal(tripId, {
      type: 'trip_updated',
      actorUid: user.uid,
      description: `${user.displayName} updated trip settings`,
    }).promise.catch((err) => console.error('Activity log failed', err));
    toast.success('Trip updated!');
    router.push(`/trips/${tripId}`);
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

  const handleDelete = () => {
    deleteTrip(tripId).catch((err) => {
      console.error('Trip delete failed', err);
      toast.error('Failed to delete trip');
    });
    toast.success('Trip deleted');
    router.push('/dashboard');
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

        <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text)] mb-6">Trip Settings</h1>

        <form onSubmit={handleSave} className="bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-5 sm:p-6 space-y-5">
          <Input label="Trip Name" value={name} onChange={(e) => setName(e.target.value)} required />
          <Input label="Destination" value={destination} onChange={(e) => setDestination(e.target.value)} />
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <Input label="Start Date" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
            <Input label="End Date" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
          </div>

          <div className="space-y-2">
            <div
              className="relative w-full h-28 rounded-[var(--radius-md)] overflow-hidden border border-[var(--color-border)]"
              style={{
                backgroundImage: coverImageUrl
                  ? `url(${coverImageUrl})`
                  : 'linear-gradient(135deg, #E63946 0%, #F4A261 100%)',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            >
              {!coverImageUrl && (
                <div className="absolute inset-0 flex items-center justify-center text-white/90 text-xs font-medium">
                  Preview · default gradient
                </div>
              )}
            </div>
            <Input
              label="Cover Image URL"
              placeholder="https://images.unsplash.com/…"
              value={coverImageUrl}
              onChange={(e) => setCoverImageUrl(e.target.value)}
              hint="Paste any public image URL. Leave empty to use the default gradient."
            />
            {coverImageUrl && (
              <button
                type="button"
                onClick={() => setCoverImageUrl('')}
                className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-error)] t-fast"
              >
                Remove cover image
              </button>
            )}
          </div>

          <Button type="submit" className="w-full">Save Changes</Button>
        </form>

        <div className="mt-6 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-sm p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-medium text-[var(--color-text)]">Invite Code</h3>
              <p className="text-sm text-[var(--color-text-secondary)]">Current: <span className="font-mono font-medium">{trip.inviteCode}</span></p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRegenerate} loading={regenerating}>
              <RefreshCw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Regenerate</span>
            </Button>
          </div>
        </div>

        <div className="mt-6 bg-[var(--color-surface)] rounded-2xl border border-[var(--color-error)]/20 shadow-sm p-5 sm:p-6">
          <h3 className="font-medium text-[var(--color-error)]">Danger Zone</h3>
          <p className="text-sm text-[var(--color-text-secondary)] mt-1">Permanently delete this trip and all its data.</p>
          <Button variant="danger" size="sm" onClick={() => setShowDelete(true)} className="mt-3">
            <Trash2 className="w-3.5 h-3.5" />
            Delete Trip
          </Button>
        </div>

        <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Delete Trip">
          <div className="space-y-4">
            <p className="text-sm text-[var(--color-text-secondary)]">
              Are you sure you want to delete <strong>{trip.name}</strong>? All expenses, settlements, and data will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowDelete(false)} className="flex-1">Cancel</Button>
              <Button variant="danger" onClick={handleDelete} className="flex-1">Delete</Button>
            </div>
          </div>
        </Modal>
      </main>
    </div>
  );
}
