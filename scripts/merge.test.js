import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeFakeSupabase } from './fake-supabase.js';
import { getPrecedence, detectDiscrepancies, mergeEvents, prunePastEvents } from './merge.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SYNC_LOG_PATH = path.join(__dirname, 'sync-log.json');

function baseEvent(overrides) {
  return {
    id: 'e1',
    sport: 'basketball',
    level: 'college',
    gender: 'mens',
    homeTeam: 'usc-trojans',
    awayTeam: null,
    eventName: 'Test',
    dateTime: '2026-01-01T20:00:00.000Z',
    endTime: null,
    venue: 'galen-center',
    venueSourceName: 'Galen Center',
    venueConfidence: 'likely',
    isNeutralSite: false,
    ticketUrl: null,
    price: 'under_50',
    conference: null,
    league: null,
    isFeatured: false,
    source: 'espn-api:college',
    lastUpdated: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

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

describe('mergeEvents (against a fake Supabase client)', () => {
  let originalSyncLog;

  beforeAll(() => {
    originalSyncLog = fs.readFileSync(SYNC_LOG_PATH, 'utf-8');
  });

  afterAll(() => {
    fs.writeFileSync(SYNC_LOG_PATH, originalSyncLog);
  });

  it('adds a brand-new event', async () => {
    const fake = makeFakeSupabase({ events: [] });
    const stats = await mergeEvents([baseEvent({ id: 'new-1' })], fake);
    expect(stats).toEqual({ added: 1, updated: 0, skipped: 0, discrepancies: 0 });
    expect(fake.tables.events).toHaveLength(1);
  });

  it('never overwrites a manual entry', async () => {
    const fake = makeFakeSupabase({ events: [baseEvent({ id: 'e1', source: 'manual' })] });
    const stats = await mergeEvents([baseEvent({ id: 'e1', source: 'university-scraper:usc', eventName: 'Changed' })], fake);
    expect(stats.skipped).toBe(1);
    expect(fake.tables.events[0].eventName).toBe('Test');
  });

  it('lets a higher-precedence source overwrite a lower one', async () => {
    const fake = makeFakeSupabase({ events: [baseEvent({ id: 'e1', source: 'pro-api:mlb', eventName: 'Old' })] });
    const stats = await mergeEvents([baseEvent({ id: 'e1', source: 'university-scraper:usc', eventName: 'New' })], fake);
    expect(stats.updated).toBe(1);
    expect(fake.tables.events[0].eventName).toBe('New');
  });

  it('does not let a lower-precedence source overwrite a higher one', async () => {
    const fake = makeFakeSupabase({ events: [baseEvent({ id: 'e1', source: 'university-scraper:usc', eventName: 'Keep' })] });
    const stats = await mergeEvents([baseEvent({ id: 'e1', source: 'pro-api:mlb', eventName: 'Ignored' })], fake);
    expect(stats.skipped).toBe(1);
    expect(fake.tables.events[0].eventName).toBe('Keep');
  });

  it('collapses duplicate ids within a single incoming batch into one upsert row', async () => {
    const fake = makeFakeSupabase({ events: [] });
    const upsertPayloads = [];
    const originalFrom = fake.from;
    fake.from = (name) => {
      const b = originalFrom(name);
      const originalUpsert = b.upsert;
      b.upsert = (rows) => {
        upsertPayloads.push(rows);
        return originalUpsert(rows);
      };
      return b;
    };

    await mergeEvents([
      baseEvent({ id: 'dup-1', source: 'espn-api:pro', eventName: 'First' }),
      baseEvent({ id: 'dup-1', source: 'espn-api:pro', eventName: 'Second' }),
    ], fake);

    expect(upsertPayloads).toHaveLength(1);
    const ids = upsertPayloads[0].map((r) => r.id);
    expect(ids).toEqual(['dup-1']);
    expect(fake.tables.events).toHaveLength(1);
    expect(fake.tables.events[0].eventName).toBe('Second');
  });

  it('upgrades venue confidence to verified when two independent sources agree on the venue', async () => {
    const fake = makeFakeSupabase({
      events: [baseEvent({ id: 'e1', source: 'pro-api:mlb', venue: 'galen-center', venueSourceName: 'Galen Center', venueConfidence: 'likely' })],
    });
    await mergeEvents([baseEvent({
      id: 'e1', source: 'university-scraper:usc', venue: 'galen-center',
      venueSourceName: 'Galen Center Arena', venueConfidence: 'likely',
    })], fake);
    expect(fake.tables.events[0].venueConfidence).toBe('verified');
  });
});

describe('prunePastEvents (against a fake Supabase client)', () => {
  it('removes only events dated before yesterday', async () => {
    const past = baseEvent({ id: 'old', dateTime: '2020-01-01T00:00:00.000Z' });
    const future = baseEvent({ id: 'future', dateTime: '2099-01-01T00:00:00.000Z' });
    const fake = makeFakeSupabase({ events: [past, future] });

    const pruned = await prunePastEvents(fake);
    expect(pruned).toBe(1);
    expect(fake.tables.events.map((e) => e.id)).toEqual(['future']);
  });
});
