import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { pickOpponent, eventIdSuffix, JUCO_SCHOOLS, shouldSkipRequest, isProxyConnectionError, proxyForAttempt } = require('./scraper.js');

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
