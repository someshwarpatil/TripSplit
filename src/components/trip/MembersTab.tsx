'use client';

import { useState } from 'react';
import { Copy, Crown, UserMinus, Share2 } from 'lucide-react';
import Card from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import Modal from '@/components/ui/Modal';
import { Trip, Expense } from '@/types';
import { removeMember, addActivity } from '@/lib/firestore';
import { getUserTotalSpend } from '@/utils/balance';
import { formatCurrency } from '@/utils/format';
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
  const [removing, setRemoving] = useState(false);

  const handleRemove = async () => {
    if (!removingMember) return;
    setRemoving(true);
    try {
      const memberName = members.find((m) => m.uid === removingMember)?.displayName || 'A member';
      await removeMember(tripId, removingMember);
      await addActivity(tripId, {
        type: 'member_removed',
        actorUid: currentUid,
        description: `${memberName} was removed from the trip`,
      });
      toast.success('Member removed');
      setRemovingMember(null);
    } catch {
      toast.error('Failed to remove member');
    } finally {
      setRemoving(false);
    }
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(trip.inviteCode);
    toast.success('Invite code copied!');
  };

  const shareTrip = () => {
    const url = `${window.location.origin}/join/${trip.inviteCode}`;
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
        <Button variant="secondary" size="sm" onClick={copyInviteCode}>
          <Copy className="w-3.5 h-3.5" />
          {trip.inviteCode}
        </Button>
        <Button variant="outline" size="sm" onClick={shareTrip}>
          <Share2 className="w-3.5 h-3.5" />
          Share
        </Button>
      </div>

      <div className="space-y-2">
        {members.map((member) => {
          const spent = getUserTotalSpend(member.uid, expenses);
          const isMemberAdmin = member.uid === trip.adminUid;
          return (
            <Card key={member.uid} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar name={member.displayName} photoURL={member.photoURL} />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-[#1A1A2E]">{member.displayName}</span>
                      {isMemberAdmin && (
                        <Badge>
                          <Crown className="w-3 h-3 mr-1" />
                          Admin
                        </Badge>
                      )}
                      {member.uid === currentUid && (
                        <span className="text-xs text-[#6B7280]">(you)</span>
                      )}
                    </div>
                    <p className="text-xs text-[#6B7280]">{member.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-[#1A1A2E]">
                    {formatCurrency(spent, trip.currency)}
                  </span>
                  {isAdmin && !isMemberAdmin && (
                    <button
                      onClick={() => setRemovingMember(member.uid)}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-[#6B7280] hover:text-[#EF4444] transition-colors"
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
          <p className="text-sm text-[#6B7280]">
            Are you sure you want to remove{' '}
            <strong>{members.find((m) => m.uid === removingMember)?.displayName}</strong> from
            this trip? Their expenses will remain.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setRemovingMember(null)} className="flex-1">
              Cancel
            </Button>
            <Button variant="danger" onClick={handleRemove} loading={removing} className="flex-1">
              Remove
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
