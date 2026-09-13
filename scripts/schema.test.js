import { describe, it, expect } from 'vitest';
import { validateEvents } from './schema.js';

function makeEvent(overrides) {
  return {
    id: 'usc-trojans-20260101',
    sport: 'basketball',
    level: 'college',
    gender: 'mens',
    homeTeam: 'usc-trojans',
    awayTeam: null,
    eventName: 'Rival at USC',
    dateTime: '2026-01-01T20:00:00.000Z',
    endTime: null,
    venue: 'galen-center',
    venueSourceName: 'Galen Center',
    venueConfidence: 'verified',
    isNeutralSite: false,
    ticketUrl: null,
    price: 'under_50',
    conference: null,
    league: null,
    isFeatured: false,
    source: 'university-scraper:usc',
    lastUpdated: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('validateEvents', () => {
  it('accepts a well-formed event', () => {
    const { valid, invalid } = validateEvents([makeEvent()]);
    expect(valid).toHaveLength(1);
    expect(invalid).toHaveLength(0);
  });

  it('rejects an event with an unknown sport', () => {
    const { valid, invalid } = validateEvents([makeEvent({ sport: 'curling' })]);
    expect(valid).toHaveLength(0);
    expect(invalid).toHaveLength(1);
    expect(invalid[0].reasons.join(' ')).toMatch(/sport/);
  });

  it('rejects an event with a non-ISO dateTime', () => {
    const { valid, invalid } = validateEvents([makeEvent({ dateTime: 'not-a-date' })]);
    expect(valid).toHaveLength(0);
    expect(invalid[0].reasons.join(' ')).toMatch(/dateTime/);
  });

  it('rejects an event missing a required field', () => {
    const bad = makeEvent();
    delete bad.venue;
    const { invalid } = validateEvents([bad]);
    expect(invalid).toHaveLength(1);
    expect(invalid[0].reasons.join(' ')).toMatch(/venue/);
  });

  it('keeps valid events and drops invalid ones from a mixed batch', () => {
    const good = makeEvent({ id: 'good' });
    const bad = makeEvent({ id: 'bad', level: 'semi-pro' });
    const { valid, invalid } = validateEvents([good, bad]);
    expect(valid.map((e) => e.id)).toEqual(['good']);
    expect(invalid).toHaveLength(1);
  });
});
