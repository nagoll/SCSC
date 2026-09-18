#!/usr/bin/env node
/**
 * seed-supabase.js — one-time load of the existing JSON data files into Supabase.
 * Run after applying supabase/migrations/. Safe to re-run (upserts on id).
 *
 * Usage: node scripts/seed-supabase.js
 */

const fs = require('fs');
const path = require('path');
const { supabaseAdmin } = require('./supabase-admin');

const DATA_DIR = path.join(__dirname, '../src/data');

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'));
}

async function upsert(db, table, rows) {
  if (rows.length === 0) return;
  const { error } = await db.from(table).upsert(rows);
  if (error) throw new Error(`${table}: ${error.message}`);
  console.log(`  ${table}: ${rows.length} rows`);
}

async function main() {
  const db = supabaseAdmin();

  console.log('Seeding Supabase from src/data/*.json...');
  // Order matters: teams/venues before events (FK), events before featured (FK).
  await upsert(db, 'teams', readJson('teams.json'));
  await upsert(db, 'venues', readJson('venues.json'));
  await upsert(db, 'events', readJson('events.json'));
  await upsert(db, 'featured', readJson('featured.json'));
  console.log('Done.');
}

main().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
