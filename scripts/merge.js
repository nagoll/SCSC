/**
 * merge.js
 * Merges newly fetched events into the events table in Supabase.
 *
 * Source precedence (highest → lowest):
 *   university-scraper > juco-scraper > espn-api > pro-api > manual
 *
 * Rules:
 * - Existing events with source 'manual' are never overwritten.
 * - For all other existing events, a new event with higher-precedence source wins.
 * - Events with same ID from same-precedence source: new data wins (fresher).
 * - Discrepancies between sources are logged to sync-log.json for review.
 */

const fs = require('fs');
const path = require('path');
const { supabaseAdmin } = require('./supabase-admin');

const SYNC_LOG_PATH = path.join(__dirname, '../scripts/sync-log.json');

const SOURCE_PRECEDENCE = {
  manual: 0,
  'pro-api': 1,
  'espn-api': 2,
  'juco-scraper': 3,
  'university-scraper': 4,
};

// Fetchers stamp their own tier as a "<tier>:<detail>" prefix on the source
// field (e.g. "university-scraper:usc"), so precedence is read directly
// rather than guessed from naming conventions. This table exists only to
// make sense of the flat, unprefixed source strings already sitting in
// events.json from before that convention existed.
const LEGACY_SOURCE_TIER = {
  manual: 'manual',
  'mlb-api': 'pro-api',
  'nhl-api': 'pro-api',
  'espn-api': 'espn-api',
};

function getPrecedence(source) {
  const tier = source && source.includes(':') ? source.split(':')[0] : LEGACY_SOURCE_TIER[source];
  if (tier && tier in SOURCE_PRECEDENCE) return SOURCE_PRECEDENCE[tier];
  throw new Error(
    `Unknown event source "${source}" — fetchers must tag sources as "<tier>:<detail>" ` +
    `(one of ${Object.keys(SOURCE_PRECEDENCE).join(', ')}), or add a legacy mapping in LEGACY_SOURCE_TIER.`
  );
}

/**
 * Detect meaningful discrepancies between two events (same ID, different sources).
 * Returns array of discrepancy strings, or empty array if no meaningful diff.
 */
function detectDiscrepancies(existing, incoming) {
  const diffs = [];
  const fields = ['dateTime', 'venue', 'eventName'];
  for (const field of fields) {
    if (existing[field] !== incoming[field] && existing[field] != null && incoming[field] != null) {
      diffs.push(`${field}: "${existing[field]}" → "${incoming[field]}"`);
    }
  }
  // Flag venue confidence disagreements
  if (existing.venueConfidence && incoming.venueConfidence &&
      existing.venueConfidence !== incoming.venueConfidence) {
    diffs.push(`venueConfidence: "${existing.venueConfidence}" → "${incoming.venueConfidence}"`);
  }
  return diffs;
}

/**
 * Load the current sync log.
 */
function loadSyncLog() {
  try {
    return JSON.parse(fs.readFileSync(SYNC_LOG_PATH, 'utf-8'));
  } catch {
    return { lastRun: null, discrepancies: [] };
  }
}

/**
 * Merge an array of new events into the events table.
 * `db` is injectable so tests can pass a fake client; defaults to the real one.
 * Returns stats: { added, updated, skipped, discrepancies }.
 */
async function mergeEvents(newEvents, db = supabaseAdmin()) {
  const { data: existing, error: readError } = await db.from('events').select('*');
  if (readError) throw new Error(`mergeEvents: failed to read events — ${readError.message}`);

  const existingMap = new Map(existing.map(e => [e.id, e]));
  const syncLog = loadSyncLog();
  const discrepancies = [];
  const toUpsert = [];

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const incoming of newEvents) {
    const current = existingMap.get(incoming.id);

    if (!current) {
      toUpsert.push(incoming);
      existingMap.set(incoming.id, incoming);
      added++;
      continue;
    }

    // Never overwrite manual entries
    if (current.source === 'manual') {
      skipped++;
      continue;
    }

    const currentPrecedence = getPrecedence(current.source);
    const incomingPrecedence = getPrecedence(incoming.source);

    // Log discrepancies between sources regardless of who wins
    if (current.source !== incoming.source) {
      const diffs = detectDiscrepancies(current, incoming);
      if (diffs.length > 0) {
        discrepancies.push({
          eventId: incoming.id,
          existingSource: current.source,
          incomingSource: incoming.source,
          diffs,
          timestamp: new Date().toISOString(),
        });
      }
    }

    if (incomingPrecedence >= currentPrecedence) {
      // Preserve isFeatured flag from existing entry
      // When merging, pick the best venue confidence between the two sources
      const confidenceRank = { verified: 3, likely: 2, unverified: 1 };
      const currentConfRank = confidenceRank[current.venueConfidence] || 0;
      const incomingConfRank = confidenceRank[incoming.venueConfidence] || 0;

      const mergedEvent = {
        ...incoming,
        isFeatured: current.isFeatured,
      };

      // If the existing entry had higher venue confidence, preserve that venue data
      if (currentConfRank > incomingConfRank && current.venue === incoming.venue) {
        mergedEvent.venueConfidence = current.venueConfidence;
        mergedEvent.venueSourceName = current.venueSourceName || incoming.venueSourceName;
      }

      // If both sources provide venue data and agree → upgrade to verified
      if (current.venue === incoming.venue &&
          current.source !== incoming.source &&
          current.venueSourceName && incoming.venueSourceName) {
        mergedEvent.venueConfidence = 'verified';
      }

      toUpsert.push(mergedEvent);
      existingMap.set(incoming.id, mergedEvent);
      updated++;
    } else {
      // Even if we skip the update, we can still upgrade venue confidence
      // if the incoming source confirms the same venue
      if (incoming.venue === current.venue &&
          incoming.source !== current.source &&
          incoming.venueSourceName && current.venueSourceName) {
        const upgraded = { ...current, venueConfidence: 'verified' };
        toUpsert.push(upgraded);
        existingMap.set(current.id, upgraded);
      }
      skipped++;
    }
  }

  if (toUpsert.length > 0) {
    const { error: writeError } = await db.from('events').upsert(toUpsert);
    if (writeError) throw new Error(`mergeEvents: failed to write events — ${writeError.message}`);
  }

  // Update sync log
  syncLog.lastRun = new Date().toISOString();
  syncLog.discrepancies = [
    ...discrepancies,
    ...(syncLog.discrepancies || []),
  ].slice(0, 200); // keep newest 200 total
  fs.writeFileSync(SYNC_LOG_PATH, JSON.stringify(syncLog, null, 2));

  return { added, updated, skipped, discrepancies: discrepancies.length };
}

/**
 * Remove events whose dateTime is before yesterday.
 * `db` is injectable so tests can pass a fake client; defaults to the real one.
 * Returns the number of events pruned.
 */
async function prunePastEvents(db = supabaseAdmin()) {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  const { data: deleted, error } = await db
    .from('events')
    .delete()
    .lt('dateTime', yesterday.toISOString())
    .select('id');
  if (error) throw new Error(`prunePastEvents: ${error.message}`);
  return deleted.length;
}

module.exports = { mergeEvents, prunePastEvents, getPrecedence, detectDiscrepancies };
