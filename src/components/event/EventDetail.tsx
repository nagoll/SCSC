'use client';

import type { SportEvent, Team, Venue } from '@/lib/types';
import { formatDateLong, formatTime, getTimeOfDay } from '@/lib/calendar';
import { SPORT_LABELS, AREA_LABELS } from '@/lib/constants';
import SportIcon from '@/components/shared/SportIcon';
import LevelBadge from '@/components/shared/LevelBadge';
import TimeBadge from '@/components/shared/TimeBadge';
import AddToCalendar from './AddToCalendar';
import { buildTicketUrl, TICKETS_ENABLED } from '@/lib/referral';

interface EventDetailProps {
  event: SportEvent;
  homeTeam: Team;
  awayTeam: Team | null;
  venue: Venue;
  onClose: () => void;
}

export default function EventDetail({
  event,
  homeTeam,
  awayTeam,
  venue,
  onClose,
}: EventDetailProps) {
  const title = awayTeam
    ? `${awayTeam.name} at ${homeTeam.name}`
    : event.eventName || homeTeam.name;

  const resolvedTicketUrl = TICKETS_ENABLED && (event.ticketUrl ?? homeTeam.ticketUrl)
    ? buildTicketUrl((event.ticketUrl ?? homeTeam.ticketUrl)!)
    : null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto bg-cream shadow-xl sm:w-[480px]">
        <div className="flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="font-display text-xl tracking-wide text-navy uppercase">
              Event Details
            </h2>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-ink-light hover:bg-cream-dark"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="px-6 py-6">
            {/* Sport + Level Badge Row */}
            <div className="flex items-center gap-2">
              <SportIcon sport={event.sport} size="lg" />
              <span className="text-sm font-medium text-ink-muted">{SPORT_LABELS[event.sport]}</span>
              <LevelBadge level={event.level} />
              {event.gender === 'womens' && (
                <span className="rounded bg-pink-100 px-2 py-0.5 text-xs font-medium text-pink-700">
                  Women&apos;s
                </span>
              )}
              {event.isFeatured && (
                <span className="rounded bg-gold/20 px-2 py-0.5 text-xs font-semibold text-gold uppercase tracking-wider">
                  Featured
                </span>
              )}
            </div>

            {/* Title / Matchup */}
            <div className="mt-4">
              {awayTeam ? (
                <div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 text-right">
                      <div className="text-xl font-bold text-ink">{awayTeam.name}</div>
                      <div className="text-xs text-ink-muted">{awayTeam.conference}</div>
                    </div>
                    <span className="rounded bg-navy px-3 py-1 font-display text-sm text-white">
                      @
                    </span>
                    <div className="flex-1">
                      <div className="text-xl font-bold text-ink">{homeTeam.name}</div>
                      <div className="text-xs text-ink-muted">{homeTeam.conference}</div>
                    </div>
                  </div>
                </div>
              ) : (
                <h3 className="text-xl font-bold text-ink">{title}</h3>
              )}
            </div>

            {/* Date + Time */}
            <div className="mt-6 rounded-lg border border-border bg-white p-4">
              <div className="flex items-center gap-3">
                <svg className="h-5 w-5 text-ink-muted" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                </svg>
                <div>
                  <div className="font-semibold text-ink">{formatDateLong(event.dateTime)}</div>
                  <div className="flex items-center gap-2 text-sm text-ink-light">
                    <span>{formatTime(event.dateTime)}</span>
                    <TimeBadge timeOfDay={getTimeOfDay(event.dateTime)} />
                  </div>
                </div>
              </div>
            </div>

            {/* Venue */}
            <div className="mt-3 rounded-lg border border-border bg-white p-4">
              <div className="flex items-start gap-3">
                <svg className="mt-0.5 h-5 w-5 text-ink-muted" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{venue.name}</span>
                    {event.venueConfidence === 'verified' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-live-green/10 px-2 py-0.5 text-[11px] font-medium text-live-green">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Verified
                      </span>
                    )}
                    {event.venueConfidence === 'unverified' && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-700">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                        </svg>
                        Unverified
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-ink-light">{venue.address}</div>
                  <div className="mt-1 text-xs text-ink-muted">
                    {AREA_LABELS[venue.neighborhood]}
                    {venue.capacity && ` · Capacity: ${venue.capacity.toLocaleString()}`}
                  </div>
                  {event.isNeutralSite && (
                    <div className="mt-1 text-xs font-medium text-navy">
                      Neutral Site Event
                    </div>
                  )}
                </div>
              </div>

              {(venue.parkingInfo || venue.transitInfo) && (
                <div className="mt-3 space-y-1 border-t border-border pt-3">
                  {venue.parkingInfo && (
                    <p className="text-xs text-ink-muted">
                      <span className="font-medium">Parking:</span> {venue.parkingInfo}
                    </p>
                  )}
                  {venue.transitInfo && (
                    <p className="text-xs text-ink-muted">
                      <span className="font-medium">Transit:</span> {venue.transitInfo}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Price + Tickets */}
            <div className="mt-3 rounded-lg border border-border bg-white p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-ink-muted">Admission</span>
                  <div className="mt-0.5 font-semibold text-ink">
                    {event.price === 'free' && 'Free'}
                    {event.price === 'under_20' && 'Under $20'}
                    {event.price === 'under_50' && '$20–$50'}
                    {event.price === 'over_50' && '$50+'}
                    {event.price === 'tbd' && 'TBD'}
                  </div>
                </div>
                {resolvedTicketUrl && (
                  <a
                    href={resolvedTicketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-md bg-burnt-orange px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-burnt-orange-dark"
                  >
                    Get Tickets →
                  </a>
                )}
              </div>
              {event.level === 'juco' && (
                <p className="mt-2 text-xs text-live-green">
                  Community college games are typically free or very low cost!
                </p>
              )}
            </div>

            {/* Add to Calendar */}
            <div className="mt-4">
              <AddToCalendar
                title={title}
                start={event.dateTime}
                end={event.endTime}
                location={`${venue.name}, ${venue.address}`}
                description={`${SPORT_LABELS[event.sport]} - ${title}`}
              />
            </div>

            {/* Share */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  const url = `${window.location.origin}/event/${event.id}`;
                  navigator.clipboard.writeText(url);
                }}
                className="flex-1 rounded-md border border-border py-2 text-center text-sm font-medium text-ink-light transition-colors hover:bg-cream-dark"
              >
                Copy Link
              </button>
              <button
                onClick={() => {
                  const url = `${window.location.origin}/event/${event.id}`;
                  const text = `Check out ${title} at ${venue.name}!`;
                  window.open(
                    `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
                    '_blank'
                  );
                }}
                className="flex-1 rounded-md border border-border py-2 text-center text-sm font-medium text-ink-light transition-colors hover:bg-cream-dark"
              >
                Share on X
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
