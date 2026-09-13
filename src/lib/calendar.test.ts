import { describe, it, expect } from 'vitest';
import {
  getTimeOfDay,
  getDayType,
  formatTime,
  formatDate,
  formatDateLong,
  isSameDay,
  toDateKey,
  eventToDateKey,
  getMonthDays,
  getWeekDays,
  parseDate,
  generateICS,
  getGoogleCalendarUrl,
} from './calendar';

describe('getTimeOfDay', () => {
  it('classifies a Pacific morning instant', () => {
    // 9:00 AM PDT = 16:00 UTC
    expect(getTimeOfDay('2026-07-04T16:00:00.000Z')).toBe('morning');
  });

  it('classifies a Pacific afternoon instant', () => {
    // 2:00 PM PDT = 21:00 UTC
    expect(getTimeOfDay('2026-07-04T21:00:00.000Z')).toBe('afternoon');
  });

  it('classifies a Pacific evening instant', () => {
    // 7:30 PM PDT = 02:30 UTC next day
    expect(getTimeOfDay('2026-07-05T02:30:00.000Z')).toBe('evening');
  });

  it('handles winter (PST, UTC-8) correctly', () => {
    // 1:15 AM PST = 09:15 UTC
    expect(getTimeOfDay('2026-01-02T09:15:00.000Z')).toBe('morning');
  });
});

describe('getDayType', () => {
  it('flags a Pacific Saturday night as weekend', () => {
    // Sat Sep 12, 7:30pm PDT = Sep 13 02:30 UTC
    expect(getDayType('2026-09-13T02:30:00.000Z')).toBe('weekend');
  });

  it('flags a Pacific Wednesday as weekday', () => {
    // Wed Sep 9, 7:30pm PDT = Sep 10 02:30 UTC
    expect(getDayType('2026-09-10T02:30:00.000Z')).toBe('weekday');
  });
});

describe('formatting', () => {
  const ev = '2026-09-13T02:30:00.000Z'; // Sat Sep 12, 7:30 PM Pacific

  it('formatTime renders the Pacific clock time', () => {
    expect(formatTime(ev)).toBe('7:30 PM');
  });

  it('formatDate renders short weekday/month/day in Pacific', () => {
    expect(formatDate(ev)).toBe('Sat, Sep 12');
  });

  it('formatDateLong renders full weekday/month/day/year in Pacific', () => {
    expect(formatDateLong(ev)).toBe('Saturday, September 12, 2026');
  });

  it('eventToDateKey buckets the event under its Pacific calendar day', () => {
    expect(eventToDateKey(ev)).toBe('2026-09-12');
  });
});

describe('isSameDay / toDateKey (operating on real instants, e.g. event timestamps)', () => {
  it('treats two timestamps on the same Pacific calendar day as equal', () => {
    // 8am and 10pm Pacific (PDT) on Sept 12 — same Pacific day, different UTC days
    const a = new Date('2026-09-12T15:00:00.000Z');
    const b = new Date('2026-09-13T05:00:00.000Z');
    expect(isSameDay(a, b)).toBe(true);
  });

  it('treats two timestamps on different Pacific calendar days as unequal', () => {
    const a = new Date('2026-09-12T15:00:00.000Z');
    const b = new Date('2026-09-13T15:00:00.000Z');
    expect(isSameDay(a, b)).toBe(false);
  });

  it('toDateKey formats the Pacific calendar day for a given instant', () => {
    const instant = new Date('2026-03-05T20:00:00.000Z'); // noon PST, unambiguously March 5 Pacific
    expect(toDateKey(instant)).toBe('2026-03-05');
  });

  it('parseDate reconstructs a calendar day from a "yyyy-MM-dd" key', () => {
    const parsed = parseDate('2026-03-05');
    expect(parsed.getFullYear()).toBe(2026);
    expect(parsed.getMonth()).toBe(2);
    expect(parsed.getDate()).toBe(5);
  });
});

describe('getMonthDays', () => {
  it('pads to full weeks and includes every day of the month', () => {
    const days = getMonthDays(2026, 8); // September 2026 (0-indexed month)
    expect(days.length % 7).toBe(0);
    const inMonth = days.filter((d) => d.getMonth() === 8);
    expect(inMonth).toHaveLength(30);
    // First day of the grid should be a Sunday
    expect(days[0].getDay()).toBe(0);
  });
});

describe('getWeekDays', () => {
  it('returns 7 consecutive days starting on Sunday', () => {
    const wed = new Date(2026, 8, 16); // a Wednesday
    const week = getWeekDays(wed);
    expect(week).toHaveLength(7);
    expect(week[0].getDay()).toBe(0);
    expect(week[6].getDay()).toBe(6);
  });
});

describe('generateICS / getGoogleCalendarUrl', () => {
  const event = {
    title: 'Rival U at Home Team',
    start: '2026-09-13T02:30:00.000Z',
    end: null as string | null,
    location: 'Galen Center',
    description: 'A game',
  };

  it('generateICS defaults a missing end time to +2 hours', () => {
    const ics = generateICS(event);
    expect(ics).toContain('DTSTART:20260913T023000Z');
    expect(ics).toContain('DTEND:20260913T043000Z');
    expect(ics).toContain('SUMMARY:Rival U at Home Team');
  });

  it('getGoogleCalendarUrl encodes the same start/end window', () => {
    const url = getGoogleCalendarUrl(event);
    expect(url).toContain('dates=20260913T023000Z%2F20260913T043000Z');
  });

  it('both use an explicit end time when provided', () => {
    const withEnd = { ...event, end: '2026-09-13T05:00:00.000Z' };
    expect(generateICS(withEnd)).toContain('DTEND:20260913T050000Z');
    expect(getGoogleCalendarUrl(withEnd)).toContain('20260913T050000Z');
  });
});
