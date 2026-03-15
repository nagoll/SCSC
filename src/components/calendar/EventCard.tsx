'use client';

import type { SportEvent, Team, Venue } from '@/lib/types';
import { formatTime, getTimeOfDay } from '@/lib/calendar';
import { SPORT_LABELS } from '@/lib/constants';
import SportIcon from '@/components/shared/SportIcon';
import LevelBadge from '@/components/shared/LevelBadge';
import TimeBadge from '@/components/shared/TimeBadge';

interface EventCardProps {
  event: SportEvent;
  homeTeam: Team;
  awayTeam: Team | null;
  venue: Venue;
  onClick?: () => void;
  compact?: boolean;
}

export default function EventCard({
  event,
  homeTeam,
  awayTeam,
  venue,
  onClick,
  compact = false,
}: EventCardProps) {
  if (compact) {
    return (
      <button
        onClick={onClick}
        className="group w-full rounded border border-border bg-surface p-2 text-left transition-all hover:border-burnt-orange/30 hover:shadow-sm"
      >
        <div className="flex items-center gap-1.5">
          <SportIcon sport={event.sport} size="sm" />
          <span className="truncate text-xs font-medium text-ink">
            {awayTeam
              ? `${awayTeam.shortName} @ ${homeTeam.shortName}`
              : event.eventName || homeTeam.shortName}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1">
          <span className="text-[10px] text-ink-muted">{formatTime(event.dateTime)}</span>
          <LevelBadge level={event.level} size="sm" />
        </div>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className="group w-full rounded-lg border border-border bg-surface p-4 text-left transition-all hover:border-burnt-orange/30 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {/* Sport + Level */}
          <div className="flex items-center gap-2">
            <SportIcon sport={event.sport} size="sm" />
            <span className="text-xs font-medium text-ink-muted">
              {SPORT_LABELS[event.sport]}
            </span>
            <LevelBadge level={event.level} size="sm" />
            {event.gender === 'womens' && (
              <span className="rounded bg-pink-100 px-1.5 py-0.5 text-[10px] font-medium text-pink-700 dark:bg-pink-900/40 dark:text-pink-300">
                Women&apos;s
              </span>
            )}
          </div>

          {/* Teams / Event Name */}
          <div className="mt-2">
            {awayTeam ? (
              <div className="flex items-center gap-2">
                <span className="font-semibold text-ink">{awayTeam.name}</span>
                <span className="text-xs text-ink-muted">@</span>
                <span className="font-semibold text-ink">{homeTeam.name}</span>
              </div>
            ) : (
              <span className="font-semibold text-ink">
                {event.eventName || homeTeam.name}
              </span>
            )}
          </div>

          {/* Time + Venue */}
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ink-light">
            <span className="font-medium">{formatTime(event.dateTime)}</span>
            <TimeBadge timeOfDay={getTimeOfDay(event.dateTime)} />
            <span className="text-ink-muted">·</span>
            <span className="text-ink-muted">{venue.name}</span>
            {event.venueConfidence === 'verified' && (
              <span className="rounded bg-live-green/10 px-1.5 py-0.5 text-[10px] font-medium text-live-green" title="Venue confirmed by multiple sources">
                Verified
              </span>
            )}
            {event.venueConfidence === 'unverified' && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" title="Venue not independently confirmed">
                Unverified
              </span>
            )}
          </div>
        </div>

        {/* Price / Featured */}
        <div className="flex flex-col items-end gap-1">
          {event.isFeatured && (
            <span className="rounded bg-gold/20 px-2 py-0.5 text-[10px] font-semibold text-gold uppercase tracking-wider">
              Featured
            </span>
          )}
          {event.price === 'free' && (
            <span className="text-xs font-semibold text-live-green">FREE</span>
          )}
          {event.ticketUrl && (
            <span className="text-xs text-burnt-orange opacity-0 transition-opacity group-hover:opacity-100">
              View Details →
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
