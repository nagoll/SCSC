'use client';

import type { SportEvent, Team, Venue } from '@/lib/types';
import { formatDateLong, isSameDay } from '@/lib/calendar';
import EventCard from './EventCard';

interface DayViewProps {
  date: Date;
  events: SportEvent[];
  teams: Record<string, Team>;
  venues: Record<string, Venue>;
  onEventClick: (eventId: string) => void;
}

export default function DayView({ date, events, teams, venues, onEventClick }: DayViewProps) {
  const dayEvents = events
    .filter((e) => isSameDay(new Date(e.dateTime), date))
    .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

  const isToday = isSameDay(date, new Date());

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <h2 className="font-display text-2xl tracking-wide text-navy uppercase">
          {formatDateLong(date.toISOString())}
        </h2>
        {isToday && (
          <span className="rounded-full bg-burnt-orange px-3 py-0.5 text-xs font-semibold text-white">
            Today
          </span>
        )}
        <span className="text-sm text-ink-muted">
          {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
        </span>
      </div>

      {dayEvents.length === 0 ? (
        <div className="rounded-lg border border-border bg-white p-12 text-center">
          <p className="text-ink-muted">No events scheduled for this day.</p>
          <p className="mt-1 text-sm text-ink-muted">
            Try adjusting your filters or selecting a different date.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {dayEvents.map((event) => (
            <EventCard
              key={event.id}
              event={event}
              homeTeam={teams[event.homeTeam]}
              awayTeam={event.awayTeam ? teams[event.awayTeam] : null}
              venue={venues[event.venue]}
              onClick={() => onEventClick(event.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
