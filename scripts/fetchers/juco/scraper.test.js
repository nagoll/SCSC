import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const {
  pickOpponent, eventIdSuffix, JUCO_SCHOOLS, shouldSkipRequest, isProxyConnectionError, proxyForAttempt,
  wrongPageReason, parseSidearmCalendarDays, calendarMonthPaths, parseSidearmIcsJuco,
} = require('./scraper.js');

const school = id => JUCO_SCHOOLS.find(s => s.id === id);

describe('pickOpponent', () => {
  it('skips the host school when it is listed first', () => {
    expect(pickOpponent(['Cerritos', 'San Diego Mesa'], school('cerritos'))).toBe('San Diego Mesa');
    expect(pickOpponent(['Mt. SAC', 'Grossmont'], school('mt-sac'))).toBe('Grossmont');
  });
  it('keeps the opponent when it is listed first', () => {
    expect(pickOpponent(['El Camino', 'Cerritos'], school('cerritos'))).toBe('El Camino');
  });
  it('falls back when only the school is listed', () => {
    expect(pickOpponent(['Cerritos'], school('cerritos'))).toBe('Opponent');
  });
});

describe('eventIdSuffix', () => {
  it('differs for same-day events by sport and opponent', () => {
    expect(eventIdSuffix('Women\'s Water Polo', 'San Diego Mesa'))
      .not.toBe(eventIdSuffix('Women\'s Water Polo', 'Grossmont'));
  });
});

describe('shouldSkipRequest', () => {
  const req = (url, type) => ({ url: () => url, resourceType: () => type });

  it('skips images, fonts and ad or analytics hosts', () => {
    expect(shouldSkipRequest(req('https://www.cerritosfalcons.com/images/logo.png', 'image'))).toBe(true);
    expect(shouldSkipRequest(req('https://www.cerritosfalcons.com/fonts/a.woff2', 'font'))).toBe(true);
    expect(shouldSkipRequest(req('https://securepubads.g.doubleclick.net/tag/js/gpt.js', 'script'))).toBe(true);
    expect(shouldSkipRequest(req('https://id.hadron.ad.gt/api/v1/pbhid', 'xhr'))).toBe(true);
  });

  it('keeps the page and SIDEARM data calls', () => {
    expect(shouldSkipRequest(req('https://www.cerritosfalcons.com/composite', 'document'))).toBe(false);
    expect(shouldSkipRequest(req('https://www.cerritosfalcons.com/services/responsive-calendar.ashx?type=month', 'xhr'))).toBe(false);
    expect(shouldSkipRequest(req('https://www.cerritosfalcons.com/js/app.js', 'script'))).toBe(false);
  });
});

describe('isProxyConnectionError', () => {
  it('matches the proxy refusing the tunnel', () => {
    expect(isProxyConnectionError(new Error('page.goto: net::ERR_TUNNEL_CONNECTION_FAILED at https://x.com/composite'))).toBe(true);
    expect(isProxyConnectionError(new Error('page.goto: net::ERR_SSL_PROTOCOL_ERROR at https://x.com/composite'))).toBe(true);
  });

  it('leaves site errors and timeouts alone', () => {
    expect(isProxyConnectionError(new Error('page.goto: net::ERR_NAME_NOT_RESOLVED'))).toBe(false);
    expect(isProxyConnectionError(Object.assign(new Error('Timeout 45000ms exceeded'), { name: 'TimeoutError' }))).toBe(false);
  });
});

describe('proxyForAttempt', () => {
  const proxies = Array.from({ length: 40 }, (_, i) => `p${i}`);

  it('gives each school its own entry on every attempt', () => {
    const used = [];
    for (let idx = 0; idx < 17; idx++) for (let a = 0; a < 2; a++) used.push(proxyForAttempt(proxies, idx, 17, a));
    expect(new Set(used).size).toBe(used.length);
  });

  it('wraps around a short list', () => {
    expect(proxyForAttempt(['a', 'b'], 1, 17, 1)).toBe('a');
  });
});

const juco = id => JUCO_SCHOOLS.find(s => s.id === id);
const page = title => `<html><head><title>${title}</title></head><body></body></html>`;

