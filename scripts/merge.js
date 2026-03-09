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
  // Match prefix: e.g. 'mlb-api' → 'pro-api', 'ucla-scraper' → 'university-scraper'
  if (!source) return 0;
  if (source === 'manual') return 0;
  if (source.endsWith('-api') && !source.startsWith('espn')) return 1;
  if (source === 'espn-api' || source.startsWith('espn-')) return 2;
  if (source.endsWith('-juco-scraper') || source === 'juco-scraper') return 3;
  if (source.endsWith('-scraper') || source.endsWith('-composite')) return 4;
  return 1;
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
      existingMap.set(incoming.id, {
        ...incoming,
        isFeatured: current.isFeatured,
      });
      updated++;
    } else {
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
    ...(syncLog.discrepancies || []).slice(0, 200), // keep last 200
  ];
  fs.writeFileSync(SYNC_LOG_PATH, JSON.stringify(syncLog, null, 2));

  return { added, updated, skipped, discrepancies: discrepancies.length };
}

module.exports = { mergeEvents };
