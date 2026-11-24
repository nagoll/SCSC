/**
 * dedupe.js
 * Collapses listings that are really the same game.
 *
 * Event IDs include the opponent's name, so the same game gets a second row
 * whenever that name changes or is a stand-in. Seen in the data:
 *   - "TBD"/"TBA" or "No. 1 CBU vs. TBD" next to the real opponent
 *   - "CCAA Tournament", "Big West Championship" next to the real opponent
 *   - "RV Bates College" next to "Bates College" (a poll prefix in the ID)
 *   - an older row under the school's own ID next to one under ESPN's ID
 *   - one row per opponent for a multi-team meet ("Colorado State" and
 *     "UTRGV" at the same swim meet, same start time)
 *
 * A team can only be in one game at a time, so rows for the same team, sport
 * and gender that start at the same moment are one event. Rows at different
 * times are left alone, because a team can play twice in a day and a TBA
 * later that day may be a real second game.
 */

const { getPrecedence } = require('./merge');
const { supabaseAdmin } = require('./supabase-admin');
const { selectAll } = require('./select-all');

// Opponent names that stand in for a real opponent.
const PLACEHOLDER = /\b(tba|tbd|to be (announced|determined)|opponent|winner|loser|tournament|tourney|championships?|invitational|classic|bracket|playoffs?|quarterfinals?|semifinals?|finals?|round)\b/i;
const BARE_PLACEHOLDER = /^(tba|tbd|opponent)$/i;
// "#21 X", "No. 1 X", "RV X" (receiving votes) are the same opponent as "X".
const RANK_PREFIX = /^(#\s*\d+|no\.?\s*\d+|rv)\s+/i;
const OPPONENT_SEPARATOR = ' & ';

/** "Colorado State & UTRGV at Pepperdine Waves" → { opponents: [...], host: "Pepperdine Waves" } */
function parseEventName(eventName) {
  const name = eventName || '';
  const at = name.lastIndexOf(' at ');
  if (at < 0) return null;
  const opponents = name.slice(0, at).split(OPPONENT_SEPARATOR).map(s => s.trim()).filter(Boolean);
  if (opponents.length === 0) return null;
  return { opponents, host: name.slice(at + 4).trim() };
}

function normalizeOpponent(name) {
  return name.trim().replace(RANK_PREFIX, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function isPlaceholder(event) {
  const parsed = parseEventName(event.eventName);
  if (!parsed) return false;
  return parsed.opponents.every(o => PLACEHOLDER.test(normalizeOpponent(o)) || normalizeOpponent(o) === '');
}

/** ESPN adds mascots: "UNC Greensboro Spartans" is the same team as "UNC Greensboro". */
function sameOpponent(a, b) {
  const x = normalizeOpponent(a);
  const y = normalizeOpponent(b);
  return x === y || x.startsWith(y + ' ') || y.startsWith(x + ' ');
}

/** True when every opponent of `event` already appears in `winner`. */
function coveredBy(event, winner) {
  const a = parseEventName(event.eventName);
  const b = parseEventName(winner.eventName);
  if (!a || !b) return event.eventName === winner.eventName;
  return a.opponents.every(o => b.opponents.some(w => sameOpponent(o, w)));
}

function slotKey(e) {
  const t = new Date(e.dateTime);
  return [e.homeTeam, e.sport, e.gender, isNaN(t) ? e.dateTime : t.toISOString()].join('|');
}

function updatedAt(e) {
  const t = Date.parse(e.lastUpdated);
  return isNaN(t) ? 0 : t;
}

/**
 * Best row first: real opponent, higher-precedence source, then (for stored
 * rows only) the fresher one, a named stand-in over a bare "TBD", then id.
 * Within one fetch every row is equally fresh, so freshness is skipped there:
 * the winner, and so the ID kept, stays the same from run to run.
 */
function rowComparator({ byFreshness }) {
  return (a, b) => (isPlaceholder(a) - isPlaceholder(b))
    || (getPrecedence(b.source) - getPrecedence(a.source))
    || (byFreshness ? updatedAt(b) - updatedAt(a) : 0)
    || (BARE_PLACEHOLDER.test(opponentText(a)) - BARE_PLACEHOLDER.test(opponentText(b)))
    || a.id.localeCompare(b.id);
}

function opponentText(e) {
  return parseEventName(e.eventName)?.opponents.join(OPPONENT_SEPARATOR) || '';
}

function groupBySlot(events) {
  const groups = new Map();
  for (const e of events) {
    const k = slotKey(e);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(e);
  }
  return groups;
}

/**
 * Collapse one fetch's events. Placeholders give way to a real opponent at
 * the same slot, repeats of the same opponent collapse into the best row, and
 * different real opponents at one slot (a multi-team meet) become one event
 * naming all of them, kept under the best row's ID.
 * Returns { events, removed } where `removed` lists the dropped IDs.
 */
function dedupeEvents(events) {
  const out = [];
  const removed = [];
  for (const group of groupBySlot(events).values()) {
    if (group.length === 1 || group.some(e => e.source === 'manual')) {
      out.push(...group);
      continue;
    }
    const sorted = [...group].sort(rowComparator({ byFreshness: false }));
    const winner = sorted[0];
    const reals = sorted.filter(e => !isPlaceholder(e));
    const parsedWinner = parseEventName(winner.eventName);

    // Opponents in the winner's order, then any others in rank order.
    const opponents = parsedWinner && reals.length > 0 ? [...parsedWinner.opponents] : null;
    if (opponents) {
      for (const e of reals.slice(1)) {
        const parsed = parseEventName(e.eventName);
        if (!parsed) continue;
        for (const o of parsed.opponents) {
          if (!opponents.some(w => sameOpponent(o, w))) opponents.push(o);
        }
      }
    }

    const merged = { ...winner, isFeatured: group.some(e => e.isFeatured) };
    if (opponents && opponents.length > parsedWinner.opponents.length) {
      merged.eventName = `${opponents.join(OPPONENT_SEPARATOR)} at ${parsedWinner.host}`;
    }
    if (!merged.ticketUrl) merged.ticketUrl = sorted.find(e => e.ticketUrl)?.ticketUrl || null;
    out.push(merged);
    removed.push(...sorted.slice(1).map(e => e.id));
  }
  return { events: out, removed };
}

/**
 * IDs of stored rows that duplicate a better row at the same slot. Unlike
 * dedupeEvents this never rewrites a row: it only drops placeholders and rows
 * whose opponents the best row already names, so stale rows left by earlier
 * runs (before a TBD was filled in, or under an old ID) go away without
 * folding stale opponents into the current listing.
 */
function findStoredDuplicates(rows) {
  const ids = [];
  for (const group of groupBySlot(rows).values()) {
    if (group.length === 1 || group.some(e => e.source === 'manual')) continue;
    const sorted = [...group].sort(rowComparator({ byFreshness: true }));
    const winner = sorted[0];
    for (const e of sorted.slice(1)) {
      if (isPlaceholder(e) || coveredBy(e, winner)) ids.push(e.id);
    }
  }
  return ids;
}

/**
 * Delete stored rows that duplicate a better row (see findStoredDuplicates).
 * `db` is injectable so tests can pass a fake client.
 * Returns the number of rows removed.
 */
async function removeDuplicateEvents(db = supabaseAdmin()) {
  const { data: rows, error } = await selectAll(() => db.from('events').select('*').order('id'));
  if (error) throw new Error(`removeDuplicateEvents: ${error.message}`);
  const ids = findStoredDuplicates(rows);
  if (ids.length === 0) return 0;
  const { data: deleted, error: delError } = await db.from('events').delete().in('id', ids).select('id');
  if (delError) throw new Error(`removeDuplicateEvents: ${delError.message}`);
  return deleted.length;
}

module.exports = { dedupeEvents, findStoredDuplicates, removeDuplicateEvents, isPlaceholder, sameOpponent, parseEventName };
