import { describe, it, expect } from 'vitest';
import { makeFakeSupabase } from './fake-supabase.js';
import { dedupeEvents, findStoredDuplicates, removeDuplicateEvents, isPlaceholder, sameOpponent } from './dedupe.js';

// Shapes and names below are taken from rows that showed up twice in
// src/data/events.json.
function ev(id, eventName, overrides = {}) {
  return {
    id,
    sport: 'water-polo',
    level: 'college',
    gender: 'mens',
    homeTeam: 'long-beach-state-49ers',
    awayTeam: null,
    eventName,
    dateTime: '2026-11-21T18:00:00.000Z',
    venue: 'walter-pyramid',
    ticketUrl: null,
    isFeatured: false,
    source: 'university-scraper:lbsu',
    lastUpdated: '2026-11-20T00:00:00.000Z',
    ...overrides,
  };
}

describe('isPlaceholder', () => {
  it.each([
    'TBD at LA Pierce College Brahmas',
    'TBA at LA Mission College Eagles',
    'No. 1 CBU vs. TBD at Long Beach State 49ers',
    'CCAA Tournament at Cal Poly Pomona Broncos',
    'Big West Championship at Long Beach State 49ers',
    'SCIAC Tournament at Pomona-Pitzer Sagehens',
    'Opponent at USC Trojans',
  ])('treats "%s" as a stand-in', (name) => {
    expect(isPlaceholder(ev('x', name))).toBe(true);
  });

  it.each([
    'No. 1 California Baptist   at Long Beach State 49ers',
    'Allan Hancock at LA Pierce College Brahmas',
    'Texas A&M  at Cal State Fullerton Titans',
  ])('treats "%s" as a real opponent', (name) => {
    expect(isPlaceholder(ev('x', name))).toBe(false);
  });
});

describe('sameOpponent', () => {
  it('ignores poll prefixes and ESPN mascots', () => {
    expect(sameOpponent('RV Bates College', 'Bates College')).toBe(true);
    expect(sameOpponent('#21 Cal State San Bernardino', 'Cal State San Bernardino')).toBe(true);
    expect(sameOpponent('UNC Greensboro Spartans', 'UNC Greensboro')).toBe(true);
    expect(sameOpponent('Nevada', 'UC San Diego')).toBe(false);
  });
});

describe('dedupeEvents (one fetch)', () => {
  it('drops TBD and tournament stand-ins when the real opponent shares the slot', () => {
    const { events, removed } = dedupeEvents([
      ev('lbsu-big-west-championship', 'Big West Championship at Long Beach State 49ers'),
      ev('lbsu-cbu-vs-tbd', 'No. 1 CBU vs. TBD at Long Beach State 49ers'),
      ev('lbsu-california-baptist', 'No. 1 California Baptist   at Long Beach State 49ers'),
    ]);
    expect(events.map(e => e.id)).toEqual(['lbsu-california-baptist']);
    expect(removed.sort()).toEqual(['lbsu-big-west-championship', 'lbsu-cbu-vs-tbd']);
  });

  it('keeps a single stand-in when no real opponent is known yet', () => {
    const { events } = dedupeEvents([
      ev('tbd', 'TBD at Long Beach State 49ers'),
      ev('champ', 'Big West Championship at Long Beach State 49ers'),
    ]);
    expect(events.map(e => e.id)).toEqual(['champ']);
  });

  it('combines a multi-team meet into one event naming every opponent', () => {
    const meet = { homeTeam: 'pepperdine-waves', sport: 'other', gender: 'womens', dateTime: '2027-01-09T19:00:00.000Z' };
    const { events, removed } = dedupeEvents([
      ev('pepperdine-waves-20270109-women-s-swim-dive-utrgv', 'UTRGV at Pepperdine Waves', meet),
      ev('pepperdine-waves-20270109-women-s-swim-dive-colorado-state', 'Colorado State at Pepperdine Waves', meet),
    ]);
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe('pepperdine-waves-20270109-women-s-swim-dive-colorado-state');
    expect(events[0].eventName).toBe('Colorado State & UTRGV at Pepperdine Waves');
    expect(removed).toEqual(['pepperdine-waves-20270109-women-s-swim-dive-utrgv']);
  });

  it('leaves games at different times alone, including a TBA later that day', () => {
    const tennis = { homeTeam: 'pomona-pitzer-sagehens', sport: 'tennis' };
    const input = [
      ev('chicago', 'University of Chicago at Pomona-Pitzer Sagehens', { ...tennis, dateTime: '2027-03-19T16:00:00.000Z' }),
      ev('tba', 'TBA at Pomona-Pitzer Sagehens', { ...tennis, dateTime: '2027-03-19T22:00:00.000Z' }),
    ];
    expect(dedupeEvents(input).events).toHaveLength(2);
  });

  it('keeps separate teams and genders apart', () => {
    const input = [
      ev('m', 'TBD at Long Beach State 49ers'),
      ev('w', 'Stanford at Long Beach State 49ers', { gender: 'womens' }),
    ];
    expect(dedupeEvents(input).events).toHaveLength(2);
  });

  it('keeps the same winner however the rows are ordered or timestamped', () => {
    const a = ev('a-colorado-state', 'Colorado State at Pepperdine Waves', { lastUpdated: '2026-11-24T23:18:04.762Z' });
    const b = ev('b-utrgv', 'UTRGV at Pepperdine Waves', { lastUpdated: '2026-11-24T23:18:04.900Z' });
    expect(dedupeEvents([a, b]).events[0].id).toBe('a-colorado-state');
    expect(dedupeEvents([b, a]).events[0].id).toBe('a-colorado-state');
  });

  it('never touches manual entries', () => {
    const input = [
      ev('manual-1', 'TBD at Long Beach State 49ers', { source: 'manual' }),
      ev('scraped', 'Stanford at Long Beach State 49ers'),
    ];
    expect(dedupeEvents(input).events).toHaveLength(2);
  });
});

