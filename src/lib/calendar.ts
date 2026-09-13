import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';
import type { TimeOfDay, DayType } from './types';

const TZ = 'America/Los_Angeles';

export interface PacificDateParts {
  year: number;
  month: number; // 0-indexed, matches Date.getMonth()
  day: number;
  weekday: number; // 0 = Sunday .. 6 = Saturday, matches Date.getDay()
}

/** Reads the Pacific-calendar-day fields of a real instant (an event timestamp, `new Date()`, etc). */
export function getPacificDateParts(date: Date): PacificDateParts {
  const zoned = toZonedTime(date, TZ);
  return {
    year: zoned.getFullYear(),
    month: zoned.getMonth(),
    day: zoned.getDate(),
    weekday: zoned.getDay(),
  };
}

/** The real instant corresponding to midnight, Pacific time, on the given calendar day. */
function pacificMidnight(year: number, month: number, day: number): Date {
  return fromZonedTime(new Date(year, month, day), TZ);
}

/** Shifts an instant by a number of Pacific calendar days, independent of the viewer's own timezone. */
export function addPacificDays(date: Date, amount: number): Date {
  const { year, month, day } = getPacificDateParts(date);
  return pacificMidnight(year, month, day + amount);
}

/** Shifts an instant by a number of Pacific calendar months, independent of the viewer's own timezone. */
export function addPacificMonths(date: Date, amount: number): Date {
  const { year, month, day } = getPacificDateParts(date);
  return pacificMidnight(year, month + amount, day);
}

export function getTimeOfDay(dateStr: string): TimeOfDay {
  const hour = Number(formatInTimeZone(dateStr, TZ, 'H'));
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export function getDayType(dateStr: string): DayType {
  const weekday = formatInTimeZone(dateStr, TZ, 'EEE');
  return weekday === 'Sat' || weekday === 'Sun' ? 'weekend' : 'weekday';
}

export function formatTime(dateStr: string): string {
  return formatInTimeZone(dateStr, TZ, 'h:mm a');
}

export function formatDate(dateStr: string): string {
  return formatInTimeZone(dateStr, TZ, 'EEE, MMM d');
}

export function formatDateLong(dateStr: string): string {
  return formatInTimeZone(dateStr, TZ, 'EEEE, MMMM d, yyyy');
}

/**
 * Re-anchors a real instant (e.g. an event timestamp, `new Date()`, or a grid
 * day from getMonthDays/getWeekDays — see their docs) to midnight on its
 * Pacific calendar day.
 */
export function toPacificDate(date: Date): Date {
  const zoned = toZonedTime(date, TZ);
  return new Date(zoned.getFullYear(), zoned.getMonth(), zoned.getDate());
}

export function isSameDay(date1: Date, date2: Date): boolean {
  const d1 = toPacificDate(date1);
  const d2 = toPacificDate(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Every day is returned as the real instant of Pacific midnight for that
 * calendar day (not a viewer-local placeholder), so isSameDay/toDateKey and
 * event-instant comparisons stay correct regardless of the viewer's own
 * device timezone. Read a returned day's calendar fields for display via
 * getPacificDateParts, not raw Date getters.
 */
export function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  // Pure calendar arithmetic (no timezone conversion involved): the day-0
  // rollover trick for "last day of the month".
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const firstWeekday = getPacificDateParts(pacificMidnight(year, month, 1)).weekday;
  for (let i = firstWeekday - 1; i >= 0; i--) {
    days.push(pacificMidnight(year, month, -i));
  }

  for (let d = 1; d <= daysInMonth; d++) {
    days.push(pacificMidnight(year, month, d));
  }

  const lastWeekday = getPacificDateParts(pacificMidnight(year, month, daysInMonth)).weekday;
  const endPad = 6 - lastWeekday;
  for (let i = 1; i <= endPad; i++) {
    days.push(pacificMidnight(year, month + 1, i));
  }

  return days;
}

/** See getMonthDays — each day is the real instant of Pacific midnight for that calendar day. */
export function getWeekDays(date: Date): Date[] {
  const { year, month, day, weekday } = getPacificDateParts(date);
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    days.push(pacificMidnight(year, month, day - weekday + i));
  }
  return days;
}

export function toDateKey(date: Date): string {
  const d = toPacificDate(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function eventToDateKey(dateStr: string): string {
  return formatInTimeZone(dateStr, TZ, 'yyyy-MM-dd');
}

export function parseDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatCalendarDate(dateStr: string): string {
  return new Date(dateStr).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function resolveEventWindow(event: { start: string; end: string | null }): { start: string; end: string } {
  const end = event.end || new Date(new Date(event.start).getTime() + 2 * 60 * 60 * 1000).toISOString();
  return { start: event.start, end };
}

export function generateICS(event: {
  title: string;
  start: string;
  end: string | null;
  location: string;
  description: string;
}): string {
  const { start, end } = resolveEventWindow(event);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SCSC//Southern California Sports Calendar//EN',
    'BEGIN:VEVENT',
    `DTSTART:${formatCalendarDate(start)}`,
    `DTEND:${formatCalendarDate(end)}`,
    `SUMMARY:${event.title}`,
    `LOCATION:${event.location}`,
    `DESCRIPTION:${event.description}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

export function getGoogleCalendarUrl(event: {
  title: string;
  start: string;
  end: string | null;
  location: string;
  description: string;
}): string {
  const { start, end } = resolveEventWindow(event);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatCalendarDate(start)}/${formatCalendarDate(end)}`,
    location: event.location,
    details: event.description,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
