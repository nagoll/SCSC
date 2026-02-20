'use client';

import { useState } from 'react';

interface SignupBannerProps {
  variant?: 'inline' | 'sticky';
}

export default function SignupBanner({ variant = 'inline' }: SignupBannerProps) {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // beehiiv integration placeholder — will be replaced with actual embed/API
    if (email) {
      setSubmitted(true);
      setEmail('');
    }
  };

  if (variant === 'sticky') {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-border bg-navy px-4 py-3 shadow-lg">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-sm font-medium text-white">
            Get the best LA sports events in your inbox every week.
          </p>
          {submitted ? (
            <span className="text-sm font-medium text-live-green">
              You&apos;re in! Check your email.
            </span>
          ) : (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-56 rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white placeholder:text-white/50 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
              />
              <button
                type="submit"
                className="rounded-md bg-burnt-orange px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-burnt-orange-dark"
              >
                Subscribe
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-navy p-6 sm:p-8">
      <div className="mx-auto max-w-xl text-center">
        <h3 className="font-display text-xl tracking-wide text-white uppercase sm:text-2xl">
          Never Miss a Game
        </h3>
        <p className="mt-2 text-sm text-white/70">
          Get the best LA sports events in your inbox every week. Pro to prep — we&apos;ve got you covered.
        </p>
        {submitted ? (
          <div className="mt-4 rounded-md bg-live-green/20 py-3 text-sm font-medium text-live-green">
            You&apos;re subscribed! Check your email for confirmation.
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 flex gap-2 sm:mx-auto sm:max-w-md">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="min-w-0 flex-1 rounded-md border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
            />
            <button
              type="submit"
              className="rounded-md bg-burnt-orange px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-burnt-orange-dark"
            >
              Subscribe
            </button>
          </form>
        )}
        <p className="mt-3 text-xs text-white/40">
          Free. Unsubscribe anytime. No spam, just sports.
        </p>
      </div>
    </div>
  );
}
