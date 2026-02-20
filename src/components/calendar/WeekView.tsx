'use client';

import type { SportEvent, Team, Venue } from '@/lib/types';
import { getWeekDays, isSameDay, toDateKey } from '@/lib/calendar';
import { DAYS_OF_WEEK } from '@/lib/constants';
import EventCard from './EventCard';

interface WeekViewProps {
  date: Date;
  events: SportEvent[];
  teams: Record<string, Team>;
  venues: Record<string, Venue>;
  onEventClick: (eventId: string) => void;
  onDayClick: (date: Date) => void;
}

export default function WeekView({
  date,
  events,
  teams,
  venues,
  onEventClick,
  onDayClick,
}: WeekViewProps) {
  const weekDays = getWeekDays(date);
  const today = new Date();

  const eventsByDay = new Map<string, SportEvent[]>();
  for (const event of events) {
    const key = toDateKey(new Date(event.dateTime));
    if (!eventsByDay.has(key)) eventsByDay.set(key, []);
    eventsByDay.get(key)!.push(event);
  }

  // Sort events within each day by time
  for (const [, dayEvents] of eventsByDay) {
    dayEvents.sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());
  }

  return (
    <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-border bg-border">
      {/* Day Headers */}
      {weekDays.map((day, i) => {
        const isToday = isSameDay(day, today);
        return (
          <button
            key={i}
            onClick={() => onDayClick(day)}
            className={`bg-white px-2 py-3 text-center transition-colors hover:bg-cream-dark ${
              isToday ? 'bg-burnt-orange/5' : ''
            }`}
          >
            <div className="text-xs font-medium text-ink-muted">{DAYS_OF_WEEK[day.getDay()]}</div>
            <div
              className={`mt-1 text-lg font-semibold ${
                isToday ? 'text-burnt-orange' : 'text-ink'
              }`}
            >
              {day.getDate()}
            </div>
          </button>
        );
      })}

      {/* Event Slots */}
      {weekDays.map((day, i) => {
        const key = toDateKey(day);
        const dayEvents = eventsByDay.get(key) || [];
        const isToday = isSameDay(day, today);

        return (
          <div
            key={`events-${i}`}
            className={`min-h-[200px] bg-white p-1.5 ${isToday ? 'bg-burnt-orange/5' : ''}`}
          >
            <div className="space-y-1.5">
              {dayEvents.slice(0, 4).map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  homeTeam={teams[event.homeTeam]}
                  awayTeam={event.awayTeam ? teams[event.awayTeam] : null}
                  venue={venues[event.venue]}
                  onClick={() => onEventClick(event.id)}
                  compact
                />
              ))}
              {dayEvents.length > 4 && (
                <button
                  onClick={() => onDayClick(day)}
                  className="w-full rounded bg-cream-dark px-2 py-1 text-center text-[10px] font-medium text-ink-muted hover:text-burnt-orange"
                >
                  +{dayEvents.length - 4} more
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
