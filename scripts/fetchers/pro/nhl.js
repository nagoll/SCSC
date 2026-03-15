/**
 * nhl.js — Kings schedule via NHL Stats API (free, no key required)
 * API docs: https://api-web.nhle.com/v1/club-schedule-season/{teamAbbrev}/now
 */

const { normalizeEvent } = require('../../normalize');
const { verifyVenue } = require('../../venue-verify');

const TEAM_ABBREV = 'LAK';
const VENUE_ID = 'crypto-arena';
const TEAM_SCSC_ID = 'la-kings';

async function fetchNHL(startDate, endDate) {
  const url = `https://api-web.nhle.com/v1/club-schedule-season/${TEAM_ABBREV}/now`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`NHL API error: ${res.status}`);
  const data = await res.json();

  const start = new Date(startDate);
  const end = new Date(endDate);
  const events = [];

  for (const game of data.games || []) {
    const gameDate = new Date(game.gameDate);
    if (gameDate < start || gameDate > end) continue;
    if (game.homeTeam?.abbrev !== TEAM_ABBREV) continue; // home games only

    const awayAbbrev = game.awayTeam?.abbrev || 'Visitor';
    const awayName = game.awayTeam?.commonName?.default || awayAbbrev;
    const gameTime = game.startTimeUTC;

    // Extract venue data from NHL API
    const nhlVenueName = game.venue?.default || null;

    const verification = verifyVenue({
      espnVenueName: nhlVenueName,
      defaultVenueId: VENUE_ID,
    });

    if (verification.excluded) {
      console.log(`[nhl] Excluding Kings event: ${awayName} — ${verification.excludeReason}`);
      continue;
    }

    events.push(
      normalizeEvent({
        homeTeamId: TEAM_SCSC_ID,
        awayTeamId: null,
        sport: 'hockey',
        level: 'pro',
        gender: 'mens',
        dateTime: gameTime,
        endTime: null,
        venueId: verification.venueId,
        venueSourceName: verification.venueSourceName,
        venueConfidence: verification.venueConfidence,
        isNeutralSite: verification.isNeutralSite,
        eventName: `${awayName} at Kings`,
        ticketUrl: 'https://www.nhl.com/kings/tickets',
        price: 'under_50',
        conference: null,
        league: 'NHL',
        source: 'nhl-api',
      })
    );
  }

  return events;
}

module.exports = { fetchNHL };
