import type { Metadata } from 'next';
import { Suspense } from 'react';
import { getTeams, getVenues, getEvents } from '@/lib/data';
import EventsListClient from './EventsListClient';

export const metadata: Metadata = {
  title: 'All Events — SCSC',
  description: 'Browse every upcoming sporting event in LA County — filter by sport, level, and date.',
};

// Event data changes daily via the scraper pipeline — render per-request so
// it's never frozen at whatever Supabase looked like during the last build.
export const dynamic = 'force-dynamic';

export default async function EventsPage() {
  const [teams, venues, events] = await Promise.all([getTeams(), getVenues(), getEvents()]);

  return (
    <Suspense>
      <EventsListClient teams={teams} venues={venues} events={events} />
    </Suspense>
  );
}
