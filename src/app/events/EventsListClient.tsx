'use client';

import { useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { SportEvent, Team, Venue } from '@/lib/types';
import { SPORT_ICONS, LEVEL_LABELS, LEVEL_COLORS } from '@/lib/constants';
import { formatDate, formatTime, isSameDay } from '@/lib/calendar';

import teamsData from '@/data/teams.json';
import venuesData from '@/data/venues.json';
import eventsData from '@/data/events.json';

const teamsMap: Record<string, Team> = {};
for (const t of teamsData as Team[]) teamsMap[t.id] = t;

const venuesMap: Record<string, Venue> = {};
for (const v of venuesData as Venue[]) venuesMap[v.id] = v;

const allEvents = (eventsData as SportEvent[]).sort(
  (a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()
);

export default function EventsListClient() {
  const searchParams = useSearchParams();
  const showToday = searchParams.get('today') === '1';

  const today = new Date();

  const filteredEvents = useMemo(() => {
    if (showToday) {
      return allEvents.filter((e) => isSameDay(new Date(e.dateTime), today));
    }
    return allEvents;
  }, [showToday]);

  const title = showToday ? "Today's Events" : 'All Events';
  const subtitle = showToday
    ? `${filteredEvents.length} event${filteredEvents.length !== 1 ? 's' : ''} happening today`
    : `${filteredEvents.length} upcoming events across LA County`;

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <Link href="/" className="text-sm text-burnt-orange hover:text-burnt-orange-dark">
            &larr; Back to Calendar
          </Link>
          <h1 className="mt-2 font-display text-3xl tracking-wide text-navy dark:text-gold uppercase">
            {title}
          </h1>
          <p className="mt-1 text-ink-muted">{subtitle}</p>
          {showToday && (
            <Link
              href="/events"
              className="mt-2 inline-block text-sm font-medium text-burnt-orange hover:text-burnt-orange-dark"
            >
              View all events &rarr;
            </Link>
          )}
        </div>

        {filteredEvents.length === 0 ? (
          <div className="rounded-lg border border-border bg-surface px-6 py-12 text-center">
            <p className="text-lg font-medium text-ink-muted">
              {showToday ? 'No events scheduled for today.' : 'No upcoming events found.'}
            </p>
            {showToday && (
              <Link
                href="/events"
                className="mt-3 inline-block text-sm font-medium text-burnt-orange hover:text-burnt-orange-dark"
              >
                Browse all upcoming events &rarr;
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEvents.map((event) => {
              const home = teamsMap[event.homeTeam];
              const away = event.awayTeam ? teamsMap[event.awayTeam] : null;
              const venue = venuesMap[event.venue];
              const levelColors = LEVEL_COLORS[event.level];
              const isToday = isSameDay(new Date(event.dateTime), today);

              return (
                <Link
                  key={event.id}
                  href={`/event/${event.id}`}
                  className={`flex items-center gap-3 rounded-lg border border-border bg-surface p-3 transition-all hover:border-burnt-orange/30 hover:shadow-sm sm:gap-4 sm:p-4 ${
                    isToday ? 'ring-2 ring-inset ring-burnt-orange/20' : ''
                  }`}
                >
                  <span className="text-xl sm:text-2xl" title={event.sport}>
                    {SPORT_ICONS[event.sport]}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-ink">
                        {away
                          ? `${home.shortName} vs ${away.shortName}`
                          : event.eventName || home.name}
                      </span>
                      <span
                        className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${levelColors.bg} ${levelColors.text}`}
                      >
                        {event.level === 'juco' ? 'JuCo' : event.level === 'pro' ? 'Pro' : 'College'}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-ink-muted sm:text-sm">
                      {venue?.name}
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <div className="text-sm font-semibold text-ink">
                      {formatTime(event.dateTime)}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {formatDate(event.dateTime)}
                    </div>
                    {event.price === 'free' && (
                      <span className="text-[10px] font-semibold text-live-green">FREE</span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
