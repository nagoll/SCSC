/**
 * espn.js — Multi-team fetcher via ESPN public API (no key required)
 * Covers: Lakers, Clippers, Sparks, LAFC, Galaxy, Angel City FC, Rams, Chargers
 *
 * ESPN endpoint pattern:
 *   https://site.api.espn.com/apis/site/v2/sports/{sport}/{league}/teams/{teamId}/schedule
 */

const { normalizeEvent } = require('../../normalize');
const { verifyVenue } = require('../../venue-verify');

// ESPN team configs: [espnSport, espnLeague, espnTeamId, scscTeamId, venueId, league, sport, gender, price, ticketUrl]
const ESPN_TEAMS = [
  {
    espnSport: 'basketball',
    espnLeague: 'nba',
    espnTeamId: '13',        // Lakers
    scscTeamId: 'la-lakers',
    venueId: 'crypto-arena',
    league: 'NBA',
    sport: 'basketball',
    gender: 'mens',
    price: 'over_50',
    ticketUrl: 'https://www.nba.com/lakers/tickets',
  },
  {
    espnSport: 'basketball',
    espnLeague: 'nba',
    espnTeamId: '12',        // Clippers
    scscTeamId: 'la-clippers',
    venueId: 'intuit-dome',
    league: 'NBA',
    sport: 'basketball',
    gender: 'mens',
    price: 'over_50',
    ticketUrl: 'https://www.nba.com/clippers/tickets',
  },
  {
    espnSport: 'basketball',
    espnLeague: 'wnba',
    espnTeamId: '14',        // Sparks
    scscTeamId: 'la-sparks',
    venueId: 'crypto-arena',
    league: 'WNBA',
    sport: 'basketball',
    gender: 'womens',
    price: 'under_50',
    ticketUrl: 'https://www.wnba.com/sparks/tickets',
  },
  {
    espnSport: 'soccer',
    espnLeague: 'mls',
    espnTeamId: '19269',     // LAFC
    scscTeamId: 'lafc',
    venueId: 'bmo-stadium',
    league: 'MLS',
    sport: 'soccer',
    gender: 'mens',
    price: 'under_50',
    ticketUrl: 'https://www.lafc.com/tickets',
  },
  {
    espnSport: 'soccer',
    espnLeague: 'mls',
    espnTeamId: '9',         // LA Galaxy
    scscTeamId: 'la-galaxy',
    venueId: 'dignity-health-sports-park',
    league: 'MLS',
    sport: 'soccer',
    gender: 'mens',
    price: 'under_50',
    ticketUrl: 'https://www.lagalaxy.com/tickets',
  },
  {
    espnSport: 'soccer',
    espnLeague: 'nwsl',
    espnTeamId: '19788',     // Angel City FC
    scscTeamId: 'angel-city-fc',
    venueId: 'bmo-stadium',
    league: 'NWSL',
    sport: 'soccer',
    gender: 'womens',
    price: 'under_50',
    ticketUrl: 'https://www.angelcityfc.com/tickets',
  },
  {
    espnSport: 'football',
    espnLeague: 'nfl',
    espnTeamId: '14',        // Rams
    scscTeamId: 'la-rams',
    venueId: 'sofi-stadium',
    league: 'NFL',
    sport: 'football',
    gender: 'mens',
    price: 'over_50',
    ticketUrl: 'https://www.therams.com/tickets',
  },
  {
    espnSport: 'football',
    espnLeague: 'nfl',
    espnTeamId: '24',        // Chargers
    scscTeamId: 'la-chargers',
    venueId: 'sofi-stadium',
    league: 'NFL',
    sport: 'football',
    gender: 'mens',
    price: 'over_50',
    ticketUrl: 'https://www.chargers.com/tickets',
  },
];

async function fetchESPNTeam(teamConfig, startDate, endDate) {
  const { espnSport, espnLeague, espnTeamId, scscTeamId, venueId, league, sport, gender, price, ticketUrl } = teamConfig;
  const url =
    `https://site.api.espn.com/apis/site/v2/sports/${espnSport}/${espnLeague}/teams/${espnTeamId}/schedule`;

  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`ESPN API error for ${scscTeamId}: ${res.status}`);
    return [];
  }
  const data = await res.json();

  const start = new Date(startDate);
  const end = new Date(endDate);
  const events = [];

  for (const event of data.events || []) {
    const competition = event.competitions?.[0];
    if (!competition) continue;

    const gameDate = new Date(event.date);
    if (gameDate < start || gameDate > end) continue;

    // Only home games
    const homeComp = competition.competitors?.find(c => c.homeAway === 'home');
    if (!homeComp || homeComp.team?.id !== espnTeamId) continue;

    const awayComp = competition.competitors?.find(c => c.homeAway === 'away');
    const awayName = awayComp?.team?.displayName || 'Visitor';

    // Extract actual venue data from ESPN API
    const espnVenue = competition.venue;
    const espnVenueName = espnVenue?.fullName || espnVenue?.shortName || null;
    const espnVenueCity = espnVenue?.address?.city || null;
    const espnVenueState = espnVenue?.address?.state || null;
    const isNeutralSiteFlag = competition.neutralSite === true;

    const verification = verifyVenue({
      espnVenueName,
      espnVenueCity,
      espnVenueState,
      defaultVenueId: venueId,
      isNeutralSiteFlag,
    });

    if (verification.excluded) {
      console.log(`[espn-pro] Excluding ${scscTeamId} event: ${awayName} — ${verification.excludeReason}`);
      continue;
    }

    events.push(
      normalizeEvent({
        homeTeamId: scscTeamId,
        awayTeamId: null,
        sport,
        level: 'pro',
        gender,
        dateTime: event.date,
        endTime: null,
        venueId: verification.venueId,
        venueSourceName: verification.venueSourceName,
        venueConfidence: verification.venueConfidence,
        isNeutralSite: verification.isNeutralSite,
        eventName: `${awayName} at ${data.team?.displayName || scscTeamId}`,
        ticketUrl,
        price,
        conference: null,
        league,
        source: 'espn-api',
      })
    );
  }

  return events;
}

async function fetchAllESPN(startDate, endDate) {
  const results = await Promise.allSettled(
    ESPN_TEAMS.map(t => fetchESPNTeam(t, startDate, endDate))
  );

  const events = [];
  for (const result of results) {
    if (result.status === 'fulfilled') events.push(...result.value);
    else console.warn('ESPN fetch failed:', result.reason?.message);
  }
  return events;
}

module.exports = { fetchAllESPN };
