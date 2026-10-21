import { describe, it, expect } from 'vitest';
import { checkHealth, formatSummary } from './health-check.js';

const now = new Date('2026-10-15T00:00:00Z');
const team = (id, level = 'college') => ({ id, level });
const ev = (homeTeam, dateTime = '2026-11-01T00:00:00Z') => ({ homeTeam, dateTime });
const many = (id, n) => Array.from({ length: n }, () => ev(id));

describe('checkHealth', () => {
  it('flags a team with no fetched events, even if it never had any', () => {
    const { failures } = checkHealth({ teams: [team('lmu-lions'), team('usc-trojans')], fetched: [ev('usc-trojans')], previous: [], now });
    expect(failures.map(f => f.id)).toEqual(['lmu-lions']);
  });

  it('flags a team whose count collapses against the previous snapshot', () => {
    const { failures } = checkHealth({ teams: [team('usc-trojans')], fetched: many('usc-trojans', 2), previous: many('usc-trojans', 10), now });
    expect(failures[0].problem).toBe('dropped from 10');
  });

  it('ignores past events in the previous snapshot and off-season teams', () => {
    const { failures } = checkHealth({
      teams: [team('usc-trojans'), team('la-sparks', 'pro')],
      fetched: many('usc-trojans', 2),
      previous: many('usc-trojans', 10).map(e => ({ ...e, dateTime: '2026-10-01T00:00:00Z' })),
      now,
    });
    expect(failures).toEqual([]);
  });

  it('only checks teams at the requested level', () => {
    const { rows } = checkHealth({ teams: [team('lmu-lions'), team('cerritos-falcons', 'juco')], fetched: [], previous: [], level: 'juco', now });
    expect(rows.map(r => r.id)).toEqual(['cerritos-falcons']);
  });

  it('summarises failures first', () => {
    const md = formatSummary(checkHealth({ teams: [team('a'), team('b')], fetched: [ev('a')], previous: [], now }));
    expect(md).toMatch(/1 of 2 teams failing/);
    expect(md.indexOf('| b |')).toBeLessThan(md.indexOf('| a |'));
  });
});
