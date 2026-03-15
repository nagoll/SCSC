'use client';

import { useState } from 'react';
import type { SportEvent, Team, Venue, FeaturedContent } from '@/lib/types';
import FeaturedSection from '@/components/featured/FeaturedSection';
import EventDetail from '@/components/event/EventDetail';
import SignupBanner from '@/components/newsletter/SignupBanner';

import teamsData from '@/data/teams.json';
import venuesData from '@/data/venues.json';
import eventsData from '@/data/events.json';
import featuredData from '@/data/featured.json';

const teamsMap: Record<string, Team> = {};
for (const t of teamsData as Team[]) teamsMap[t.id] = t;

const venuesMap: Record<string, Venue> = {};
for (const v of venuesData as Venue[]) venuesMap[v.id] = v;

const eventsMap: Record<string, SportEvent> = {};
for (const e of eventsData as SportEvent[]) eventsMap[e.id] = e;

export default function FeaturedPage() {
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
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
            featured={featuredData as FeaturedContent[]}
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
