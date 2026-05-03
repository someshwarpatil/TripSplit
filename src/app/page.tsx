'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useEffect } from 'react';
import { Map, Users, Receipt, ArrowRight, Wallet, Globe, Zap } from 'lucide-react';
import Button from '@/components/ui/Button';
import Link from 'next/link';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  if (loading) return null;

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <nav className="max-w-5xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[var(--color-primary)] rounded-lg flex items-center justify-center">
            <Map className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-[var(--color-text)]">TripSplit</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">Log in</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Sign up</Button>
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 pt-12 sm:pt-20 pb-20 sm:pb-32">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-[var(--color-primary-light)] text-[var(--color-primary)] px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Split expenses effortlessly
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-[var(--color-text)] leading-tight">
            Trip expenses,
            <br />
            <span className="text-[var(--color-primary)]">simplified.</span>
          </h1>
          <p className="mt-4 sm:mt-6 text-base sm:text-lg text-[var(--color-text-secondary)] leading-relaxed px-2">
            Track shared expenses, split bills fairly, and settle up with
            friends — all in one beautiful app. No more spreadsheets or awkward
            conversations.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center px-4 sm:px-0">
            <Link href="/signup">
              <Button size="lg" className="w-full sm:w-auto">
                Get Started Free
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/join">
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                Join a Trip
              </Button>
            </Link>
          </div>
        </div>

        <div className="mt-16 sm:mt-28 grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          {[
            {
              icon: <Users className="w-6 h-6" />,
              title: 'Group Friendly',
              desc: 'Invite friends with a simple code. Everyone sees expenses in real-time.',
            },
            {
              icon: <Receipt className="w-6 h-6" />,
              title: 'Smart Splitting',
              desc: 'Split equally, by custom amounts, or percentages. Fair and flexible.',
            },
            {
              icon: <Wallet className="w-6 h-6" />,
              title: 'Simplified Debts',
              desc: 'Our algorithm minimizes the number of payments needed to settle up.',
            },
          ].map((feature) => (
            <div
              key={feature.title}
              className="bg-[var(--color-surface)] rounded-2xl p-5 sm:p-6 border border-[var(--color-border)] shadow-sm"
            >
              <div className="w-12 h-12 bg-[var(--color-primary-light)] rounded-xl flex items-center justify-center text-[var(--color-primary)] mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-[var(--color-text)] mb-2">
                {feature.title}
              </h3>
              <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-12 sm:mt-20 text-center">
          <div className="inline-flex items-center gap-2 text-[var(--color-text-secondary)] text-sm">
            <Globe className="w-4 h-4" />
            Supports multiple currencies — USD, EUR, GBP, INR, and more
          </div>
        </div>
      </main>
    </div>
  );
}
