'use client';

import type { SportEvent } from '@/lib/types';
import { getMonthDays, isSameDay, toDateKey } from '@/lib/calendar';
import { DAYS_OF_WEEK, SPORT_ICONS } from '@/lib/constants';

interface MonthViewProps {
  year: number;
  month: number;
  events: SportEvent[];
  onDayClick: (date: Date) => void;
}

export default function MonthView({ year, month, events, onDayClick }: MonthViewProps) {
  const days = getMonthDays(year, month);
  const today = new Date();

  const eventsByDay = new Map<string, SportEvent[]>();
  for (const event of events) {
    const key = toDateKey(new Date(event.dateTime));
    if (!eventsByDay.has(key)) eventsByDay.set(key, []);
    eventsByDay.get(key)!.push(event);
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-border">
      {/* Day headers */}
      <div className="grid grid-cols-7 gap-px">
        {DAYS_OF_WEEK.map((day) => (
          <div
            key={day}
            className="bg-navy py-2 text-center text-xs font-semibold uppercase tracking-wider text-white"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-px">
        {days.map((day, i) => {
          const isCurrentMonth = day.getMonth() === month;
          const isToday = isSameDay(day, today);
          const key = toDateKey(day);
          const dayEvents = eventsByDay.get(key) || [];
          const uniqueSports = [...new Set(dayEvents.map((e) => e.sport))];

          return (
            <button
              key={i}
              onClick={() => onDayClick(day)}
              className={`min-h-[80px] bg-white p-2 text-left transition-colors hover:bg-cream-dark sm:min-h-[100px] ${
                !isCurrentMonth ? 'opacity-40' : ''
              } ${isToday ? 'bg-burnt-orange/5 ring-2 ring-inset ring-burnt-orange/20' : ''}`}
            >
              <div
                className={`text-sm font-semibold ${
                  isToday ? 'text-burnt-orange' : 'text-ink'
                }`}
              >
                {day.getDate()}
              </div>

              {dayEvents.length > 0 && (
                <div className="mt-1">
                  {/* Sport dots */}
                  <div className="flex flex-wrap gap-0.5">
                    {uniqueSports.slice(0, 5).map((sport) => (
                      <span key={sport} className="text-xs" title={sport}>
                        {SPORT_ICONS[sport]}
                      </span>
                    ))}
                  </div>
                  <div className="mt-0.5 text-[10px] font-medium text-ink-muted">
                    {dayEvents.length} event{dayEvents.length !== 1 ? 's' : ''}
                  </div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
