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

const { parseRegionalRankings } = require('./fetch-rankings.js');

describe('parseRegionalRankings', () => {
  it('assigns each team its region and rank', () => {
    const html = `<figcaption>Through Games Oct. 19, 2026</figcaption><table>
      <thead><tr><th>REGION/RANK</th><th>SCHOOL</th></tr></thead><tbody>
      <tr><td></td><td></td><td></td></tr>
      <tr><td>ATLANTIC</td><td></td><td></td></tr>
      <tr><td>1</td><td>Gannon University</td><td>26-2</td></tr>
      <tr><td>WEST</td><td></td><td></td></tr>
      <tr><td>1</td><td>Cal State LA</td><td>20-5</td></tr>
      <tr><td>2</td><td>Cal Poly Pomona (3)</td><td>19-6</td></tr>
      </tbody></table>`;
    expect(parseRegionalRankings(html).teams).toEqual([
      { rank: 1, school: 'Gannon University', region: 'Atlantic' },
      { rank: 1, school: 'Cal State LA', region: 'West' },
      { rank: 2, school: 'Cal Poly Pomona', region: 'West' },
    ]);
  });

  it('handles region rows with a header repeat, a shifted region cell and blank ranks', () => {
    const html = `<table><tbody>
      <tr><td>REGION X</td><td>School</td><td>In-Division Record</td></tr>
      <tr><td></td><td>Pomona-Pitzer</td><td>9-1</td></tr>
      <tr><td></td><td>Occidental</td><td>7-3</td></tr>
      <tr><td></td><td>Region IX</td><td>NPI</td></tr>
      <tr><td>1</td><td>Trinity (TX)</td><td>60.1</td></tr>
      </tbody></table>`;
    expect(parseRegionalRankings(html).teams).toEqual([
      { rank: 1, school: 'Pomona-Pitzer', region: 'Region X' },
      { rank: 2, school: 'Occidental', region: 'Region X' },
      { rank: 1, school: 'Trinity (TX)', region: 'Region IX' },
    ]);
  });
});

describe('parseNcaaRankings on NPI tables', () => {
  it('finds the team and NPI rank columns by header', () => {
    const html = `<table><thead><tr><th>TEAM</th><th>CONFERENCE</th><th>REGION</th><th>NPI RANK</th><th>NPI</th></tr></thead><tbody>
      <tr><td>Gannon</td><td>PSAC</td><td>ATLANTIC REGION</td><td>26</td><td>60.793</td></tr>
      <tr><td>Cal Poly Pomona</td><td>CCAA</td><td>WEST REGION</td><td>4</td><td>63.1</td></tr>
      </tbody></table>`;
    expect(parseNcaaRankings(html).teams).toEqual([
      { rank: 26, school: 'Gannon' },
      { rank: 4, school: 'Cal Poly Pomona' },
    ]);
  });
});
