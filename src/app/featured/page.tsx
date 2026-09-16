import { getTeams, getVenues, getEvents, getFeatured } from '@/lib/data';
import FeaturedPageClient from './FeaturedPageClient';

export default async function FeaturedPage() {
  const [teams, venues, events, featured] = await Promise.all([
    getTeams(),
    getVenues(),
    getEvents(),
    getFeatured(),
  ]);

  return <FeaturedPageClient teams={teams} venues={venues} events={events} featured={featured} />;
}
