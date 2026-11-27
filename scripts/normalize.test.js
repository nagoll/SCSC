import { describe, it, expect } from 'vitest';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { normalizePrice } = require('./normalize.js');

describe('normalizePrice', () => {
  it('passes PriceRange values through unchanged', () => {
    // Regression: these were parsed as numbers ("under_50" -> 50 -> over_50),
    // which bumped every configured paid price up one bracket.
    for (const v of ['free', 'under_20', 'under_50', 'over_50', 'tbd']) {
      expect(normalizePrice(v)).toBe(v);
    }
  });

  it('treats a missing price as unknown, not free', () => {
    expect(normalizePrice(null)).toBe('tbd');
    expect(normalizePrice(undefined)).toBe('tbd');
    expect(normalizePrice('')).toBe('tbd');
    expect(normalizePrice('call for prices')).toBe('tbd');
  });

  it('buckets dollar amounts', () => {
    expect(normalizePrice(0)).toBe('free');
    expect(normalizePrice('Free')).toBe('free');
    expect(normalizePrice('$0')).toBe('free');
    expect(normalizePrice('$10')).toBe('under_20');
    expect(normalizePrice(20)).toBe('under_50');
    expect(normalizePrice('$49.99')).toBe('under_50');
    expect(normalizePrice(75)).toBe('over_50');
  });
});
