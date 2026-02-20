'use client';

import type { FeaturedContent, SportEvent, Team, Venue } from '@/lib/types';
import { formatDate, formatTime } from '@/lib/calendar';
import { SPORT_LABELS } from '@/lib/constants';
import SportIcon from '@/components/shared/SportIcon';
import LevelBadge from '@/components/shared/LevelBadge';

interface FeaturedSectionProps {
  featured: FeaturedContent[];
  events: Record<string, SportEvent>;
  teams: Record<string, Team>;
  venues: Record<string, Venue>;
  onEventClick: (eventId: string) => void;
}

export default function FeaturedSection({
  featured,
  events,
  teams,
  venues,
  onEventClick,
}: FeaturedSectionProps) {
  const gamesOfWeek = featured.filter((f) => f.type === 'game-of-week');
  const hiddenGems = featured.filter((f) => f.type === 'hidden-gem');

  return (
    <div className="space-y-8">
      {/* Games of the Week */}
      {gamesOfWeek.length > 0 && (
        <div>
          <h3 className="font-display text-xl tracking-wide text-navy uppercase">
            Games of the Week
          </h3>
          <p className="mt-1 text-sm text-ink-muted">
            The matchups you don&apos;t want to miss this week.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {gamesOfWeek.map((item) => {
              const event = item.eventId ? events[item.eventId] : null;
              const home = event ? teams[event.homeTeam] : null;
              const away = event?.awayTeam ? teams[event.awayTeam] : null;
              const venue = event ? venues[event.venue] : null;

              return (
                <button
                  key={item.id}
                  onClick={() => item.eventId && onEventClick(item.eventId)}
                  className="group rounded-lg border border-border bg-white p-5 text-left transition-all hover:border-burnt-orange/30 hover:shadow-md"
                >
                  {event && (
                    <div className="mb-3 flex items-center gap-2">
                      <SportIcon sport={event.sport} size="sm" />
                      <span className="text-xs text-ink-muted">{SPORT_LABELS[event.sport]}</span>
                      <LevelBadge level={event.level} size="sm" />
                    </div>
                  )}
                  <h4 className="font-semibold text-ink group-hover:text-burnt-orange">
                    {item.title}
                  </h4>
                  <p className="mt-1.5 text-sm text-ink-light line-clamp-2">
                    {item.description}
                  </p>
                  {event && venue && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
                      <span>{formatDate(event.dateTime)}</span>
                      <span>·</span>
                      <span>{formatTime(event.dateTime)}</span>
                      <span>·</span>
                      <span>{venue.name}</span>
                    </div>
                  )}
                  {away && home && (
                    <div className="mt-2 text-xs font-medium text-navy">
                      {away.shortName} @ {home.shortName}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Hidden Gems */}
      {hiddenGems.length > 0 && (
        <div>
          <h3 className="font-display text-xl tracking-wide text-navy uppercase">
            Hidden Gems
          </h3>
          <p className="mt-1 text-sm text-ink-muted">
            Under-the-radar events worth checking out.
          </p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {hiddenGems.map((item) => {
              const event = item.eventId ? events[item.eventId] : null;
              const venue = event ? venues[event.venue] : null;

              return (
                <button
                  key={item.id}
                  onClick={() => item.eventId && onEventClick(item.eventId)}
                  className="group rounded-lg border-2 border-dashed border-border bg-white p-5 text-left transition-all hover:border-live-green/40 hover:shadow-md"
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-live-green/10 px-2 py-0.5 text-[10px] font-semibold text-live-green uppercase tracking-wider">
                      Hidden Gem
                    </span>
                    {event && <LevelBadge level={event.level} size="sm" />}
                  </div>
                  <h4 className="mt-2 font-semibold text-ink group-hover:text-live-green">
                    {item.title}
                  </h4>
                  <p className="mt-1.5 text-sm text-ink-light line-clamp-3">
                    {item.description}
                  </p>
                  {event && venue && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-ink-muted">
                      <span>{formatDate(event.dateTime)}</span>
                      <span>·</span>
                      <span>{formatTime(event.dateTime)}</span>
                      <span>·</span>
                      <span>{venue.name}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
