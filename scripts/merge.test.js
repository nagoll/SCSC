import { describe, it, expect } from 'vitest';
import { getPrecedence, detectDiscrepancies } from './merge.js';

describe('getPrecedence', () => {
  it('resolves legacy flat source strings', () => {
    expect(getPrecedence('manual')).toBe(0);
    expect(getPrecedence('mlb-api')).toBe(1);
    expect(getPrecedence('nhl-api')).toBe(1);
    expect(getPrecedence('espn-api')).toBe(2);
  });

  it('resolves explicit "<tier>:<detail>" sources', () => {
    expect(getPrecedence('pro-api:mlb')).toBe(1);
    expect(getPrecedence('espn-api:college')).toBe(2);
    expect(getPrecedence('juco-scraper:elac')).toBe(3);
    expect(getPrecedence('university-scraper:usc')).toBe(4);
  });

  it('ranks university scrapers above juco scrapers above ESPN above pro APIs above manual', () => {
    const tiers = ['manual', 'pro-api:mlb', 'espn-api:pro', 'juco-scraper:elac', 'university-scraper:usc'].map(getPrecedence);
    expect(tiers).toEqual([...tiers].sort((a, b) => a - b));
  });

  it('throws on an unrecognized source instead of silently guessing', () => {
    expect(() => getPrecedence('mystery-source')).toThrow(/Unknown event source/);
    expect(() => getPrecedence(undefined)).toThrow(/Unknown event source/);
  });
});

describe('detectDiscrepancies', () => {
  it('reports no diffs when key fields agree', () => {
    const existing = { dateTime: '2026-01-01T00:00:00.000Z', venue: 'galen-center', eventName: 'Rival at Home' };
    const incoming = { ...existing };
    expect(detectDiscrepancies(existing, incoming)).toEqual([]);
  });

  it('flags a changed dateTime/venue/eventName', () => {
    const existing = { dateTime: '2026-01-01T00:00:00.000Z', venue: 'galen-center', eventName: 'Rival at Home' };
    const incoming = { dateTime: '2026-01-02T00:00:00.000Z', venue: 'pauley-pavilion', eventName: 'Rival at Home' };
    const diffs = detectDiscrepancies(existing, incoming);
    expect(diffs).toHaveLength(2);
    expect(diffs.some((d) => d.startsWith('dateTime:'))).toBe(true);
    expect(diffs.some((d) => d.startsWith('venue:'))).toBe(true);
  });

  it('flags disagreeing venue confidence', () => {
    const existing = { venueConfidence: 'likely' };
    const incoming = { venueConfidence: 'verified' };
    const diffs = detectDiscrepancies(existing, incoming);
    expect(diffs.some((d) => d.startsWith('venueConfidence:'))).toBe(true);
  });

  it('ignores fields that are null/undefined on either side', () => {
    const existing = { eventName: null };
    const incoming = { eventName: 'New Name' };
    expect(detectDiscrepancies(existing, incoming)).toEqual([]);
  });
});
