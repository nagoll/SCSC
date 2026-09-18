import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { Team, Venue } from '@/lib/types';
import { formatDateLong, formatTime } from '@/lib/calendar';
import { SPORT_LABELS, AREA_LABELS } from '@/lib/constants';
import { getTeams, getVenues, getEvents } from '@/lib/data';
import EventDetailClient from './EventDetailClient';

export async function generateStaticParams() {
  const events = await getEvents();
  return events.map((event) => ({ id: event.id }));
}

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
  const title = away
    ? `${away.name} at ${home.name}`
    : event.eventName || home.name;

  return {
    title: `${title} — SCSC`,
    description: `${SPORT_LABELS[event.sport]} · ${formatDateLong(event.dateTime)} at ${formatTime(event.dateTime)} · ${venue.name}, ${AREA_LABELS[venue.neighborhood]}`,
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
    <EventDetailClient
      event={event}
      homeTeam={homeTeam}
      awayTeam={awayTeam}
      venue={venue}
    />
  );
}
