'use client';

import { useState, useCallback } from 'react';
import type { SportEvent, Team, Venue, CalendarViewMode } from '@/lib/types';
import { MONTHS } from '@/lib/constants';
import MonthView from './MonthView';
import WeekView from './WeekView';
import DayView from './DayView';

interface CalendarViewProps {
  events: SportEvent[];
  teams: Record<string, Team>;
  venues: Record<string, Venue>;
  onEventClick: (eventId: string) => void;
  initialDate?: Date;
}

export default function CalendarView({
  events,
  teams,
  venues,
  onEventClick,
  initialDate,
}: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [currentDate, setCurrentDate] = useState(initialDate || new Date());

  const handlePrev = useCallback(() => {
    setCurrentDate((d) => {
      const next = new Date(d);
      if (viewMode === 'month') next.setMonth(next.getMonth() - 1);
      else if (viewMode === 'week') next.setDate(next.getDate() - 7);
      else next.setDate(next.getDate() - 1);
      return next;
    });
  }, [viewMode]);

  const handleNext = useCallback(() => {
    setCurrentDate((d) => {
      const next = new Date(d);
      if (viewMode === 'month') next.setMonth(next.getMonth() + 1);
      else if (viewMode === 'week') next.setDate(next.getDate() + 7);
      else next.setDate(next.getDate() + 1);
      return next;
    });
  }, [viewMode]);

  const handleToday = useCallback(() => {
    setCurrentDate(new Date());
  }, []);

  const handleDayClick = useCallback((date: Date) => {
    setCurrentDate(date);
    setViewMode('day');
  }, []);

  const getTitle = () => {
    if (viewMode === 'month') {
      return `${MONTHS[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    }
    if (viewMode === 'week') {
      const start = new Date(currentDate);
      start.setDate(currentDate.getDate() - currentDate.getDay());
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      if (start.getMonth() === end.getMonth()) {
        return `${MONTHS[start.getMonth()]} ${start.getDate()}–${end.getDate()}, ${start.getFullYear()}`;
      }
      return `${MONTHS[start.getMonth()].slice(0, 3)} ${start.getDate()} – ${MONTHS[end.getMonth()].slice(0, 3)} ${end.getDate()}, ${end.getFullYear()}`;
    }
    return currentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div>
      {/* Calendar Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrev}
            className="rounded-md border border-border p-1.5 text-ink-light transition-colors hover:bg-cream-dark"
            aria-label="Previous"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h2 className="font-display text-xl tracking-wide text-navy uppercase sm:text-2xl">
            {getTitle()}
          </h2>
          <button
            onClick={handleNext}
            className="rounded-md border border-border p-1.5 text-ink-light transition-colors hover:bg-cream-dark"
            aria-label="Next"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
          <button
            onClick={handleToday}
            className="rounded-md border border-border px-3 py-1 text-xs font-medium text-ink-light transition-colors hover:bg-cream-dark"
          >
            Today
          </button>
        </div>

        {/* View Toggle */}
        <div className="inline-flex rounded-md border border-border bg-white">
          {(['month', 'week', 'day'] as CalendarViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-1.5 text-xs font-medium capitalize transition-colors ${
                viewMode === mode
                  ? 'bg-navy text-white'
                  : 'text-ink-light hover:bg-cream-dark'
              } ${mode === 'month' ? 'rounded-l-md' : ''} ${mode === 'day' ? 'rounded-r-md' : ''}`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Body */}
      {viewMode === 'month' && (
        <MonthView
          year={currentDate.getFullYear()}
          month={currentDate.getMonth()}
          events={events}
          onDayClick={handleDayClick}
        />
      )}
      {viewMode === 'week' && (
        <WeekView
          date={currentDate}
          events={events}
          teams={teams}
          venues={venues}
          onEventClick={onEventClick}
          onDayClick={handleDayClick}
        />
      )}
      {viewMode === 'day' && (
        <DayView
          date={currentDate}
          events={events}
          teams={teams}
          venues={venues}
          onEventClick={onEventClick}
        />
      )}
    </div>
  );
}
