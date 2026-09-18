/**
 * export-to-json.js — dump the Supabase tables back to src/data/*.json.
 *
 * Supabase is the source of truth as of Phase 1, but we keep a nightly JSON
 * export so `git diff` still shows a human-readable daily changelog of what
 * the fetch pipeline changed.
 */

const fs = require('fs');
const path = require('path');
const { supabaseAdmin } = require('./supabase-admin');

const DATA_DIR = path.join(__dirname, '../src/data');

const TABLES = [
  { table: 'teams', file: 'teams.json', orderBy: 'id' },
  { table: 'venues', file: 'venues.json', orderBy: 'id' },
  { table: 'events', file: 'events.json', orderBy: 'dateTime' },
  { table: 'featured', file: 'featured.json', orderBy: 'id' },
];

// `db` is injectable so tests can pass a fake client; defaults to the real one.
async function exportAllToJson(db = supabaseAdmin()) {
  for (const { table, file, orderBy } of TABLES) {
    const { data, error } = await db.from(table).select('*').order(orderBy);
    if (error) throw new Error(`export ${table}: ${error.message}`);
    fs.writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2) + '\n');
  }
}

module.exports = { exportAllToJson };
