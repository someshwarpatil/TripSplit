'use client';

import { useEffect, useState, useRef } from 'react';
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
  Download,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTrip, useExpenses, useSettlements, useMembers, useActivities, useAdvances } from '@/hooks/useTrip';
import Navbar from '@/components/layout/Navbar';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Avatar from '@/components/ui/Avatar';
import Tabs from '@/components/ui/Tabs';
import Skeleton from '@/components/ui/Skeleton';
import ExpensesTab from '@/components/trip/ExpensesTab';
import BalancesTab from '@/components/trip/BalancesTab';
import MembersTab from '@/components/trip/MembersTab';
import ActivityFeed from '@/components/trip/ActivityFeed';
import CategoryChart from '@/components/trip/CategoryChart';
import { formatCurrency, formatDateRange } from '@/utils/format';
import { getUserBalance, getUserTotalSpend, getTotalSpend } from '@/utils/balance';
import { exportCSV, exportPDF } from '@/utils/export';
import { toast } from 'sonner';

export default function TripDetailPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const tripId = params.tripId as string;
  const [showExport, setShowExport] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  const { trip, loading: tripLoading } = useTrip(tripId);
  const { expenses, loading: expensesLoading } = useExpenses(tripId);
  const { settlements } = useSettlements(tripId);
  const { advances } = useAdvances(tripId);
  const { activities } = useActivities(tripId);
  const { members } = useMembers(trip?.memberUids || []);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExport(false);
      }
    };
    if (showExport) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExport]);

  if (authLoading || !user) return null;

  if (tripLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-6 sm:py-8 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-3 gap-3 mt-6">
            <Skeleton className="h-20 sm:h-24" />
            <Skeleton className="h-20 sm:h-24" />
            <Skeleton className="h-20 sm:h-24" />
          </div>
        </main>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-[var(--color-bg)]">
        <Navbar />
        <main className="max-w-3xl mx-auto px-4 py-20 text-center">
          <h2 className="text-xl font-semibold text-[var(--color-text)]">Trip not found</h2>
          <Link href="/dashboard">
            <Button variant="outline" className="mt-4">Go to Dashboard</Button>
          </Link>
        </main>
      </div>
    );
  }

  const totalSpend = getTotalSpend(expenses);
  const userSpend = getUserTotalSpend(user.uid, expenses);
  const userBalance = getUserBalance(user.uid, expenses, settlements, trip.memberUids, advances, trip.adminUid);
  const isAdmin = trip.adminUid === user.uid;

  const copyInviteCode = () => {
    navigator.clipboard.writeText(trip.inviteCode);
    toast.success('Invite code copied!');
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    setShowExport(false);
    if (format === 'csv') {
      exportCSV(trip, expenses, settlements, members, advances);
      toast.success('CSV downloaded!');
    } else {
      exportPDF(trip, expenses, settlements, members, advances);
      toast.success('PDF downloaded!');
    }
  };

  const tabs = [
    { id: 'expenses', label: 'Expenses', icon: <Receipt className="w-4 h-4" /> },
    { id: 'balances', label: 'Balances', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'members', label: 'Members', icon: <Users className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-4 sm:py-8 pb-24">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-1 text-[var(--color-text-secondary)] text-sm hover:text-[var(--color-text)] transition-colors p-1 -ml-1 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="flex items-center gap-1">
            <div className="relative" ref={exportRef}>
              <Button variant="ghost" size="sm" onClick={() => setShowExport(!showExport)}>
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export</span>
              </Button>
              {showExport && (
                <div className="absolute right-0 top-full mt-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg z-40 py-1 min-w-[140px]">
                  <button
                    onClick={() => handleExport('csv')}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors"
                  >
                    CSV
                  </button>
                  <button
                    onClick={() => handleExport('pdf')}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--color-text)] hover:bg-[var(--color-surface-hover)] transition-colors"
                  >
                    PDF
                  </button>
                </div>
              )}
            </div>
            {isAdmin && (
              <Link href={`/trips/${tripId}/settings`}>
                <Button variant="ghost" size="sm">
                  <Settings className="w-4 h-4" />
                  <span className="hidden sm:inline">Settings</span>
                </Button>
              </Link>
            )}
          </div>
        </div>

        <div className="mb-5 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-[var(--color-text)]">{trip.name}</h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-2 text-sm text-[var(--color-text-secondary)]">
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
              className="flex items-center gap-1 bg-[var(--color-primary-light)] text-[var(--color-primary)] px-2.5 py-1 rounded-lg text-xs font-medium hover:bg-[var(--color-primary-light-hover)] transition-colors"
            >
              <Copy className="w-3 h-3" />
              {trip.inviteCode}
            </button>
          </div>
          <div className="flex items-center gap-1 mt-3">
            {members.slice(0, 5).map((m) => (
              <Avatar key={m.uid} name={m.displayName} photoURL={m.photoURL} size="sm" className="-ml-1 first:ml-0 ring-2 ring-[var(--color-bg)]" />
            ))}
            {members.length > 5 && (
              <span className="text-xs text-[var(--color-text-secondary)] ml-1">+{members.length - 5}</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6 sm:mb-8 stagger">
          <Card padding="sm" className="text-center sm:p-4">
            <p className="text-[10px] sm:text-xs text-[var(--color-text-secondary)] mb-0.5 sm:mb-1">Total Spend</p>
            <p className="text-sm sm:text-lg font-bold text-[var(--color-text)] tnum">
              {formatCurrency(totalSpend, trip.currency)}
            </p>
          </Card>
          <Card padding="sm" className="text-center sm:p-4">
            <p className="text-[10px] sm:text-xs text-[var(--color-text-secondary)] mb-0.5 sm:mb-1">Your Spend</p>
            <p className="text-sm sm:text-lg font-bold text-[var(--color-text)] tnum">
              {formatCurrency(userSpend, trip.currency)}
            </p>
          </Card>
          <Card
            padding="sm"
            className="text-center sm:p-4 border-l-4"
            style={{
              borderLeftColor:
                userBalance > 0
                  ? 'var(--color-success)'
                  : userBalance < 0
                  ? 'var(--color-error)'
                  : 'var(--color-border)',
            }}
          >
            <p className="text-[10px] sm:text-xs text-[var(--color-text-secondary)] mb-0.5 sm:mb-1">Your Balance</p>
            <p
              className="text-sm sm:text-lg font-bold tnum"
              style={{
                color:
                  userBalance > 0
                    ? 'var(--color-success)'
                    : userBalance < 0
                    ? 'var(--color-error)'
                    : 'var(--color-text)',
              }}
            >
              {userBalance >= 0 ? '+' : ''}{formatCurrency(userBalance, trip.currency)}
            </p>
          </Card>
        </div>

        {expenses.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <CategoryChart expenses={expenses} currency={trip.currency} />
          </div>
        )}

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
                  advances={advances}
                  members={members}
                  memberUids={trip.memberUids}
                  currency={trip.currency}
                  tripId={tripId}
                  currentUid={user.uid}
                  adminUid={trip.adminUid}
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
          aria-label="Add expense"
          className="fixed bottom-6 right-6 w-14 h-14 bg-[var(--color-primary)] text-white rounded-full flex items-center justify-center hover:bg-[var(--color-primary-hover)] press animate-pop-in z-30"
          style={{
            bottom: 'calc(1.5rem + env(safe-area-inset-bottom))',
            boxShadow: 'var(--shadow-coral)',
          }}
        >
          <Plus className="w-6 h-6" />
        </Link>
      </main>
    </div>
  );
}
