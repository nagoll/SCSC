import { formatInTimeZone, toZonedTime } from 'date-fns-tz';
import type { TimeOfDay, DayType } from './types';

const TZ = 'America/Los_Angeles';

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
 * Re-anchors a real instant (e.g. an event timestamp or `new Date()`) to
 * midnight on its Pacific calendar day.
 *
 * Only meaningful for genuine instants. The calendar grid in getMonthDays/
 * getWeekDays instead builds plain `new Date(year, month, day)` placeholders
 * with no real-world instant behind them — running one of those through here
 * reinterprets it via the viewer's own system timezone first, which can shift
 * it onto the adjacent day for a viewer whose device isn't set to Pacific time.
 * That's a pre-existing limitation of the calendar/day-view components, not
 * something this function can resolve on its own.
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

export function getMonthDays(year: number, month: number): Date[] {
  const days: Date[] = [];
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  // Pad with days from previous month to fill the first week
  const startPad = firstDay.getDay();
  for (let i = startPad - 1; i >= 0; i--) {
    const d = new Date(year, month, -i);
    days.push(d);
  }

  // Days of the month
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(new Date(year, month, d));
  }

  // Pad with days from next month to complete the last week
  const endPad = 6 - lastDay.getDay();
  for (let i = 1; i <= endPad; i++) {
    days.push(new Date(year, month + 1, i));
  }

  return days;
}

export function getWeekDays(date: Date): Date[] {
  const days: Date[] = [];
  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - date.getDay());

  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    days.push(d);
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
