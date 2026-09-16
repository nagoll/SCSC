'use client';

import { useState, useMemo } from 'react';
import type { SportEvent, Team, Venue, FeaturedContent } from '@/lib/types';
import FeaturedSection from '@/components/featured/FeaturedSection';
import EventDetail from '@/components/event/EventDetail';
import SignupBanner from '@/components/newsletter/SignupBanner';

interface FeaturedPageClientProps {
  teams: Team[];
  venues: Venue[];
  events: SportEvent[];
  featured: FeaturedContent[];
}

export default function FeaturedPageClient({ teams, venues, events, featured }: FeaturedPageClientProps) {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  const teamsMap = useMemo(() => {
    const map: Record<string, Team> = {};
    for (const t of teams) map[t.id] = t;
    return map;
  }, [teams]);

  const venuesMap = useMemo(() => {
    const map: Record<string, Venue> = {};
    for (const v of venues) map[v.id] = v;
    return map;
  }, [venues]);

  const eventsMap = useMemo(() => {
    const map: Record<string, SportEvent> = {};
    for (const e of events) map[e.id] = e;
    return map;
  }, [events]);

  const selectedEvent = selectedEventId ? eventsMap[selectedEventId] : null;

  return (
    <div className="pb-16">
      <section className="border-b border-border px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="font-display text-3xl tracking-wide text-navy dark:text-gold uppercase sm:text-4xl">
            Featured Events
          </h1>
          <p className="mt-2 text-ink-light">
            Curated picks: the biggest matchups and under-the-radar events in LA County sports.
          </p>
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <FeaturedSection
            featured={featured}
            events={eventsMap}
            teams={teamsMap}
            venues={venuesMap}
            onEventClick={setSelectedEventId}
          />
        </div>
      </section>

      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SignupBanner />
        </div>
      </section>

      {selectedEvent && (
        <EventDetail
          event={selectedEvent}
          homeTeam={teamsMap[selectedEvent.homeTeam]}
          awayTeam={selectedEvent.awayTeam ? teamsMap[selectedEvent.awayTeam] : null}
          venue={venuesMap[selectedEvent.venue]}
          onClose={() => setSelectedEventId(null)}
        />
      )}
    </div>
  );
}
