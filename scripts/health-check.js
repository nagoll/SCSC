/**
 * health-check.js — fail the refresh loudly when a source silently returns nothing.
 *
 * Every fetcher catches its own errors and returns [], so without this a dead
 * scraper (404, blocked proxy, changed markup) looks identical to a quiet week
 * and the workflow still goes green.
 */

// Teams allowed to have no upcoming events: off-season with no schedule
// published yet. Remove a team once its season's schedule is out.
const QUIET_OK = new Set([
  'la-sparks',        // WNBA schedule is released in spring
  'la-knight-riders', // MLC (summer); no fetcher covers it yet
]);

// A team whose fetched count falls below this share of its previous upcoming
// count is flagged, catching partial failures (one sport's feed dying).
const DROP_RATIO = 0.5;
const DROP_MIN_PREVIOUS = 4;

function countByHomeTeam(events) {
  const counts = new Map();
  for (const e of events) counts.set(e.homeTeam, (counts.get(e.homeTeam) || 0) + 1);
  return counts;
}

/**
 * @param {object[]} teams    - teams.json rows (the teams we promise to cover)
 * @param {object[]} fetched  - valid events fetched this run
 * @param {object[]} previous - events.json from the last refresh
 * @param {string}   level    - 'all' | 'pro' | 'college' | 'juco'
 */
function checkHealth({ teams, fetched, previous, level = 'all', now = new Date() }) {
  const got = countByHomeTeam(fetched);
  const had = countByHomeTeam(previous.filter(e => new Date(e.dateTime) >= now));

  const rows = teams
    .filter(t => level === 'all' || t.level === level)
    .map(t => {
      const n = got.get(t.id) || 0;
      const prev = had.get(t.id) || 0;
      let problem = null;
      if (n === 0 && !QUIET_OK.has(t.id)) problem = 'no events fetched';
      else if (prev >= DROP_MIN_PREVIOUS && n < prev * DROP_RATIO) problem = `dropped from ${prev}`;
      return { id: t.id, level: t.level, fetched: n, previous: prev, problem };
    })
    .sort((a, b) => Boolean(b.problem) - Boolean(a.problem) || a.id.localeCompare(b.id));

  return { rows, failures: rows.filter(r => r.problem) };
}

function formatSummary({ rows, failures }) {
  const head = failures.length
    ? `### ❌ Schedule health: ${failures.length} of ${rows.length} teams failing`
    : `### ✅ Schedule health: all ${rows.length} teams OK`;
  const table = rows.map(r =>
    `| ${r.problem ? '❌' : '✅'} | ${r.id} | ${r.level} | ${r.fetched} | ${r.previous} | ${r.problem || ''} |`);
  return [head, '', '| | Team | Level | Fetched | Previous | Problem |', '|---|---|---|---|---|---|', ...table, ''].join('\n');
}

module.exports = { checkHealth, formatSummary, QUIET_OK };
