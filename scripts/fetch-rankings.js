/**
 * fetch-rankings.js — weekly college poll rankings for the LA college teams.
 *
 * NCAA.com republishes each sport's official poll (AP, AVCA, United Soccer
 * Coaches, ...) for every division in one table format, so one parser covers
 * them all. Most polls come out Sunday–Tuesday, so this runs Wednesdays.
 *
 * Writes src/data/rankings.json: { updatedAt, polls: [...] }, where each poll
 * lists only the LA teams it ranks. Run with --dry-run to print instead.
 */

const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const OUT_PATH = path.join(__dirname, '../src/data/rankings.json');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';

// One national poll per sport and division, by its NCAA.com path. Human polls
// where NCAA.com carries one; otherwise the NCAA's own RPI, which is what the
// selection committees use. Regional rankings are left out on purpose: their
// numbers restart in every region, so "#3" there doesn't mean 3rd nationally.
// Sport/division pairs NCAA.com has no national ranking for are simply absent.
const POLLS = [
  { path: 'football/fbs/associated-press', label: 'AP Top 25', sport: 'football', gender: 'mens', division: 'd1' },
  { path: 'football/d3/afca-coaches', label: 'AFCA Coaches Poll', sport: 'football', gender: 'mens', division: 'd3' },
  { path: 'basketball-men/d1/di-mens-basketball-associated-press', label: 'AP Top 25', sport: 'basketball', gender: 'mens', division: 'd1' },
  { path: 'basketball-men/d2/nabc-coaches', label: 'NABC Coaches Poll', sport: 'basketball', gender: 'mens', division: 'd2' },
  { path: 'basketball-women/d1/di-womens-basketball-associated-press', label: 'AP Top 25', sport: 'basketball', gender: 'womens', division: 'd1' },
  { path: 'volleyball-women/d1/avca-rankings', label: 'AVCA Coaches Poll', sport: 'volleyball', gender: 'womens', division: 'd1' },
  { path: 'volleyball-men/nc/nc-mens-volleyball-rpi', label: 'NCAA RPI', sport: 'volleyball', gender: 'mens', division: 'all' },
  { path: 'soccer-men/d1/united-soccer-coaches', label: 'United Soccer Coaches Poll', sport: 'soccer', gender: 'mens', division: 'd1' },
  { path: 'soccer-women/d1/iwsoc-coaches-poll', label: 'United Soccer Coaches Poll', sport: 'soccer', gender: 'womens', division: 'd1' },
  { path: 'baseball/d1/d1baseballcom-top-25', label: 'D1Baseball Top 25', sport: 'baseball', gender: 'mens', division: 'd1' },
  { path: 'softball/d1/espncom/usa-softball', label: 'ESPN.com/USA Softball Poll', sport: 'softball', gender: 'womens', division: 'd1' },
  { path: 'waterpolo-men/nc/rpi', label: 'NCAA RPI', sport: 'water-polo', gender: 'mens', division: 'all' },
  { path: 'waterpolo-women/nc/rpi', label: 'NCAA RPI', sport: 'water-polo', gender: 'womens', division: 'all' },
];

// Only a top 25 reads as "ranked"; RPI lists go much deeper.
const MAX_RANK = 25;
// Polls stop for the off-season; an old one would show last season's rank.
const MAX_AGE_DAYS = 21;

// How NCAA.com writes our schools' names, when it isn't the team's own name.
const NAME_ALIASES = {
  'usc-trojans': ['USC', 'Southern California', 'Southern Cal'],
  'ucla-bruins': ['UCLA'],
  'lmu-lions': ['LMU', 'LMU (CA)', 'Loyola Marymount'],
  'pepperdine-waves': ['Pepperdine'],
  'long-beach-state-49ers': ['Long Beach St.', 'Long Beach State', 'LBSU'],
  'csun-matadors': ['CSUN', 'Cal St. Northridge', 'Cal State Northridge', 'CSU Northridge'],
  'csuf-titans': ['Cal St. Fullerton', 'Cal State Fullerton', 'CSUF', 'CSU Fullerton'],
  'cal-poly-pomona-broncos': ['Cal Poly Pomona', 'Cal Poly-Pomona'],
  'calstate-la-eagles': ['Cal State LA', 'Cal St. LA', 'Cal State Los Angeles', 'Cal St. Los Angeles'],
  'csudh-toros': ['CSU Dominguez Hills', 'Cal St. Dominguez Hills', 'Cal State Dominguez Hills', 'CSUDH'],
  'pomona-pitzer-sagehens': ['Pomona-Pitzer', 'Pomona Pitzer'],
  'occidental-tigers': ['Occidental'],
};

