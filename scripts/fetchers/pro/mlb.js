/**
 * mlb.js — Dodgers schedule via MLB Stats API (free, no key required)
 * API docs: https://statsapi.mlb.com/api/v1/schedule
 */

const { normalizeEvent } = require('../../normalize');
const { verifyVenue } = require('../../venue-verify');

const TEAM_ID = 119; // Dodgers
const VENUE_ID = 'dodger-stadium';
const TEAM_SCSC_ID = 'la-dodgers';

async function fetchMLB(startDate, endDate) {
  const url =
    `https://statsapi.mlb.com/api/v1/schedule` +
    `?sportId=1&teamId=${TEAM_ID}` +
    `&startDate=${startDate}&endDate=${endDate}` +
    `&hydrate=team,venue,game(content(summary))` +
    `&gameType=R,P,F,D,L,W`; // Regular + Postseason

  const res = await fetch(url);
  if (!res.ok) throw new Error(`MLB API error: ${res.status}`);
  const data = await res.json();

  const events = [];
  for (const dateObj of data.dates || []) {
    for (const game of dateObj.games || []) {
      if (game.status?.abstractGameState === 'Final') continue; // skip completed

      const isHome = game.teams?.home?.team?.id === TEAM_ID;
      if (!isHome) continue; // only home games (played in LA)

      const awayTeamName = game.teams?.away?.team?.name || 'Visiting Team';
      const gameTime = game.gameDate; // ISO 8601

      // Extract actual venue data from MLB API (hydrated via &hydrate=venue)
      const mlbVenue = game.venue;
      const mlbVenueName = mlbVenue?.name || null;
      const mlbVenueCity = mlbVenue?.location?.city || null;
      const mlbVenueState = mlbVenue?.location?.stateAbbrev || null;

      const verification = verifyVenue({
        espnVenueName: mlbVenueName,
        espnVenueCity: mlbVenueCity,
        espnVenueState: mlbVenueState,
        defaultVenueId: VENUE_ID,
      });

      if (verification.excluded) {
        console.log(`[mlb] Excluding Dodgers event: ${awayTeamName} — ${verification.excludeReason}`);
        continue;
      }

      events.push(
        normalizeEvent({
          homeTeamId: TEAM_SCSC_ID,
          awayTeamId: null,
          sport: 'baseball',
          level: 'pro',
          gender: 'mens',
          dateTime: gameTime,
          endTime: null,
          venueId: verification.venueId,
          venueSourceName: verification.venueSourceName,
          venueConfidence: verification.venueConfidence,
          isNeutralSite: verification.isNeutralSite,
          eventName: `${awayTeamName} at Dodgers`,
          ticketUrl: 'https://www.mlb.com/dodgers/tickets',
          price: 'under_50',
          conference: null,
          league: 'MLB',
          source: 'mlb-api',
        })
      );
    }
  }

  return events;
}

module.exports = { fetchMLB };
