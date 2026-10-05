import { getTeams, getVenues, getEvents, getFeatured } from '@/lib/data';
import FeaturedPageClient from './FeaturedPageClient';

// Event data changes daily via the scraper pipeline — render per-request so
// it's never frozen at whatever Supabase looked like during the last build.
export const dynamic = 'force-dynamic';

export default async function FeaturedPage() {
  const [teams, venues, events, featured] = await Promise.all([
    getTeams(),
    getVenues(),
    getEvents(),
    getFeatured(),
  ]);

  return <FeaturedPageClient teams={teams} venues={venues} events={events} featured={featured} />;
}
