'use client';

import Link from 'next/link';
import type { SportEvent, Team, Venue } from '@/lib/types';
import { formatDateLong, formatTime, getTimeOfDay } from '@/lib/calendar';
import { SPORT_LABELS, AREA_LABELS } from '@/lib/constants';
import SportIcon from '@/components/shared/SportIcon';
import LevelBadge from '@/components/shared/LevelBadge';
import TimeBadge from '@/components/shared/TimeBadge';
import AddToCalendar from '@/components/event/AddToCalendar';
import { buildTicketUrl, TICKETS_ENABLED } from '@/lib/referral';

interface Props {
  event: SportEvent;
  homeTeam: Team;
  awayTeam: Team | null;
  venue: Venue;
}

export default function EventDetailClient({ event, homeTeam, awayTeam, venue }: Props) {
  const title = awayTeam
    ? `${awayTeam.name} at ${homeTeam.name}`
    : event.eventName || homeTeam.name;

  const resolvedTicketUrl = TICKETS_ENABLED && (event.ticketUrl ?? homeTeam.ticketUrl)
    ? buildTicketUrl((event.ticketUrl ?? homeTeam.ticketUrl)!)
    : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href="/"
        className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-burnt-orange"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to Calendar
      </Link>

      <div className="mt-6">
        {/* Sport + Level */}
        <div className="flex items-center gap-2">
          <SportIcon sport={event.sport} size="lg" />
          <span className="font-medium text-ink-muted">{SPORT_LABELS[event.sport]}</span>
          <LevelBadge level={event.level} />
          {event.gender === 'womens' && (
            <span className="rounded bg-pink-100 px-2 py-0.5 text-xs font-medium text-pink-700">
              Women&apos;s
            </span>
          )}
        </div>

        {/* Title */}
        <h1 className="mt-4 font-display text-3xl tracking-wide text-navy uppercase sm:text-4xl">
          {title}
        </h1>

        {/* Matchup */}
        {awayTeam && (
          <div className="mt-6 flex items-center gap-4 rounded-lg border border-border bg-white p-6">
            <div className="flex-1 text-right">
              <div className="text-2xl font-bold text-ink">{awayTeam.name}</div>
              <div className="text-sm text-ink-muted">{awayTeam.conference}</div>
            </div>
            <span className="rounded-lg bg-navy px-4 py-2 font-display text-lg text-white">
              @
            </span>
            <div className="flex-1">
              <div className="text-2xl font-bold text-ink">{homeTeam.name}</div>
              <div className="text-sm text-ink-muted">{homeTeam.conference}</div>
            </div>
          </div>
        )}

        {/* Date + Time */}
        <div className="mt-6 rounded-lg border border-border bg-white p-5">
          <div className="flex items-center gap-3">
            <svg className="h-6 w-6 text-ink-muted" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <div>
              <div className="text-lg font-semibold text-ink">{formatDateLong(event.dateTime)}</div>
              <div className="flex items-center gap-2 text-ink-light">
                <span>{formatTime(event.dateTime)}</span>
                <TimeBadge timeOfDay={getTimeOfDay(event.dateTime)} />
              </div>
            </div>
          </div>
        </div>

        {/* Venue */}
        <div className="mt-3 rounded-lg border border-border bg-white p-5">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 h-6 w-6 text-ink-muted" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <div>
              <div className="text-lg font-semibold text-ink">{venue.name}</div>
              <div className="text-ink-light">{venue.address}</div>
              <div className="mt-1 text-sm text-ink-muted">
                {AREA_LABELS[venue.neighborhood]}
                {venue.capacity && ` · Capacity: ${venue.capacity.toLocaleString()}`}
              </div>
            </div>
          </div>
          {(venue.parkingInfo || venue.transitInfo) && (
            <div className="mt-4 space-y-2 border-t border-border pt-4">
              {venue.parkingInfo && (
                <p className="text-sm text-ink-light">
                  <span className="font-medium">Parking:</span> {venue.parkingInfo}
                </p>
              )}
              {venue.transitInfo && (
                <p className="text-sm text-ink-light">
                  <span className="font-medium">Transit:</span> {venue.transitInfo}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Price + Tickets */}
        <div className="mt-3 rounded-lg border border-border bg-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-ink-muted">Admission</span>
              <div className="mt-1 text-lg font-semibold text-ink">
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
                className="rounded-lg bg-burnt-orange px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-burnt-orange-dark"
              >
                Get Tickets →
              </a>
            )}
          </div>
          {event.level === 'juco' && (
            <p className="mt-2 text-sm text-live-green">
              Community college games are typically free or very low cost!
            </p>
          )}
        </div>

        {/* Add to Calendar */}
        <div className="mt-6">
          <AddToCalendar
            title={title}
            start={event.dateTime}
            end={event.endTime}
            location={`${venue.name}, ${venue.address}`}
            description={`${SPORT_LABELS[event.sport]} - ${title}`}
          />
        </div>

        {/* Share */}
        <div className="mt-4 flex gap-3">
          <button
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
            }}
            className="flex-1 rounded-lg border border-border py-3 text-center text-sm font-medium text-ink-light transition-colors hover:bg-cream-dark"
          >
            Copy Link
          </button>
          <button
            onClick={() => {
              const text = `Check out ${title} at ${venue.name}!`;
              window.open(
                `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`,
                '_blank'
              );
            }}
            className="flex-1 rounded-lg border border-border py-3 text-center text-sm font-medium text-ink-light transition-colors hover:bg-cream-dark"
          >
            Share on X
          </button>
        </div>
      </div>
    </div>
  );
}
