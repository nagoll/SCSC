import { Suspense } from 'react';
import { getTeams, getVenues, getEvents, getFeatured } from '@/lib/data';
import HomePageClient from './HomePageClient';

export default async function HomePage() {
  const [teams, venues, events, featured] = await Promise.all([
    getTeams(),
    getVenues(),
    getEvents(),
    getFeatured(),
  ]);

  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-ink-muted">Loading calendar...</div>
      </div>
    }>
      <HomePageClient teams={teams} venues={venues} events={events} featured={featured} />
    </Suspense>
  );
}
