import { describe, it, expect, vi } from 'vitest';
import fs from 'node:fs';
import { makeFakeSupabase } from './fake-supabase.js';
import { exportAllToJson } from './export-to-json.js';

describe('exportAllToJson (against a fake Supabase client)', () => {
  it('writes each table to its matching JSON file under src/data', async () => {
    const fake = makeFakeSupabase({
      teams: [{ id: 't1' }],
      venues: [{ id: 'v1' }],
      events: [{ id: 'e1' }],
      featured: [{ id: 'f1' }],
    });

    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    try {
      await exportAllToJson(fake);

      expect(writeSpy).toHaveBeenCalledTimes(4);
      const written = Object.fromEntries(
        writeSpy.mock.calls.map(([filePath, content]) => [filePath.split('/').pop(), JSON.parse(content)])
      );
      expect(written['teams.json']).toEqual([{ id: 't1' }]);
      expect(written['venues.json']).toEqual([{ id: 'v1' }]);
      expect(written['events.json']).toEqual([{ id: 'e1' }]);
      expect(written['featured.json']).toEqual([{ id: 'f1' }]);
    } finally {
      writeSpy.mockRestore();
    }
  });

  it('exports every event, not just the first page of 1000', async () => {
    const events = Array.from({ length: 2500 }, (_, i) => ({ id: `e${i}` }));
    const fake = makeFakeSupabase({ teams: [], venues: [], events, featured: [] });

    const writeSpy = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    try {
      await exportAllToJson(fake);
      const [, content] = writeSpy.mock.calls.find(([filePath]) => filePath.endsWith('events.json'));
      expect(JSON.parse(content)).toHaveLength(2500);
    } finally {
      writeSpy.mockRestore();
    }
  });
});
