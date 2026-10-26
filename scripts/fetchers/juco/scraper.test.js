import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const {
  pickOpponent, eventIdSuffix, JUCO_SCHOOLS, shouldSkipRequest, isProxyConnectionError, proxyForAttempt,
  wrongPageReason, parsePrestoIcs,
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

describe('parsePrestoIcs', () => {
  const start = new Date('2026-10-01T00:00:00Z');
  const end = new Date('2027-01-01T00:00:00Z');
  const vevent = (summary, { dtstart = 'DTSTART:20261105T020000Z', status = 'CONFIRMED', location = '' } = {}) =>
    ['BEGIN:VEVENT', dtstart, `SUMMARY:${summary}`, `STATUS:${status}`, `LOCATION:${location}`, 'END:VEVENT'].join('\r\n');
  const ics = (...events) => ['BEGIN:VCALENDAR', ...events, 'END:VCALENDAR'].join('\r\n');

  it('keeps games where the school is listed second (home), not first', () => {
    const events = parsePrestoIcs(ics(
      vevent("(Men's Basketball) East Los Angeles at Los Angeles Valley"),
      vevent("(Women's Volleyball) Citrus vs. Los Angeles Valley", { dtstart: 'DTSTART:20261106T020000Z' }),
      vevent("(Men's Soccer) Los Angeles Valley at Mt. San Antonio (3-0)"),
      vevent("(Men's Basketball) Los Angeles Valley vs. Oxnard", { location: 'College of the Canyons' }),
      vevent('(Softball) Citrus vs. Los Angeles Valley', { dtstart: 'DTSTART:20261107T020000Z' }),
    ), juco('lavc'), start, end);
    expect(events.map(e => [e.sport, e.gender, e.dateTime, e.eventName])).toEqual([
      ['basketball', 'mens', '2026-11-05T02:00:00.000Z', 'East Los Angeles at LA Valley College Monarchs'],
      ['volleyball', 'womens', '2026-11-06T02:00:00.000Z', 'Citrus at LA Valley College Monarchs'],
      ['softball', 'womens', '2026-11-07T02:00:00.000Z', 'Citrus at LA Valley College Monarchs'],
    ]);
  });

  it('skips cancelled, all-day and out-of-range games', () => {
    const events = parsePrestoIcs(ics(
      vevent("(Football) Citrus at Los Angeles Valley", { status: 'CANCELLED' }),
      vevent("(Football) Glendale at Los Angeles Valley", { dtstart: 'DTSTART;VALUE=DATE:20261105' }),
      vevent("(Football) Pierce at Los Angeles Valley", { dtstart: 'DTSTART:20250905T020000Z' }),
      vevent("(Football) Los Angeles Valley at Compton"),
    ), juco('lavc'), start, end);
    expect(events).toEqual([]);
  });
});
