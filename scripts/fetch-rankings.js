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

// CCAA schools are Division II, SCIAC schools Division III, the rest Division I.
const DIVISION_BY_CONFERENCE = { CCAA: 'd2', SCIAC: 'd3' };

// NCAA.com sport slug → our sport + gender. Football's top division is "fbs".
const SPORTS = [
  { slug: 'football', sport: 'football', gender: 'mens', divisions: ['fbs', 'fcs', 'd2', 'd3'] },
  { slug: 'basketball-men', sport: 'basketball', gender: 'mens' },
  { slug: 'basketball-women', sport: 'basketball', gender: 'womens' },
  { slug: 'volleyball-women', sport: 'volleyball', gender: 'womens' },
  { slug: 'volleyball-men', sport: 'volleyball', gender: 'mens', divisions: ['nc', 'd3'] },
  { slug: 'soccer-men', sport: 'soccer', gender: 'mens' },
  { slug: 'soccer-women', sport: 'soccer', gender: 'womens' },
  { slug: 'baseball', sport: 'baseball', gender: 'mens' },
  { slug: 'softball', sport: 'softball', gender: 'womens' },
  { slug: 'waterpolo-men', sport: 'water-polo', gender: 'mens', divisions: ['nc'] },
  { slug: 'waterpolo-women', sport: 'water-polo', gender: 'womens', divisions: ['nc'] },
];

/** "Southern California (12)" → "southern california" (drops first-place votes). */
function normalizeName(name) {
  return (name || '').replace(/\(\d+\)/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
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

/** Which of our teams a poll row names, if any (school name or aliases). */
function matchTeam(school, teams) {
  const norm = normalizeName(school);
  return teams.find(t => (t.rankingNames || [t.school, t.shortName, t.name]).some(n => normalizeName(n) === norm)) || null;
}

async function fetchPage(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30_000) });
  return { status: res.status, url: res.url, html: res.ok ? await res.text() : '' };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const allTeams = require('../src/data/teams.json');
  const teams = (Array.isArray(allTeams) ? allTeams : allTeams.teams).filter(t => t.level === 'college');
  const divisionOf = t => DIVISION_BY_CONFERENCE[t.conference] || 'd1';

  const polls = [];
  for (const s of SPORTS) {
    for (const division of s.divisions || ['d1', 'd2', 'd3']) {
      const url = `https://www.ncaa.com/rankings/${s.slug}/${division}`;
      let page;
      try {
        page = await fetchPage(url);
      } catch (err) {
        console.warn(`[rankings] ${url}: ${err.message}`);
        continue;
      }
      if (!page.html) {
        console.warn(`[rankings] ${url}: HTTP ${page.status}`);
        continue;
      }
      const { title, dateText, teams: rows } = parseNcaaRankings(page.html);
      const ranked = rows
        .map(r => ({ ...r, team: matchTeam(r.school, teams) }))
        .filter(r => r.team)
        .map(r => ({ teamId: r.team.id, rank: r.rank }));
      console.log(`[rankings] ${s.slug}/${division}: "${title}" ${dateText || ''} — ${rows.length} rows, LA: ${ranked.map(r => `${r.teamId} #${r.rank}`).join(', ') || 'none'} (${page.url})`);
      {
        const $ = cheerio.load(page.html);
        const options = new Set($(`a[href*="/rankings/${s.slug}/${division}/"], option[value*="/rankings/${s.slug}/${division}/"]`)
          .map((_, el) => ($(el).attr('href') || $(el).attr('value')).replace(/^.*\/rankings\//, '')).get());
        console.log(`[rankings]   polls offered: ${[...options].join(' ')}`);
      }
      if (rows.length) console.log(`[rankings]   top: ${rows.slice(0, 5).map(r => `${r.rank} ${r.school}`).join(' | ')}`);
      if (!rows.length) {
        const $ = cheerio.load(page.html);
        console.warn(`[rankings]   no table rows; tables: ${$('table').length}, h1/h2: ${$('h1, h2').map((_, el) => $(el).text().trim()).get().slice(0, 4).join(' / ')}`);
        continue;
      }
      polls.push({ sport: s.sport, gender: s.gender, division, poll: title, date: dateText, source: page.url, ranked });
    }
  }

  const unmatched = teams.filter(t => !polls.some(p => p.ranked.some(r => r.teamId === t.id)));
  console.log(`[rankings] LA teams in no poll: ${unmatched.map(t => `${t.id} (${divisionOf(t)})`).join(', ')}`);

  if (polls.length === 0) {
    console.error('[rankings] no polls parsed — keeping the existing rankings.json');
    process.exitCode = 1;
    return;
  }
  const out = { updatedAt: new Date().toISOString(), polls };
  if (dryRun) {
    console.log('[dry-run] Skipping write to rankings.json');
  } else {
    fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2) + '\n');
    console.log(`[rankings] wrote ${polls.length} polls to rankings.json`);
  }
}

if (require.main === module) main();

module.exports = { parseNcaaRankings, matchTeam, normalizeName };
