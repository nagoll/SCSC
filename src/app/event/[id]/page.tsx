import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import type { SportEvent, Team, Venue } from '@/lib/types';
import { formatDateLong, formatTime } from '@/lib/calendar';
import { SPORT_LABELS, AREA_LABELS } from '@/lib/constants';
import EventDetailClient from './EventDetailClient';

import teamsData from '@/data/teams.json';
import venuesData from '@/data/venues.json';
import eventsData from '@/data/events.json';

const teamsMap: Record<string, Team> = {};
for (const t of teamsData as Team[]) teamsMap[t.id] = t;

const venuesMap: Record<string, Venue> = {};
for (const v of venuesData as Venue[]) venuesMap[v.id] = v;

const eventsMap: Record<string, SportEvent> = {};
for (const e of eventsData as SportEvent[]) eventsMap[e.id] = e;

export async function generateStaticParams() {
  return (eventsData as SportEvent[]).map((event) => ({
    id: event.id,
  }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const event = eventsMap[id];
  if (!event) return { title: 'Event Not Found' };

  const home = teamsMap[event.homeTeam];
  const away = event.awayTeam ? teamsMap[event.awayTeam] : null;
  const venue = venuesMap[event.venue];
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
  const event = eventsMap[id];
  if (!event) notFound();

  const homeTeam = teamsMap[event.homeTeam];
  const awayTeam = event.awayTeam ? teamsMap[event.awayTeam] : null;
  const venue = venuesMap[event.venue];

  return (
    <EventDetailClient
      event={event}
      homeTeam={homeTeam}
      awayTeam={awayTeam}
      venue={venue}
    />
  );
}
