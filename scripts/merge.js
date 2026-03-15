/**
 * merge.js
 * Merges newly fetched events into the existing events.json.
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

const EVENTS_PATH = path.join(__dirname, '../src/data/events.json');
const SYNC_LOG_PATH = path.join(__dirname, '../scripts/sync-log.json');

const SOURCE_PRECEDENCE = {
  'manual': 0,
  'pro-api': 1,
  'espn-api': 2,
  'juco-scraper': 3,
  'university-scraper': 4,
};

function getPrecedence(source) {
  // Exact match first (e.g. 'manual', 'espn-api', 'juco-scraper')
  if (!source || source === 'manual') return SOURCE_PRECEDENCE['manual'];
  if (source in SOURCE_PRECEDENCE) return SOURCE_PRECEDENCE[source];
  // Pattern match for derived names (e.g. 'mlb-api' → pro-api tier, 'ucla-composite' → university-scraper tier)
  if (source.endsWith('-api') && !source.startsWith('espn')) return SOURCE_PRECEDENCE['pro-api'];
  if (source.startsWith('espn-')) return SOURCE_PRECEDENCE['espn-api'];
  if (source.endsWith('-juco-scraper')) return SOURCE_PRECEDENCE['juco-scraper'];
  if (source.endsWith('-scraper') || source.endsWith('-composite')) return SOURCE_PRECEDENCE['university-scraper'];
  return SOURCE_PRECEDENCE['pro-api']; // unknown → treat as pro-api tier
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
 * Merge an array of new events into events.json.
 * Returns stats: { added, updated, skipped, discrepancies }.
 */
function mergeEvents(newEvents) {
  const existing = JSON.parse(fs.readFileSync(EVENTS_PATH, 'utf-8'));
  const existingMap = new Map(existing.map(e => [e.id, e]));
  const syncLog = loadSyncLog();
  const discrepancies = [];

  let added = 0;
  let updated = 0;
  let skipped = 0;

  for (const incoming of newEvents) {
    const current = existingMap.get(incoming.id);

    if (!current) {
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

      existingMap.set(incoming.id, mergedEvent);
      updated++;
    } else {
      // Even if we skip the update, we can still upgrade venue confidence
      // if the incoming source confirms the same venue
      if (incoming.venue === current.venue &&
          incoming.source !== current.source &&
          incoming.venueSourceName && current.venueSourceName) {
        existingMap.set(current.id, {
          ...current,
          venueConfidence: 'verified',
        });
      }
      skipped++;
    }
  }

  const merged = Array.from(existingMap.values()).sort(
    (a, b) => new Date(a.dateTime) - new Date(b.dateTime)
  );

  fs.writeFileSync(EVENTS_PATH, JSON.stringify(merged, null, 2));

  // Update sync log
  syncLog.lastRun = new Date().toISOString();
  syncLog.discrepancies = [
    ...discrepancies,
    ...(syncLog.discrepancies || []),
  ].slice(0, 200); // keep newest 200 total
  fs.writeFileSync(SYNC_LOG_PATH, JSON.stringify(syncLog, null, 2));

  return { added, updated, skipped, discrepancies: discrepancies.length };
}

module.exports = { mergeEvents };
