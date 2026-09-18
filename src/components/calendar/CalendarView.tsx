'use client';

import { useState, useCallback, useEffect } from 'react';
import type { SportEvent, Team, Venue, CalendarViewMode } from '@/lib/types';
import { MONTHS } from '@/lib/constants';
import { getPacificDateParts, addPacificDays, addPacificMonths, getWeekDays, formatDateLong } from '@/lib/calendar';
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

  useEffect(() => {
    if (window.innerWidth < 640) setViewMode('day');
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentDate((d) => {
      if (viewMode === 'month') return addPacificMonths(d, -1);
      if (viewMode === 'week') return addPacificDays(d, -7);
      return addPacificDays(d, -1);
    });
  }, [viewMode]);

  const handleNext = useCallback(() => {
    setCurrentDate((d) => {
      if (viewMode === 'month') return addPacificMonths(d, 1);
      if (viewMode === 'week') return addPacificDays(d, 7);
      return addPacificDays(d, 1);
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
      const { year, month } = getPacificDateParts(currentDate);
      return `${MONTHS[month]} ${year}`;
    }
    if (viewMode === 'week') {
      const week = getWeekDays(currentDate);
      const start = getPacificDateParts(week[0]);
      const end = getPacificDateParts(week[6]);
      if (start.month === end.month) {
        return `${MONTHS[start.month]} ${start.day}–${end.day}, ${start.year}`;
      }
      return `${MONTHS[start.month].slice(0, 3)} ${start.day} – ${MONTHS[end.month].slice(0, 3)} ${end.day}, ${end.year}`;
    }
    return formatDateLong(currentDate.toISOString());
  };

  return (
    <div>
      {/* Calendar Header */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <button
            onClick={handlePrev}
            className="shrink-0 rounded-md border border-border p-1.5 text-ink-light transition-colors hover:bg-cream-dark"
            aria-label="Previous"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <h2 className="min-w-0 truncate font-display text-lg tracking-wide text-navy dark:text-gold uppercase sm:text-2xl">
            {getTitle()}
          </h2>
          <button
            onClick={handleNext}
            className="shrink-0 rounded-md border border-border p-1.5 text-ink-light transition-colors hover:bg-cream-dark"
            aria-label="Next"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
          <button
            onClick={handleToday}
            className="shrink-0 rounded-md border border-border px-3 py-1 text-xs font-medium text-ink-light transition-colors hover:bg-cream-dark"
          >
            Today
          </button>
        </div>

        {/* View Toggle */}
        <div className="inline-flex shrink-0 rounded-md border border-border bg-surface">
          {(['month', 'week', 'day'] as CalendarViewMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 text-xs font-medium capitalize transition-colors sm:px-4 ${
                viewMode === mode
                  ? 'bg-navy text-white'
                  : 'text-ink-light hover:bg-cream-dark'
              } ${mode === 'month' ? 'rounded-l-md' : ''} ${mode === 'day' ? 'rounded-r-md' : ''}`}
            >
              <span className="sm:hidden">{mode.slice(0, 1).toUpperCase()}</span>
              <span className="hidden sm:inline capitalize">{mode}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Calendar Body */}
      {viewMode === 'month' && (
        <MonthView
          year={getPacificDateParts(currentDate).year}
          month={getPacificDateParts(currentDate).month}
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
