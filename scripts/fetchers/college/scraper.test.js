import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { combineCollegeSources, parseSidearmCalendarJson, parseSidearmIcs, COLLEGE_SCHOOLS } = require('./scraper.js');

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

const school = id => COLLEGE_SCHOOLS.find(s => s.id === id);
const start = new Date('2026-09-01T00:00:00Z');
const end = new Date('2027-01-01T00:00:00Z');

// Trimmed from cal-poly-pomona's responsive-calendar.ashx response.
const game = overrides => ({
  id: 10350, date: '2026-09-27T11:00:00', time: '11:00 AM', location: 'Pomona, CA',
  location_indicator: 'H', noplay_text: null,
  sport: { title: "Women's Soccer" },
  opponent: { title: 'Cal State Monterey Bay', prefix: null },
  media: { tickets: { url: 'https://tix.example/cpp' } },
  facility: null,
  ...overrides,
});

describe('parseSidearmCalendarJson', () => {
  it('turns a home game into an event with the opponent and Pacific time', () => {
    const [ev] = parseSidearmCalendarJson([{ date: '2026-09-27T00:00:00', events: [game()] }], school('cal-poly-pomona'), start, end);
    expect(ev).toMatchObject({
      homeTeam: 'cal-poly-pomona-broncos',
      sport: 'soccer',
      gender: 'womens',
      dateTime: '2026-09-27T18:00:00.000Z',
      eventName: 'Cal State Monterey Bay at Cal Poly Pomona Broncos',
      ticketUrl: 'https://tix.example/cpp',
      source: 'university-scraper:cal-poly-pomona',
    });
  });

  it('skips away, neutral, untimed and cancelled games', () => {
    const days = [{ date: '2026-09-27T00:00:00', events: [
      game({ id: 1, location_indicator: 'A' }),
      game({ id: 2, location_indicator: 'N' }),
      game({ id: 3, time: 'All Day' }),
      game({ id: 4, noplay_text: 'Canceled' }),
    ] }, { date: '2026-09-28T00:00:00', events: null }];
    expect(parseSidearmCalendarJson(days, school('cal-poly-pomona'), start, end)).toEqual([]);
  });
});

describe('parseSidearmIcs', () => {
  const ics = [
    'BEGIN:VCALENDAR',
    'BEGIN:VEVENT',
    'DTSTART:20261020T020000Z',
    'LOCATION:Northridge\\, CA, Matador Soccer Field',
    "SUMMARY:California State University at Northridge Men's Soccer vs UC Riverside - Big West",
    'DESCRIPTION:Tickets: https://tix.example/csun\\n',
    'END:VEVENT',
    'BEGIN:VEVENT',
    'DTSTART:20261022T020000Z',
    'LOCATION:Irvine\\, CA',
    "SUMMARY:California State University at Northridge Women's Volleyball at UC Irvine",
    'END:VEVENT',
    'BEGIN:VEVENT',
    'DTSTART;VALUE=DATE:20261025',
    'LOCATION:Northridge\\, CA',
    "SUMMARY:Women's Golf vs CSUN Invitational",
    'END:VEVENT',
    'BEGIN:VEVENT',
    'DTSTART:20261026T020000Z',
    'LOCATION:Albuquerque\\, NM',
    "SUMMARY:[W] Women's Soccer vs New Mexico",
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  it('keeps timed "vs" games in the home city and reads sport and opponent', () => {
    const events = parseSidearmIcs(ics, school('csun'), start, end);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      homeTeam: 'csun-matadors',
      sport: 'soccer',
      gender: 'mens',
      dateTime: '2026-10-20T02:00:00.000Z',
      eventName: 'UC Riverside at CSUN Matadors',
      ticketUrl: 'https://tix.example/csun',
    });
  });
});
