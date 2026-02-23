'use client';

import { useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  Copy,
  MapPin,
  Calendar,
  Receipt,
  BarChart3,
  Users,
  Settings,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTrip, useExpenses, useSettlements, useMembers, useActivities } from '@/hooks/useTrip';
import Navbar from '@/components/layout/Navbar';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import Tabs from '@/components/ui/Tabs';
import Skeleton from '@/components/ui/Skeleton';
import ExpensesTab from '@/components/trip/ExpensesTab';
import BalancesTab from '@/components/trip/BalancesTab';
import MembersTab from '@/components/trip/MembersTab';
import ActivityFeed from '@/components/trip/ActivityFeed';
import { formatCurrency, formatDateRange } from '@/utils/format';
import { getUserBalance, getUserTotalSpend, getTotalSpend } from '@/utils/balance';
import { toast } from 'sonner';

export async function generateStaticParams() { return []; }

export default function TripDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tripId = params.tripId as string;

  const { trip, loading: tripLoading } = useTrip(tripId);
  const { expenses, loading: expensesLoading } = useExpenses(tripId);
  const { settlements } = useSettlements(tripId);
  const { activities } = useActivities(tripId);
  const { members } = useMembers(trip?.memberUids || []);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  if (authLoading || !user) return null;

  if (tripLoading) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-8 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-3 gap-4 mt-6">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        </main>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-[#FAFAFA]">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-20 text-center">
          <h2 className="text-xl font-semibold text-[#1A1A2E]">Trip not found</h2>
          <Link href="/dashboard">
            <Button variant="outline" className="mt-4">Go to Dashboard</Button>
          </Link>
        </main>
      </div>
    );
  }

  const totalSpend = getTotalSpend(expenses);
  const userSpend = getUserTotalSpend(user.uid, expenses);
  const userBalance = getUserBalance(user.uid, expenses, settlements, trip.memberUids);
  const isAdmin = trip.adminUid === user.uid;

  const copyInviteCode = () => {
    navigator.clipboard.writeText(trip.inviteCode);
    toast.success('Invite code copied!');
  };

  const tabs = [
    { id: 'expenses', label: 'Expenses', icon: <Receipt className="w-4 h-4" /> },
    { id: 'balances', label: 'Balances', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'members', label: 'Members', icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAFA]">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1 text-[#6B7280] text-sm hover:text-[#1A1A2E] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          {isAdmin && (
            <Link href={`/trips/${tripId}/settings`}>
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4" />
                Settings
              </Button>
            </Link>
          )}
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-[#1A1A2E]">{trip.name}</h1>
          <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-[#6B7280]">
            {trip.destination && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5" />
                {trip.destination}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDateRange(trip.startDate, trip.endDate)}
            </span>
            <button
              onClick={copyInviteCode}
              className="flex items-center gap-1 bg-[#FFF0F1] text-[#E63946] px-2.5 py-1 rounded-lg text-xs font-medium hover:bg-[#FFD6D9] transition-colors"
            >
              <Copy className="w-3 h-3" />
              {trip.inviteCode}
            </button>
          </div>
          <div className="flex items-center gap-1 mt-3">
            {members.slice(0, 5).map((m) => (
              <Avatar key={m.uid} name={m.displayName} photoURL={m.photoURL} size="sm" className="-ml-1 first:ml-0 ring-2 ring-white" />
            ))}
            {members.length > 5 && (
              <span className="text-xs text-[#6B7280] ml-1">+{members.length - 5}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-8">
          <Card className="p-4 text-center">
            <p className="text-xs text-[#6B7280] mb-1">Total Spend</p>
            <p className="text-lg font-bold text-[#1A1A2E]">
              {formatCurrency(totalSpend, trip.currency)}
            </p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-[#6B7280] mb-1">Your Spend</p>
            <p className="text-lg font-bold text-[#1A1A2E]">
              {formatCurrency(userSpend, trip.currency)}
            </p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-xs text-[#6B7280] mb-1">Your Balance</p>
            <p className={`text-lg font-bold ${userBalance >= 0 ? 'text-emerald-600' : 'text-[#EF4444]'}`}>
              {userBalance >= 0 ? '+' : ''}{formatCurrency(userBalance, trip.currency)}
            </p>
          </Card>
        </div>

        <Tabs tabs={tabs} defaultTab="expenses">
          {(activeTab) => (
            <>
              {activeTab === 'expenses' && (
                <ExpensesTab
                  tripId={tripId}
                  expenses={expenses}
                  members={members}
                  currency={trip.currency}
                  loading={expensesLoading}
                />
              )}
              {activeTab === 'balances' && (
                <BalancesTab
                  expenses={expenses}
                  settlements={settlements}
                  members={members}
                  memberUids={trip.memberUids}
                  currency={trip.currency}
                  tripId={tripId}
                  currentUid={user.uid}
                />
              )}
              {activeTab === 'members' && (
                <MembersTab
                  tripId={tripId}
                  trip={trip}
                  members={members}
                  expenses={expenses}
                  currentUid={user.uid}
                  isAdmin={isAdmin}
                />
              )}
            </>
          )}
        </Tabs>

        {activities.length > 0 && (
          <div className="mt-8">
            <ActivityFeed activities={activities} members={members} />
          </div>
        )}

        <Link
          href={`/trips/${tripId}/expenses/new`}
          className="fixed bottom-6 right-6 w-14 h-14 bg-[#E63946] text-white rounded-full shadow-lg flex items-center justify-center hover:bg-[#C1121F] transition-colors z-30"
        >
          <Plus className="w-6 h-6" />
        </Link>
      </main>
    </div>
  );
}