/** "Southern California (12)" → "southern california" (drops first-place votes). */
function normalizeName(name) {
  return (name || '').replace(/\(\d+\)$/, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Parse an NCAA.com rankings page: the poll title, its date line and the
 * ranked table (RANK, SCHOOL, ...). Ties show as "T-5".
 */
function parseNcaaRankings(html) {
  const $ = cheerio.load(html);
  const title = $('h2').filter((_, el) => /poll|ranking|top/i.test($(el).text())).first().text().trim()
    || $('title').text().trim();
  const dateText = $('.rankings-last-updated, .rankings-date, figcaption').first().text().trim() || null;
  const teams = [];
  $('table').first().find('tbody tr').each((_, tr) => {
    const cells = $(tr).find('td').map((__, td) => $(td).text().trim()).get();
    const rank = parseInt((cells[0] || '').replace(/^T-?/i, ''), 10);
    const school = (cells[1] || '').replace(/\(\d+\)/g, '').trim();
    if (rank && school) teams.push({ rank, school });
  });
  return { title, dateText, teams };
}

/** Which of our teams a poll row names, if any. */
function matchTeam(school, teamIds) {
  const norm = normalizeName(school);
  return teamIds.find(id => (NAME_ALIASES[id] || []).some(n => normalizeName(n) === norm)) || null;
}

/** "Through Games OCT. 17, 2026" / "Through Games Apr. 25 2026" → Date, or null. */
function parsePollDate(text) {
  const m = (text || '').match(/([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/);
  if (!m) return null;
  const d = new Date(`${m[1]} ${m[2]} ${m[3]} 12:00 UTC`);
  return isNaN(d) ? null : d;
}

async function fetchPage(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30_000) });
  return { status: res.status, url: res.url, html: res.ok ? await res.text() : '' };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const now = new Date();
  const teamIds = Object.keys(NAME_ALIASES);

  const polls = [];
  for (const p of POLLS) {
    const url = `https://www.ncaa.com/rankings/${p.path}`;
    let page;
    try {
      page = await fetchPage(url);
    } catch (err) {
      console.warn(`[rankings] ${p.path}: ${err.message}`);
      continue;
    }
    if (!page.html) {
      console.warn(`[rankings] ${p.path}: HTTP ${page.status}`);
      continue;
    }
    const { title, dateText, teams: rows } = parseNcaaRankings(page.html);
    const date = parsePollDate(dateText);
    const ranked = rows
      .filter(r => r.rank <= MAX_RANK)
      .map(r => ({ teamId: matchTeam(r.school, teamIds), rank: r.rank }))
      .filter(r => r.teamId);
    const stale = !date || (now - date) / 86_400_000 > MAX_AGE_DAYS;
    console.log(`[rankings] ${p.path}: ${rows.length} rows, ${dateText || 'no date'}${stale ? ' (out of season, skipped)' : ''} — LA: ${ranked.map(r => `${r.teamId} #${r.rank}`).join(', ') || 'none'}`);
    if (rows.length === 0) console.warn(`[rankings]   no rows parsed from "${title}"`);
    if (stale || rows.length === 0) continue;
    polls.push({
      sport: p.sport,
      gender: p.gender,
      division: p.division,
      poll: p.label,
      through: date.toISOString().slice(0, 10),
      source: url,
      ranked,
    });
  }

  const out = { updatedAt: now.toISOString(), polls };
  if (dryRun) {
    console.log(JSON.stringify(out, null, 2));
    console.log('[dry-run] Skipping write to rankings.json');
  } else {
    fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
    console.log(`[rankings] wrote ${polls.length} polls to rankings.json`);
  }
}

if (require.main === module) main();

module.exports = { parseNcaaRankings, matchTeam, normalizeName, parsePollDate, NAME_ALIASES };
