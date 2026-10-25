import { describe, it, expect } from 'vitest';
const { parseNcaaRankings, matchTeam, parsePollDate, NAME_ALIASES } = require('./fetch-rankings.js');

const HTML = `<html><head><title>Women's Volleyball Rankings | NCAA.com</title></head><body>
<h2>AVCA Coaches Poll</h2>
<figcaption>Through Games OCT. 19, 2026</figcaption>
<table><thead><tr><th>RANK</th><th>SCHOOL</th></tr></thead><tbody>
<tr><td>1</td><td>Nebraska (50)</td></tr>
<tr><td>T-5</td><td>Southern California</td></tr>
<tr><td>12</td><td>Long Beach St.</td></tr>
</tbody></table></body></html>`;

describe('parseNcaaRankings', () => {
  it('reads the title, date and rows, dropping votes and tie markers', () => {
    const r = parseNcaaRankings(HTML);
    expect(r.title).toBe('AVCA Coaches Poll');
    expect(r.dateText).toBe('Through Games OCT. 19, 2026');
    expect(r.teams).toEqual([
      { rank: 1, school: 'Nebraska' },
      { rank: 5, school: 'Southern California' },
      { rank: 12, school: 'Long Beach St.' },
    ]);
  });
});

describe('matchTeam', () => {
  const ids = Object.keys(NAME_ALIASES);
  it('matches the names NCAA.com uses for our schools', () => {
    expect(matchTeam('Southern California', ids)).toBe('usc-trojans');
    expect(matchTeam('Long Beach St.', ids)).toBe('long-beach-state-49ers');
    expect(matchTeam('UCLA (3)', ids)).toBe('ucla-bruins');
  });
  it('ignores other schools', () => {
    expect(matchTeam('Nebraska', ids)).toBeNull();
    expect(matchTeam('Cal', ids)).toBeNull();
  });
});

describe('parsePollDate', () => {
  it('parses NCAA.com date lines', () => {
    expect(parsePollDate('Through Games OCT. 19, 2026').toISOString().slice(0, 10)).toBe('2026-10-19');
    expect(parsePollDate('Through Games Apr. 25 2026').toISOString().slice(0, 10)).toBe('2026-04-25');
  });
  it('returns null without a date', () => {
    expect(parsePollDate(null)).toBeNull();
    expect(parsePollDate('Final')).toBeNull();
  });
});
