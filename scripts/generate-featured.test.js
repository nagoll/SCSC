import { describe, it, expect } from 'vitest';
import { makeFakeSupabase } from './fake-supabase.js';
import { generateFeatured } from './generate-featured.js';

function makeUpcomingEvent(overrides) {
  const soon = new Date();
  soon.setDate(soon.getDate() + 3);
  return {
    id: 'la-lakers-test',
    sport: 'basketball',
    level: 'pro',
    gender: 'mens',
    homeTeam: 'la-lakers',
    awayTeam: null,
    eventName: 'Boston Celtics at Los Angeles Lakers',
    dateTime: soon.toISOString(),
    endTime: null,
    venue: 'crypto-arena',
    venueSourceName: null,
    venueConfidence: 'verified',
    isNeutralSite: false,
    ticketUrl: null,
    price: 'over_50',
    conference: null,
    league: null,
    isFeatured: false,
    source: 'pro-api:test',
    lastUpdated: new Date().toISOString(),
    ...overrides,
  };
}

describe('generateFeatured (against a fake Supabase client)', () => {
  it('picks a high-scoring rivalry game as Game of the Week and replaces the featured table', async () => {
    const event = makeUpcomingEvent();
    const fake = makeFakeSupabase({
      events: [event],
      teams: [{ id: 'la-lakers', shortName: 'Lakers', name: 'Los Angeles Lakers' }],
      venues: [{ id: 'crypto-arena', name: 'Crypto.com Arena' }],
      featured: [{ id: 'stale-pick', type: 'game-of-week' }],
    });

    await generateFeatured(fake);

    expect(fake.tables.featured.find((f) => f.id === 'stale-pick')).toBeUndefined();
    expect(fake.tables.featured.length).toBeGreaterThan(0);
    expect(fake.tables.featured[0]).toMatchObject({ eventId: event.id, type: 'game-of-week' });
  });

  it('leaves the featured table untouched when there are no upcoming events', async () => {
    const fake = makeFakeSupabase({
      events: [],
      teams: [],
      venues: [],
      featured: [{ id: 'keep-me' }],
    });

    await generateFeatured(fake);
    expect(fake.tables.featured).toEqual([{ id: 'keep-me' }]);
  });
});
