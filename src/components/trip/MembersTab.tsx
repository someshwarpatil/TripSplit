'use client';

import { useState } from 'react';
import { Copy, Crown, UserMinus, Share2, QrCode } from 'lucide-react';
import Card from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Trip, Expense } from '@/types';
import { removeMember, addActivityLocal } from '@/lib/firestore';
import { getUserTotalSpend } from '@/utils/balance';
import { formatCurrency } from '@/utils/format';
import QRCodeModal from '@/components/trip/QRCodeModal';
import { toast } from 'sonner';

interface Props {
  tripId: string;
  trip: Trip;
  members: { uid: string; displayName: string; email: string; photoURL: string | null }[];
  expenses: Expense[];
  currentUid: string;
  isAdmin: boolean;
}

export default function MembersTab({ tripId, trip, members, expenses, currentUid, isAdmin }: Props) {
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [showQR, setShowQR] = useState(false);

  const handleRemove = () => {
    if (!removingMember) return;
    const memberName = members.find((m) => m.uid === removingMember)?.displayName || 'A member';
    const target = removingMember;
    removeMember(tripId, target).catch((err) => {
      console.error('Member remove failed', err);
      toast.error('Failed to remove member');
    });
    addActivityLocal(tripId, {
      type: 'member_removed',
      actorUid: currentUid,
      description: `${memberName} was removed from the trip`,
    }).promise.catch((err) => console.error('Activity log failed', err));
    toast.success('Member removed');
    setRemovingMember(null);
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(trip.inviteCode);
    toast.success('Invite code copied!');
  };

  const shareTrip = () => {
    const url = `${window.location.origin}/join?id=${trip.inviteCode}`;
    if (navigator.share) {
      navigator.share({ title: `Join ${trip.name}`, text: `Join my trip on TripSplit!`, url });
    } else {
      navigator.clipboard.writeText(url);
      toast.success('Invite link copied!');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={copyInviteCode} icon={<Copy className="w-3.5 h-3.5" />}>
          {trip.inviteCode}
        </Button>
        <Button variant="outline" size="sm" onClick={shareTrip} icon={<Share2 className="w-3.5 h-3.5" />}>
          Share
        </Button>
        <Button variant="outline" size="sm" onClick={() => setShowQR(true)} icon={<QrCode className="w-3.5 h-3.5" />}>
          QR
        </Button>
      </div>

      <div className="space-y-2 stagger">
        {members.map((member) => {
          const spent = getUserTotalSpend(member.uid, expenses);
          const isMemberAdmin = member.uid === trip.adminUid;
          return (
            <Card key={member.uid} padding="sm">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar name={member.displayName} photoURL={member.photoURL} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-[var(--color-text)] truncate">{member.displayName}</span>
                      {isMemberAdmin && (
                        <Badge icon={<Crown className="w-3 h-3" />}>Admin</Badge>
                      )}
                      {member.uid === currentUid && (
                        <span className="text-xs text-[var(--color-text-secondary)]">(you)</span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] truncate">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-medium text-[var(--color-text)] tnum">
                    {formatCurrency(spent, trip.currency)}
                  </span>
                  {isAdmin && !isMemberAdmin && (
                    <button
                      onClick={() => setRemovingMember(member.uid)}
                      className="p-2 rounded-lg hover:bg-[var(--color-primary-light)] text-[var(--color-text-secondary)] hover:text-[var(--color-error)] t-fast"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal
        isOpen={!!removingMember}
        onClose={() => setRemovingMember(null)}
        title="Remove Member"
      >
        <div className="space-y-4">
          <p className="text-sm text-[var(--color-text-secondary)]">
            Are you sure you want to remove{' '}
            <strong>{members.find((m) => m.uid === removingMember)?.displayName}</strong> from
            this trip? Their expenses will remain.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setRemovingMember(null)} className="flex-1">
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRemove} className="flex-1">
              Remove
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={showQR} onClose={() => setShowQR(false)} title="Invite QR Code">
        <QRCodeModal
          url={`${typeof window !== 'undefined' ? window.location.origin : ''}/join?id=${trip.inviteCode}`}
          tripName={trip.name}
        />
      </Modal>
    </div>
  );
}
