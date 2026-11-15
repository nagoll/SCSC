import type { SportEvent, Team, Venue } from './types';
import { SPORT_LABELS, LEVEL_LABELS, GENDER_LABELS } from './constants';

export const SITE_NAME = 'SCSC — Southern California Sports Calendar';
export const SITE_DESCRIPTION =
  'Every sporting event in LA County on one calendar. Professional, college, and junior college — filter by sport, level, area, and more.';

// Set NEXT_PUBLIC_SITE_URL once a custom domain is live; until then Vercel's
// production URL is used, so sitemap/robots/llms.txt links are always absolute.
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : 'http://localhost:3000')
).replace(/\/$/, '');

// Indexable top-level pages. Add new routes (e.g. /teams/[id]) here or in sitemap.ts.
export const STATIC_PAGES = [
  { path: '/', title: 'Calendar', description: 'Month, week, and day calendar of every LA County sporting event' },
  { path: '/events', title: 'All events', description: 'Filterable list of upcoming events by sport, level, area, price, and date' },
  { path: '/featured', title: 'Featured', description: 'Game of the week and hidden-gem picks' },
  { path: '/teams', title: 'Teams', description: 'Every pro, college, and junior college team tracked' },
  { path: '/rankings', title: 'College rankings', description: 'Where LA college teams stand in the national polls' },
  { path: '/newsletter', title: 'Newsletter', description: 'Weekly roundup of the best LA sporting events' },
] as const;

export function eventUrl(id: string): string {
  return `${SITE_URL}/event/${id}`;
}

export function eventTitle(event: SportEvent, home: Team | undefined, away: Team | null | undefined): string {
  if (away && home) return `${away.name} at ${home.name}`;
  return event.eventName || home?.name || 'Sporting event';
}

/** Events that haven't finished yet (started within the last day or later). */
export function upcomingEvents(events: SportEvent[], now = Date.now()): SportEvent[] {
  const cutoff = now - 24 * 60 * 60 * 1000;
  return events.filter((e) => Date.parse(e.dateTime) >= cutoff);
}

/** schema.org SportsEvent, the structured data search engines and AI assistants read. */
export function eventJsonLd(event: SportEvent, home: Team, away: Team | null, venue: Venue) {
  const team = (t: Team) => ({
    '@type': 'SportsTeam',
    name: t.name,
    sport: SPORT_LABELS[event.sport],
    ...(t.websiteUrl ? { url: t.websiteUrl } : {}),
  });
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name: eventTitle(event, home, away),
    description: `${GENDER_LABELS[event.gender]} ${LEVEL_LABELS[event.level]} ${SPORT_LABELS[event.sport]}${event.league ? ` · ${event.league}` : ''}`,
    sport: SPORT_LABELS[event.sport],
    startDate: event.dateTime,
    ...(event.endTime ? { endDate: event.endTime } : {}),
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url: eventUrl(event.id),
    ...(event.price === 'free' ? { isAccessibleForFree: true } : {}),
    location: {
      '@type': 'Place',
      name: venue.name,
      address: venue.address,
      geo: { '@type': 'GeoCoordinates', latitude: venue.lat, longitude: venue.lng },
    },
    homeTeam: team(home),
    ...(away ? { awayTeam: team(away) } : {}),
    competitor: [home, ...(away ? [away] : [])].map(team),
  };
}

/** Serialize JSON-LD safely for a <script> tag. */
export function jsonLdScript(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
