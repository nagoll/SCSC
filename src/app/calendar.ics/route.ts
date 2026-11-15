import { getEvents, getTeams, getVenues } from '@/lib/data';
import { applyFilters, searchParamsToFilters } from '@/lib/filters';
import { buildFeed, feedName } from '@/lib/ics';
import type { Team, Venue } from '@/lib/types';

// A subscribable iCalendar feed of every game matching the calendar's filters,
// e.g. /calendar.ics?team=dodgers or /calendar.ics?level=juco&sport=basketball.
// Calendar apps poll it; the CDN answers repeat polls for the same filters, so
// Supabase is read at most about once an hour per distinct feed.
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const filters = searchParamsToFilters(new URL(request.url).searchParams);
  const [events, teamList, venueList] = await Promise.all([getEvents(), getTeams(), getVenues()]);
  const teams: Record<string, Team> = Object.fromEntries(teamList.map((t) => [t.id, t]));
  const venues: Record<string, Venue> = Object.fromEntries(venueList.map((v) => [v.id, v]));

  const body = buildFeed(applyFilters(events, filters, teams, venues), teams, venues, feedName(filters, teams));

  return new Response(body, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'inline; filename="scsc.ics"',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