describe('wrongPageReason', () => {
  it('accepts the school composite page with or without www', () => {
    expect(wrongPageReason(juco('cerritos'), 'https://cerritosfalcons.com/composite', page('Composite Schedule - Cerritos College Athletics'))).toBeNull();
    expect(wrongPageReason(juco('mt-sac'), 'https://www.mtsacathletics.com/composite?id=1', page('Mt. SAC Mounties Composite Calendar'))).toBeNull();
  });

  it('accepts a title that names only the mascot', () => {
    expect(wrongPageReason(juco('elac'), 'https://www.elacathletics.com/composite', page('Huskies Athletics - Composite'))).toBeNull();
  });

  it('reads "Los Angeles" in a title as LA', () => {
    expect(wrongPageReason(juco('lacc'), 'https://laccathletics.com/composite', page('Composite Schedule - October 27 2026 -  Los Angeles City College'))).toBeNull();
    expect(wrongPageReason(juco('elac'), 'https://www.elacathletics.com/composite', page('East Los Angeles College'))).toBeNull();
  });

  it('rejects a redirect to another site', () => {
    expect(wrongPageReason(juco('cerritos'), 'https://www.cerritos.edu/athletics', page('Cerritos College'))).toMatch(/landed on cerritos\.edu/);
  });

  it('rejects the right site but not the composite page', () => {
    expect(wrongPageReason(juco('cerritos'), 'https://www.cerritosfalcons.com/', page('Cerritos College Athletics'))).toMatch(/not the composite/);
  });

  it("rejects a page that doesn't name the school", () => {
    expect(wrongPageReason(juco('cerritos'), 'https://www.cerritosfalcons.com/composite', page('Domain for sale'))).toMatch(/doesn't name the school/);
  });
});

describe('calendarMonthPaths', () => {
  it('asks for every month from start through end', () => {
    const paths = calendarMonthPaths(new Date(2026, 9, 26), new Date(2027, 1, 3));
    expect(paths).toHaveLength(5);
    expect(decodeURIComponent(paths[0])).toContain('date=10/1/2026 12:00:00 AM');
    expect(decodeURIComponent(paths[4])).toContain('date=2/1/2027 12:00:00 AM');
  });
});

describe('parseSidearmCalendarDays', () => {
  const start = new Date('2026-10-01T00:00:00Z');
  const end = new Date('2027-01-01T00:00:00Z');
  const game = overrides => ({
    id: 501, date: '2026-11-04T18:00:00', time: '6:00 PM', location_indicator: 'H', noplay_text: null,
    sport: { title: "Men's Basketball" }, opponent: { prefix: null, title: 'East Los Angeles' },
    facility: null, media: { tickets: null }, ...overrides,
  });

  it('turns a home game into an event in Pacific time', () => {
    const [ev] = parseSidearmCalendarDays([{ events: [game()] }], juco('lavc'), start, end);
    expect(ev).toMatchObject({
      homeTeam: 'lavc-monarchs',
      sport: 'basketball',
      gender: 'mens',
      dateTime: '2026-11-05T02:00:00.000Z',
      eventName: 'East Los Angeles at LA Valley College Monarchs',
      source: 'juco-scraper:lavc',
    });
  });

  it('skips away, neutral, cancelled and all-day games', () => {
    const days = [{ events: [
      game({ location_indicator: 'A' }),
      game({ location_indicator: 'N' }),
      game({ noplay_text: 'Canceled' }),
      game({ time: 'All Day' }),
    ] }];
    expect(parseSidearmCalendarDays(days, juco('lavc'), start, end)).toEqual([]);
  });

  it('skips games outside the date range', () => {
    expect(parseSidearmCalendarDays([{ events: [game({ date: '2027-03-01T18:00:00' })] }], juco('lavc'), start, end)).toEqual([]);
  });
});

describe('parseSidearmIcsJuco', () => {
  const start = new Date('2026-10-01T00:00:00Z');
  const end = new Date('2027-01-01T00:00:00Z');
  const vevent = (summary, dtstart = 'DTSTART:20261104T180000', uid = '1') =>
    ['BEGIN:VEVENT', `UID:${uid}`, dtstart, `SUMMARY:${summary}`, 'LOCATION:Van Nuys\\, Calif.', 'END:VEVENT'].join('\r\n');
  const ics = (...events) => ['BEGIN:VCALENDAR', ...events, 'END:VCALENDAR'].join('\r\n');

  it('keeps "vs" games as home games in Pacific time', () => {
    const [ev] = parseSidearmIcsJuco(ics(vevent("LAVC Men's Basketball vs East Los Angeles")), juco('lavc'), start, end);
    expect(ev).toMatchObject({
      homeTeam: 'lavc-monarchs',
      sport: 'basketball',
      gender: 'mens',
      dateTime: '2026-11-05T02:00:00.000Z',
      eventName: 'East Los Angeles at LA Valley College Monarchs',
    });
  });

  it('skips away, all-day, cancelled and out-of-range games', () => {
    const events = parseSidearmIcsJuco(ics(
      vevent("LAVC Men's Basketball at Citrus", undefined, '2'),
      vevent("LAVC Women's Volleyball vs Citrus", 'DTSTART;VALUE=DATE:20261104', '3'),
      vevent("LAVC Football vs Citrus - Cancelled", undefined, '4'),
      vevent("LAVC Football vs Citrus", 'DTSTART:20270304T180000', '5'),
    ), juco('lavc'), start, end);
    expect(events).toEqual([]);
  });
});
