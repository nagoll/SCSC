import { describe, it, expect } from 'vitest';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { pickOpponent, eventIdSuffix, JUCO_SCHOOLS } = require('./scraper.js');

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
