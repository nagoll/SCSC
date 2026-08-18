import type { TimeOfDay, DayType } from './types';

const TZ = 'America/Los_Angeles';

function toPacific(dateStr: string): string {
  if (!dateStr.endsWith('Z') && !dateStr.includes('+') && !dateStr.includes('-', 10)) {
    return dateStr + 'Z';
  }
  return dateStr;
}

function getPacificHour(dateStr: string): number {
  const parts = new Date(toPacific(dateStr)).toLocaleString('en-US', { timeZone: TZ, hour: 'numeric', hour12: false });
  return parseInt(parts, 10);
}

function getPacificDay(dateStr: string): number {
  const parts = new Date(toPacific(dateStr)).toLocaleDateString('en-US', { timeZone: TZ, weekday: 'narrow' });
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'].indexOf(parts);
}

export function getTimeOfDay(dateStr: string): TimeOfDay {
  const hour = getPacificHour(dateStr);
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export function getDayType(dateStr: string): DayType {
  const d = new Date(toPacific(dateStr));
  const dayNum = parseInt(d.toLocaleDateString('en-US', { timeZone: TZ, weekday: 'short' }).slice(0, 1) === 'S' ? '0' : '1');
  const wd = d.toLocaleDateString('en-US', { timeZone: TZ, weekday: 'short' });
  return wd === 'Sat' || wd === 'Sun' ? 'weekend' : 'weekday';
}

export function formatTime(dateStr: string): string {
  return new Date(toPacific(dateStr)).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: TZ,
  });
}

export function formatDate(dateStr: string): string {
  return new Date(toPacific(dateStr)).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    timeZone: TZ,
  });
}

export function formatDateLong(dateStr: string): string {
  return new Date(toPacific(dateStr)).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: TZ,
  });
}

export function toPacificDate(date: Date): Date {
  const str = date.toLocaleDateString('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  const [m, d, y] = str.split('/').map(Number);
  return new Date(y, m - 1, d);
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
  const d = new Date(toPacific(dateStr));
  const parts = d.toLocaleDateString('en-US', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  const [m, day, y] = parts.split('/');
  return `${y}-${m}-${day}`;
}

export function parseDate(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function generateICS(event: {
  title: string;
  start: string;
  end: string | null;
  location: string;
  description: string;
}): string {
  const formatICSDate = (dateStr: string) =>
    new Date(dateStr).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const endDate = event.end || new Date(new Date(event.start).getTime() + 2 * 60 * 60 * 1000).toISOString();

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SCSC//Southern California Sports Calendar//EN',
    'BEGIN:VEVENT',
    `DTSTART:${formatICSDate(event.start)}`,
    `DTEND:${formatICSDate(endDate)}`,
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
  const formatGCal = (dateStr: string) =>
    new Date(dateStr).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const endDate = event.end || new Date(new Date(event.start).getTime() + 2 * 60 * 60 * 1000).toISOString();

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: `${formatGCal(event.start)}/${formatGCal(endDate)}`,
    location: event.location,
    details: event.description,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
