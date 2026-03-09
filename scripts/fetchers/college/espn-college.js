/**
 * espn-college.js — ESPN secondary source for D1 college teams (USC, UCLA)
 *
 * Used to cross-reference against composite schedule scrapers.
 * University composite schedule takes precedence in merge.js.
 * ESPN fills gaps (ticket links, missing events).
 *
 * Only D1 teams with ESPN coverage: USC, UCLA, CSUN, Long Beach State
 */

const { normalizeEvent, normalizeSport, inferGender } = require('../../normalize');

const ESPN_COLLEGE_TEAMS = [
  {
    espnSport: 'basketball',
    espnLeague: 'mens-college-basketball',
    espnTeamId: '30',
    scscTeamId: 'usc-trojans',
    schoolId: 'usc',
    name: 'USC Trojans',
    defaultVenueId: 'usc-campus',
    price: 'under_50',
  },
  {
    espnSport: 'basketball',
    espnLeague: 'mens-college-basketball',
    espnTeamId: '26',
    scscTeamId: 'ucla-bruins',
    schoolId: 'ucla',
    name: 'UCLA Bruins',
    defaultVenueId: 'ucla-campus',
    price: 'under_50',
  },
  {
    espnSport: 'basketball',
    espnLeague: 'womens-college-basketball',
    espnTeamId: '30',
    scscTeamId: 'usc-trojans',
    schoolId: 'usc',
    name: 'USC Trojans',
    defaultVenueId: 'usc-campus',
    price: 'under_50',
  },
  {
    espnSport: 'basketball',
    espnLeague: 'womens-college-basketball',
    espnTeamId: '26',
    scscTeamId: 'ucla-bruins',
    schoolId: 'ucla',
    name: 'UCLA Bruins',
    defaultVenueId: 'ucla-campus',
    price: 'under_50',
  },
  {
    espnSport: 'baseball',
    espnLeague: 'college-baseball',
    espnTeamId: '30',
    scscTeamId: 'usc-trojans',
    schoolId: 'usc',
    name: 'USC Trojans',
    defaultVenueId: 'usc-campus',
    price: 'under_20',
  },
  {
    espnSport: 'baseball',
    espnLeague: 'college-baseball',
    espnTeamId: '26',
    scscTeamId: 'ucla-bruins',
    schoolId: 'ucla',
    name: 'UCLA Bruins',
    defaultVenueId: 'ucla-campus',
    price: 'under_20',
  },
];

async function fetchESPNCollegeTeam(config, startDate, endDate) {
  const url =
    `https://site.api.espn.com/apis/site/v2/sports/${config.espnSport}/${config.espnLeague}/teams/${config.espnTeamId}/schedule`;

  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`[espn-college] ${config.name} ${config.espnLeague}: HTTP ${res.status}`);
    return [];
  }
  const data = await res.json();

  const start = new Date(startDate);
  const end = new Date(endDate);
  const events = [];

  for (const event of data.events || []) {
    const gameDate = new Date(event.date);
    if (isNaN(gameDate) || gameDate < start || gameDate > end) continue;

    const competition = event.competitions?.[0];
    if (!competition) continue;

    // Only home games
    const homeComp = competition.competitors?.find(c => c.homeAway === 'home');
    if (!homeComp || homeComp.team?.id !== config.espnTeamId) continue;

    const awayComp = competition.competitors?.find(c => c.homeAway === 'away');
    const awayName = awayComp?.team?.displayName || 'Opponent';

    const sportRaw = config.espnLeague.includes('women') ? `womens-${config.espnSport}` : `mens-${config.espnSport}`;

    events.push(
      normalizeEvent({
        homeTeamId: config.scscTeamId,
        awayTeamId: null,
        sport: sportRaw,
        level: 'college',
        gender: inferGender(sportRaw, null),
        dateTime: event.date,
        endTime: null,
        venueId: competition.venue?.id ? `espn-venue-${competition.venue.id}` : config.defaultVenueId,
        eventName: `${awayName} at ${config.name}`,
        ticketUrl: event.links?.[0]?.href || null,
        price: config.price,
        conference: null,
        league: null,
        source: 'espn-api',
        idSuffix: config.espnLeague,
      })
    );
  }

  return events;
}

async function fetchAllESPNCollege(startDate, endDate) {
  const results = await Promise.allSettled(
    ESPN_COLLEGE_TEAMS.map(t => fetchESPNCollegeTeam(t, startDate, endDate))
  );

  const events = [];
  for (const result of results) {
    if (result.status === 'fulfilled') events.push(...result.value);
    else console.warn('[espn-college] fetch failed:', result.reason?.message);
  }
  return events;
}

module.exports = { fetchAllESPNCollege };
