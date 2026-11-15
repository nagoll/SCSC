import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { Team, Venue } from '@/lib/types';
import { formatDateLong, formatTime } from '@/lib/calendar';
import { SPORT_LABELS, AREA_LABELS } from '@/lib/constants';
import { getTeams, getVenues, getEvents } from '@/lib/data';
import { eventJsonLd, eventTitle, jsonLdScript } from '@/lib/seo';
import EventDetailClient from './EventDetailClient';

// Event data changes daily via the scraper pipeline — render per-request so
// new/updated events are never 404s or stale until the next Vercel build.
export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const [teams, venues, events] = await Promise.all([getTeams(), getVenues(), getEvents()]);
  const event = events.find((e) => e.id === id);
  if (!event) return { title: 'Event Not Found' };

  const home = teams.find((t) => t.id === event.homeTeam) as Team;
  const away = event.awayTeam ? teams.find((t) => t.id === event.awayTeam) : null;
  const venue = venues.find((v) => v.id === event.venue) as Venue;
  const title = eventTitle(event, home, away);
  const description = `${SPORT_LABELS[event.sport]} · ${formatDateLong(event.dateTime)} at ${formatTime(event.dateTime)} · ${venue.name}, ${AREA_LABELS[venue.neighborhood]}`;

  return {
    title: `${title} — SCSC`,
    description,
    alternates: { canonical: `/event/${event.id}` },
    openGraph: { title, description, type: 'website', url: `/event/${event.id}` },
  };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [teams, venues, events] = await Promise.all([getTeams(), getVenues(), getEvents()]);
  const event = events.find((e) => e.id === id);
  if (!event) notFound();

  const homeTeam = teams.find((t) => t.id === event.homeTeam) as Team;
  const awayTeam = event.awayTeam ? teams.find((t) => t.id === event.awayTeam) ?? null : null;
  const venue = venues.find((v) => v.id === event.venue) as Venue;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(eventJsonLd(event, homeTeam, awayTeam, venue)) }}
      />
      <EventDetailClient
        event={event}
        homeTeam={homeTeam}
        awayTeam={awayTeam}
        venue={venue}
      />
    </>
  );
}
