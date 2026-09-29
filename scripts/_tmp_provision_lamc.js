#!/usr/bin/env node
// One-off: provisions the team/venue rows LA Mission College needs before the
// JuCo scraper can write events for it (events.homeTeam/venue are hard FKs).
// Delete this file once it's been run against production Supabase.
const { supabaseAdmin } = require('./supabase-admin');

async function main() {
  const db = supabaseAdmin();

  const { error: teamErr } = await db.from('teams').upsert([{
    id: 'lamc-eagles',
    name: 'LA Mission College Eagles',
    shortName: 'LA Mission',
    level: 'juco',
    school: 'Los Angeles Mission College',
    conference: 'Western State Conference',
    sport: ['baseball', 'basketball', 'soccer', 'softball', 'tennis', 'volleyball'],
    logoUrl: null,
    primaryColor: '#003DA5',
    secondaryColor: '#A2AAAD',
    ticketUrl: null,
    websiteUrl: 'https://www.lamission.edu/athletics/',
  }]);
  if (teamErr) throw new Error(`teams: ${teamErr.message}`);
  console.log('teams: 1 row (lamc-eagles)');

  const { error: venueErr } = await db.from('venues').upsert([{
    id: 'lamc-athletics',
    name: 'LA Mission College Athletic Complex',
    address: '13356 Eldridge Ave, Sylmar, CA 91342',
    neighborhood: 'san-fernando-valley',
    lat: 34.3247,
    lng: -118.4429,
    capacity: 1000,
    parkingInfo: 'Free campus parking in the main lot off Eldridge Ave.',
    transitInfo: 'Metro Bus 168 along Foothill Blvd; limited transit access, driving recommended.',
  }]);
  if (venueErr) throw new Error(`venues: ${venueErr.message}`);
  console.log('venues: 1 row (lamc-athletics)');
}

main().catch(err => { console.error(err.message); process.exit(1); });
