'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import type { SportEvent, Team, Venue, Filters, FeaturedContent } from '@/lib/types';
import { DEFAULT_FILTERS } from '@/lib/constants';
import { applyFilters, searchParamsToFilters, filtersToSearchParams, getActiveFilterCount } from '@/lib/filters';
import { isSameDay } from '@/lib/calendar';
import CalendarView from '@/components/calendar/CalendarView';
import FilterSidebar from '@/components/filters/FilterSidebar';
import FilterDrawer from '@/components/filters/FilterDrawer';
import EventDetail from '@/components/event/EventDetail';
import FeaturedSection from '@/components/featured/FeaturedSection';
import SignupBanner from '@/components/newsletter/SignupBanner';
import SportIcon from '@/components/shared/SportIcon';
import LevelBadge from '@/components/shared/LevelBadge';
import { formatTime } from '@/lib/calendar';

// Import data
import teamsData from '@/data/teams.json';
import venuesData from '@/data/venues.json';
import eventsData from '@/data/events.json';
import featuredData from '@/data/featured.json';

// Build lookup maps
const teamsMap: Record<string, Team> = {};
for (const t of teamsData as Team[]) teamsMap[t.id] = t;

const venuesMap: Record<string, Venue> = {};
for (const v of venuesData as Venue[]) venuesMap[v.id] = v;

const eventsMap: Record<string, SportEvent> = {};
for (const e of eventsData as SportEvent[]) eventsMap[e.id] = e;

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<Filters>(() => {
    if (searchParams.toString()) {
      return searchParamsToFilters(searchParams);
    }
    return DEFAULT_FILTERS;
  });
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Sync filters to URL
  useEffect(() => {
    const params = filtersToSearchParams(filters);
    const paramStr = params.toString();
    const currentStr = searchParams.toString();
    if (paramStr !== currentStr) {
      router.replace(paramStr ? `/?${paramStr}` : '/', { scroll: false });
    }
  }, [filters, router, searchParams]);

  const allEvents = eventsData as SportEvent[];

  const filteredEvents = useMemo(
    () => applyFilters(allEvents, filters, teamsMap, venuesMap),
    [allEvents, filters]
  );

  // Today's events
  const today = new Date();
  const todayEvents = useMemo(
    () =>
      filteredEvents
        .filter((e) => isSameDay(new Date(e.dateTime), today))
        .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime()),
    [filteredEvents, today]
  );

  const selectedEvent = selectedEventId ? eventsMap[selectedEventId] : null;
  const activeFilterCount = getActiveFilterCount(filters);

  return (
    <div className="pb-16">
      {/* Hero Section */}
      <section className="border-b border-border bg-cream px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <h1 className="font-display text-3xl tracking-wide text-navy uppercase sm:text-4xl lg:text-5xl">
            Southern California Sports Calendar
          </h1>
          <p className="mt-2 max-w-2xl text-ink-light">
            Every sporting event in LA County — professional, college, and junior college — on one calendar.
            Filter, discover, and never miss a game.
          </p>

          {/* Quick Stats */}
          <div className="mt-6 flex flex-wrap gap-4">
            <div className="rounded-lg border border-border bg-white px-4 py-2">
              <span className="text-2xl font-bold text-burnt-orange">{todayEvents.length}</span>
              <span className="ml-2 text-sm text-ink-muted">events today</span>
            </div>
            <div className="rounded-lg border border-border bg-white px-4 py-2">
              <span className="text-2xl font-bold text-navy">{allEvents.length}</span>
              <span className="ml-2 text-sm text-ink-muted">total events</span>
            </div>
            <div className="rounded-lg border border-border bg-white px-4 py-2">
              <span className="text-2xl font-bold text-live-green">{Object.keys(teamsMap).length}</span>
              <span className="ml-2 text-sm text-ink-muted">teams</span>
            </div>
          </div>
        </div>
      </section>

      {/* What's On Today */}
      {todayEvents.length > 0 && (
        <section className="border-b border-border px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center gap-3">
              <span className="relative flex h-3 w-3">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-live-green opacity-75" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-live-green" />
              </span>
              <h2 className="font-display text-xl tracking-wide text-navy uppercase">
                Today in LA Sports
              </h2>
              <span className="text-sm text-ink-muted">
                {todayEvents.length} event{todayEvents.length !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
              {todayEvents.slice(0, 8).map((event) => {
                const home = teamsMap[event.homeTeam];
                const away = event.awayTeam ? teamsMap[event.awayTeam] : null;
                const venue = venuesMap[event.venue];
                return (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEventId(event.id)}
                    className="flex min-w-[200px] flex-shrink-0 flex-col rounded-lg border border-border bg-white p-3 text-left transition-all hover:border-burnt-orange/30 hover:shadow-md"
                  >
                    <div className="flex items-center gap-1.5">
                      <SportIcon sport={event.sport} size="sm" />
                      <LevelBadge level={event.level} size="sm" />
                    </div>
                    <div className="mt-1.5 text-sm font-semibold text-ink">
                      {away ? `${away.shortName} @ ${home.shortName}` : event.eventName || home.shortName}
                    </div>
                    <div className="mt-1 text-xs text-ink-muted">
                      {formatTime(event.dateTime)} · {venue.name}
                    </div>
                    {event.price === 'free' && (
                      <span className="mt-1 text-[10px] font-semibold text-live-green">FREE</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Main Content: Filters + Calendar */}
      <section className="px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex gap-6">
            {/* Filter Sidebar (Desktop) */}
            <aside className="hidden w-64 flex-shrink-0 lg:block">
              <div className="sticky top-20">
                <FilterSidebar
                  filters={filters}
                  onFiltersChange={setFilters}
                  teams={teamsMap}
                  venues={venuesMap}
                />
              </div>
            </aside>

            {/* Calendar */}
            <div className="min-w-0 flex-1">
              {/* Mobile Filter Button */}
              <div className="mb-4 lg:hidden">
                <button
                  onClick={() => setFilterDrawerOpen(true)}
                  className="inline-flex items-center gap-2 rounded-md border border-border bg-white px-4 py-2 text-sm font-medium text-ink-light transition-colors hover:bg-cream-dark"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                  </svg>
                  Filters
                  {activeFilterCount > 0 && (
                    <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-burnt-orange text-[10px] font-bold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>
              </div>

              {/* Results Summary */}
              {activeFilterCount > 0 && (
                <div className="mb-4 flex items-center gap-2 rounded-md bg-cream-dark px-3 py-2 text-sm text-ink-light">
                  <span>
                    Showing <strong className="text-ink">{filteredEvents.length}</strong> of {allEvents.length} events
                  </span>
                  <button
                    onClick={() => setFilters(DEFAULT_FILTERS)}
                    className="ml-auto text-xs font-medium text-burnt-orange hover:text-burnt-orange-dark"
                  >
                    Clear Filters
                  </button>
                </div>
              )}

              <CalendarView
                events={filteredEvents}
                teams={teamsMap}
                venues={venuesMap}
                onEventClick={setSelectedEventId}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Featured Section */}
      <section className="border-t border-border px-4 py-8 sm:px-6 lg:px-8">
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

      {/* Newsletter */}
      <section className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <SignupBanner />
        </div>
      </section>

      {/* Mobile Filter Drawer */}
      <FilterDrawer
        open={filterDrawerOpen}
        onClose={() => setFilterDrawerOpen(false)}
        filters={filters}
        onFiltersChange={setFilters}
        teams={teamsMap}
        venues={venuesMap}
      />

      {/* Event Detail Panel */}
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