describe('findStoredDuplicates (rows left by earlier runs)', () => {
  const usc = { homeTeam: 'usc-trojans', sport: 'basketball', venue: 'galen-center', source: 'university-scraper:usc' };

  it('drops the stale copy of a game stored under its old ID', () => {
    const ids = findStoredDuplicates([
      ev('usc-trojans-20261123-men-s-basketball-louisiana', 'Louisiana at USC Trojans',
        { ...usc, dateTime: '2026-11-23T01:00:00+00:00', lastUpdated: '2026-10-31T18:00:18.149+00:00' }),
      ev('usc-trojans-20261123-mens-college-basketball', 'Louisiana at USC Trojans',
        { ...usc, dateTime: '2026-11-23T01:00:00.000Z', lastUpdated: '2026-11-22T20:30:20.733+00:00' }),
    ]);
    expect(ids).toEqual(['usc-trojans-20261123-men-s-basketball-louisiana']);
  });

  it('drops a TBD row once the real opponent is stored', () => {
    const lapc = { homeTeam: 'lapc-brahmas', sport: 'volleyball', gender: 'womens', dateTime: '2026-11-12T02:00:00+00:00', source: 'juco-scraper:lapc' };
    const ids = findStoredDuplicates([
      ev('lapc-brahmas-20261112-women-s-volleyball-tbd', 'TBD at LA Pierce College Brahmas', { ...lapc, lastUpdated: '2026-11-11T00:00:00Z' }),
      ev('lapc-brahmas-20261112-women-s-volleyball-allan-hancock', 'Allan Hancock at LA Pierce College Brahmas', { ...lapc, lastUpdated: '2026-11-10T00:00:00Z' }),
    ]);
    expect(ids).toEqual(['lapc-brahmas-20261112-women-s-volleyball-tbd']);
  });

  it('drops a single-opponent row the combined meet listing already covers', () => {
    const ids = findStoredDuplicates([
      ev('colorado-state', 'Colorado State & UTRGV at Pepperdine Waves', { lastUpdated: '2026-11-25T00:00:00Z' }),
      ev('utrgv', 'UTRGV at Pepperdine Waves', { lastUpdated: '2026-11-24T00:00:00Z' }),
    ]);
    expect(ids).toEqual(['utrgv']);
  });

  it('keeps stored rows with different real opponents (it never rewrites names)', () => {
    const ids = findStoredDuplicates([
      ev('a', 'Nevada at USC Trojans'),
      ev('b', 'UC San Diego at USC Trojans'),
    ]);
    expect(ids).toEqual([]);
  });
});

describe('removeDuplicateEvents (against a fake Supabase client)', () => {
  it('deletes stored duplicates and keeps everything else', async () => {
    const db = makeFakeSupabase({
      events: [
        ev('tbd', 'No. 1 CBU vs. TBD at Long Beach State 49ers'),
        ev('real', 'No. 1 California Baptist at Long Beach State 49ers'),
        ev('other-day', 'TBD at Long Beach State 49ers', { dateTime: '2026-11-22T18:00:00.000Z' }),
      ],
    });
    expect(await removeDuplicateEvents(db)).toBe(1);
    expect(db.tables.events.map(e => e.id).sort()).toEqual(['other-day', 'real']);
  });
});
