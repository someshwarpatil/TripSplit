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
    <div className="min-h-screen bg-[#FAFAFA]">
      <nav className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#E63946] rounded-lg flex items-center justify-center">
            <Map className="w-5 h-5 text-white" />
          </div>
          <span className="text-lg font-bold text-[#1A1A2E]">TripSplit</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/login">
            <Button variant="ghost" size="sm">Log in</Button>
          </Link>
          <Link href="/signup">
            <Button size="sm">Sign up</Button>
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-4 pt-20 pb-32">
        <div className="text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-[#FFF0F1] text-[#E63946] px-4 py-1.5 rounded-full text-sm font-medium mb-6">
            <Zap className="w-4 h-4" />
            Split expenses effortlessly
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold text-[#1A1A2E] leading-tight">
            Trip expenses,
            <br />
            <span className="text-[#E63946]">simplified.</span>
          </h1>
          <p className="mt-6 text-lg text-[#6B7280] leading-relaxed">
            Track shared expenses, split bills fairly, and settle up with
            friends — all in one beautiful app. No more spreadsheets or awkward
            conversations.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
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

        <div className="mt-28 grid sm:grid-cols-3 gap-6">
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
              className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm"
            >
              <div className="w-12 h-12 bg-[#FFF0F1] rounded-xl flex items-center justify-center text-[#E63946] mb-4">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold text-[#1A1A2E] mb-2">
                {feature.title}
              </h3>
              <p className="text-[#6B7280] text-sm leading-relaxed">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-20 text-center">
          <div className="inline-flex items-center gap-2 text-[#6B7280] text-sm">
            <Globe className="w-4 h-4" />
            Supports multiple currencies — USD, EUR, GBP, INR, and more
          </div>
        </div>
      </main>
    </div>
  );
}
