#!/usr/bin/env node
/**
 * fetch-schedules.js — SCSC Schedule Sync Tool
 *
 * Fetches schedule data for all LA County sports teams (pro, college, juco)
 * and merges into src/data/events.json.
 *
 * Usage:
 *   node scripts/fetch-schedules.js                  # default: today → +90 days
 *   node scripts/fetch-schedules.js --days 120       # custom window
 *   node scripts/fetch-schedules.js --level pro      # only pro teams
 *   node scripts/fetch-schedules.js --level college  # only college teams
 *   node scripts/fetch-schedules.js --level juco     # only juco teams
 *   node scripts/fetch-schedules.js --dry-run        # fetch but don't write
 *
 * Runs standalone — no CI required. Works with any deployment host.
 */

const { fetchMLB } = require('./fetchers/pro/mlb');
const { fetchNHL } = require('./fetchers/pro/nhl');
const { fetchAllESPN } = require('./fetchers/pro/espn');
const { scrapeAllColleges } = require('./fetchers/college/scraper');
const { fetchAllESPNCollege } = require('./fetchers/college/espn-college');
const { scrapeAllJuco } = require('./fetchers/juco/scraper');
const { mergeEvents } = require('./merge');

// Parse CLI args
const args = process.argv.slice(2);
const flags = {};
for (let i = 0; i < args.length; i++) {
  if (args[i].startsWith('--')) {
    flags[args[i].slice(2)] = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
  }
}

const DAYS = parseInt(flags.days || '90', 10);
const LEVEL_FILTER = flags.level || 'all'; // 'pro' | 'college' | 'juco' | 'all'
const DRY_RUN = flags['dry-run'] === true || flags['dry-run'] === 'true';

function getDateRange(days) {
  const start = new Date();
  const end = new Date();
  end.setDate(end.getDate() + days);
  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

async function fetchPro(startDate, endDate) {
  console.log('\n[pro] Fetching professional team schedules...');
  const [mlb, nhl, espn] = await Promise.allSettled([
    fetchMLB(startDate, endDate),
    fetchNHL(startDate, endDate),
    fetchAllESPN(startDate, endDate),
  ]);

  const events = [];
  if (mlb.status === 'fulfilled')  { console.log(`  MLB: ${mlb.value.length} events`); events.push(...mlb.value); }
  else console.warn('  MLB fetch failed:', mlb.reason?.message);

  if (nhl.status === 'fulfilled')  { console.log(`  NHL: ${nhl.value.length} events`); events.push(...nhl.value); }
  else console.warn('  NHL fetch failed:', nhl.reason?.message);

  if (espn.status === 'fulfilled') { console.log(`  ESPN (NBA/MLS/NWSL/WNBA/NFL): ${espn.value.length} events`); events.push(...espn.value); }
  else console.warn('  ESPN fetch failed:', espn.reason?.message);

  return events;
}

async function fetchCollege(startDate, endDate) {
  console.log('\n[college] Fetching college schedules (composite + ESPN cross-ref)...');

  // Run composite scrapers (primary) and ESPN (secondary) in parallel
  const [compositeResult, espnResult] = await Promise.allSettled([
    scrapeAllColleges(startDate, endDate),
    fetchAllESPNCollege(startDate, endDate),
  ]);

  const events = [];

  // Add ESPN events first (lower precedence — will be overwritten by composite)
  if (espnResult.status === 'fulfilled') {
    console.log(`  ESPN college: ${espnResult.value.length} events (secondary)`);
    events.push(...espnResult.value);
  } else {
    console.warn('  ESPN college fetch failed:', espnResult.reason?.message);
  }

  // Add composite scraper events (higher precedence — wins in merge)
  if (compositeResult.status === 'fulfilled') {
    console.log(`  Composite scrapers: ${compositeResult.value.length} events (primary)`);
    events.push(...compositeResult.value);
  } else {
    console.warn('  Composite scraper failed:', compositeResult.reason?.message);
  }

  return events;
}

async function fetchJuco(startDate, endDate) {
  console.log('\n[juco] Fetching JuCo schedules...');
  const events = await scrapeAllJuco(startDate, endDate);
  console.log(`  JuCo total: ${events.length} events`);
  return events;
}

async function main() {
  const { startDate, endDate } = getDateRange(DAYS);
  console.log(`\nSCSC Schedule Sync`);
  console.log(`==================`);
  console.log(`Date range: ${startDate} → ${endDate} (${DAYS} days)`);
  console.log(`Level filter: ${LEVEL_FILTER}`);
  console.log(`Dry run: ${DRY_RUN}`);

  const allEvents = [];

  if (LEVEL_FILTER === 'all' || LEVEL_FILTER === 'pro') {
    const proEvents = await fetchPro(startDate, endDate);
    allEvents.push(...proEvents);
  }

  if (LEVEL_FILTER === 'all' || LEVEL_FILTER === 'college') {
    const collegeEvents = await fetchCollege(startDate, endDate);
    allEvents.push(...collegeEvents);
  }

  if (LEVEL_FILTER === 'all' || LEVEL_FILTER === 'juco') {
    const jucoEvents = await fetchJuco(startDate, endDate);
    allEvents.push(...jucoEvents);
  }

  console.log(`\nTotal fetched: ${allEvents.length} events`);

  if (DRY_RUN) {
    console.log('\n[dry-run] Skipping write to events.json');
    console.log('Sample events:');
    console.log(JSON.stringify(allEvents.slice(0, 3), null, 2));
    return;
  }

  const stats = mergeEvents(allEvents);
  console.log(`\nMerge complete:`);
  console.log(`  Added:        ${stats.added}`);
  console.log(`  Updated:      ${stats.updated}`);
  console.log(`  Skipped:      ${stats.skipped}`);
  console.log(`  Discrepancies logged: ${stats.discrepancies}`);
  console.log(`\nDone. src/data/events.json updated.`);
  if (stats.discrepancies > 0) {
    console.log(`Review discrepancies in scripts/sync-log.json`);
  }
}

main().catch(err => {
  console.error('\nFatal error:', err);
  process.exit(1);
});
