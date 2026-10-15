import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { combineCollegeSources } = require('./scraper.js');

const ev = (id, source, overrides = {}) => ({
  id, source, homeTeam: 'lmu-lions', sport: 'basketball', gender: 'mens',
  dateTime: '2026-11-05T03:00:00.000Z', ticketUrl: null, ...overrides,
});

describe('combineCollegeSources', () => {
  it('replaces the ESPN copy of a game with the school data under the ESPN id', () => {
    const espn = [ev('lmu-lions-20261105-mens-college-basketball', 'espn-api:college', { ticketUrl: 'https://espn/t' })];
    const composite = [ev('lmu-lions-20261105-basketball-uc-irvine', 'university-scraper:lmu')];
    expect(combineCollegeSources(composite, espn)).toEqual([
      { ...composite[0], id: espn[0].id, ticketUrl: 'https://espn/t' },
    ]);
  });

  it('keeps games found by only one source', () => {
    const espn = [ev('e', 'espn-api:college', { dateTime: '2026-11-09T03:00:00.000Z' })];
    const composite = [ev('c', 'university-scraper:lmu', { sport: 'volleyball', gender: 'womens' })];
    expect(combineCollegeSources(composite, espn).map(e => e.id)).toEqual(['c', 'e']);
  });
});
