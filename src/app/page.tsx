import { Suspense } from 'react';
import { getTeams, getVenues, getEvents, getFeatured } from '@/lib/data';
import HomePageClient from './HomePageClient';

// Event data changes daily via the scraper pipeline — render per-request so
// it's never frozen at whatever Supabase looked like during the last build.
export const dynamic = 'force-dynamic';

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
