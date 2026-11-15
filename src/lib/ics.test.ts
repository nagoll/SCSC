import { describe, it, expect } from 'vitest';
import { buildFeed, feedName, feedUrl, subscribeLinks } from './ics';
import { escapeICSText } from './calendar';
import { DEFAULT_FILTERS } from './constants';
import type { SportEvent, Team, Venue } from './types';

const team = (id: string, name: string, shortName = name): Team => ({
  id, name, shortName, level: 'pro', school: null, conference: null, sport: ['baseball'],
  logoUrl: null, primaryColor: '#000', secondaryColor: '#fff',
});
const teams: Record<string, Team> = {
  dodgers: team('dodgers', 'Los Angeles Dodgers', 'Dodgers'),
  giants: team('giants', 'San Francisco Giants', 'Giants'),
};
const venues: Record<string, Venue> = {
  'dodger-stadium': {
    id: 'dodger-stadium', name: 'Dodger Stadium', address: '1000 Vin Scully Ave, Los Angeles, CA 90012',
    neighborhood: 'downtown', lat: 34.07, lng: -118.24, capacity: null, parkingInfo: null, transitInfo: null,
  },
};
const game = (id: string, dateTime: string): SportEvent => ({
  id, sport: 'baseball', level: 'pro', gender: 'mens', homeTeam: 'dodgers', awayTeam: 'giants',
  eventName: null, dateTime, endTime: null, venue: 'dodger-stadium', venueSourceName: null,
  venueConfidence: 'verified', isNeutralSite: false, ticketUrl: 'https://example.com/t', price: 'under_50',
  conference: null, league: 'MLB', isFeatured: false, source: 'test', lastUpdated: '2026-11-01T00:00:00Z',
});

const NOW = Date.parse('2026-11-15T00:00:00Z');

describe('buildFeed', () => {
  const ics = buildFeed(
    [game('old', '2026-10-01T02:00:00Z'), game('recent', '2026-11-12T02:00:00Z'), game('next', '2026-11-20T02:10:00Z')],
    teams, venues, 'SCSC: Dodgers', NOW,
  );
  const unfolded = ics.replace(/\r\n /g, '');

  it('is a CRLF calendar with one VEVENT per game in the window', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(unfolded).not.toContain('UID:old@');
    expect(unfolded).toContain('UID:recent@');
  });

  it('names the calendar and fills each event', () => {
    expect(unfolded).toContain('X-WR-CALNAME:SCSC: Dodgers');
    expect(unfolded).toContain('SUMMARY:San Francisco Giants at Los Angeles Dodgers');
    expect(unfolded).toContain('DTSTART:20261120T021000Z');
    expect(unfolded).toContain('DTEND:20261120T041000Z');
    expect(unfolded).toContain('LOCATION:Dodger Stadium\\, 1000 Vin Scully Ave\\, Los Angeles\\, CA 90012');
    expect(unfolded).toContain('/event/next');
  });

  it('folds every line to 75 octets', () => {
    for (const line of ics.split('\r\n')) {
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    }
  });
});

describe('escapeICSText', () => {
  it('escapes commas, semicolons, backslashes and newlines', () => {
    expect(escapeICSText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
  });
});

describe('feedName / feedUrl / subscribeLinks', () => {
  it('names a feed after its teams, or falls back to everything', () => {
    expect(feedName(DEFAULT_FILTERS, teams)).toBe('SCSC: All LA sports');
    expect(feedName({ ...DEFAULT_FILTERS, team: ['dodgers', 'giants'] }, teams)).toBe('SCSC: Dodgers, Giants');
    expect(feedName({ ...DEFAULT_FILTERS, level: ['juco'], sport: ['basketball'] }, teams)).toBe(
      'SCSC: Junior College, Basketball',
    );
  });

  it('carries the calendar filters into the feed URL', () => {
    expect(feedUrl({ ...DEFAULT_FILTERS, team: ['dodgers'] }, 'https://scsc.test')).toBe(
      'https://scsc.test/calendar.ics?team=dodgers',
    );
    expect(feedUrl(DEFAULT_FILTERS, 'https://scsc.test')).toBe('https://scsc.test/calendar.ics');
  });

  it('builds webcal, Google and Outlook subscribe links', () => {
    const links = subscribeLinks('https://scsc.test/calendar.ics?team=dodgers', 'SCSC: Dodgers');
    expect(links.webcal).toBe('webcal://scsc.test/calendar.ics?team=dodgers');
    expect(links.google).toBe(
      'https://calendar.google.com/calendar/render?cid=webcal%3A%2F%2Fscsc.test%2Fcalendar.ics%3Fteam%3Ddodgers',
    );
    expect(links.outlook).toContain('url=https%3A%2F%2Fscsc.test%2Fcalendar.ics%3Fteam%3Ddodgers');
  });
});
