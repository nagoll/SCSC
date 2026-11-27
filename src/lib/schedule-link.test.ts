import { describe, it, expect } from 'vitest';
import { scheduleUrlHost } from './schedule-link';

describe('scheduleUrlHost', () => {
  it('drops the www prefix', () => {
    expect(scheduleUrlHost('https://www.gccathletics.com/composite')).toBe('gccathletics.com');
  });
  it('keeps other subdomains', () => {
    expect(scheduleUrlHost('https://sparks.wnba.com/schedule')).toBe('sparks.wnba.com');
  });
  it('returns null for a malformed URL', () => {
    expect(scheduleUrlHost('not a url')).toBeNull();
  });
});
