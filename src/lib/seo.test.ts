import { describe, it, expect } from 'vitest';
import type { SportEvent, Team, Venue } from './types';
import { eventJsonLd, jsonLdScript, upcomingEvents } from './seo';

const team = (id: string, name: string): Team => ({
  id, name, shortName: name, level: 'college', school: null, conference: null,
  sport: ['basketball'], logoUrl: null, primaryColor: '#000', secondaryColor: '#fff',
});
const venue: Venue = {
  id: 'pauley', name: 'Pauley Pavilion', address: '301 Westwood Plaza, Los Angeles, CA',
  neighborhood: 'westside', lat: 34.07, lng: -118.45, capacity: null, parkingInfo: null, transitInfo: null,
};
const event = (id: string, dateTime: string, extra: Partial<SportEvent> = {}): SportEvent => ({
  id, sport: 'basketball', level: 'college', gender: 'mens', homeTeam: 'ucla', awayTeam: 'usc',
  eventName: null, dateTime, endTime: null, venue: 'pauley', venueSourceName: null,
  venueConfidence: 'verified', isNeutralSite: false, ticketUrl: null, price: 'free',
  conference: null, league: null, isFeatured: false, source: 'test', lastUpdated: dateTime, ...extra,
});

describe('upcomingEvents', () => {
  it('keeps events from the last day onward and drops older ones', () => {
    const now = Date.parse('2026-11-15T12:00:00Z');
    const kept = upcomingEvents(
      [event('old', '2026-11-13T12:00:00Z'), event('today', '2026-11-15T02:00:00Z'), event('next', '2026-11-20T02:00:00Z')],
      now,
    );
    expect(kept.map((e) => e.id)).toEqual(['today', 'next']);
  });
});

describe('eventJsonLd', () => {
  it('describes a game as a schema.org SportsEvent', () => {
    const ld = eventJsonLd(event('g1', '2026-11-20T03:00:00Z'), team('ucla', 'UCLA'), team('usc', 'USC'), venue);
    expect(ld).toMatchObject({
      '@type': 'SportsEvent',
      name: 'USC at UCLA',
      startDate: '2026-11-20T03:00:00Z',
      isAccessibleForFree: true,
      location: { name: 'Pauley Pavilion' },
      homeTeam: { name: 'UCLA' },
      awayTeam: { name: 'USC' },
    });
    expect(ld.url).toMatch(/\/event\/g1$/);
  });

  it('escapes < so names cannot close the script tag', () => {
    expect(jsonLdScript({ name: '</script>' })).not.toContain('</');
  });
});
