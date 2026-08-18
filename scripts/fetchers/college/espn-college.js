/**
 * espn-college.js — ESPN secondary source for D1 college teams (USC, UCLA)
 *
 * Used to cross-reference against composite schedule scrapers.
 * University composite schedule takes precedence in merge.js.
 * ESPN fills gaps (ticket links, missing events).
 *
 * Only D1 teams with ESPN coverage: USC, UCLA, CSUN, Long Beach State
 */

const { normalizeEvent } = require('../../normalize');
const { verifyVenue } = require('../../venue-verify');

const ESPN_COLLEGE_TEAMS = [
  // --- Football ---
  {
    espnSport: 'football',
    espnLeague: 'college-football',
    espnTeamId: '30',
    scscTeamId: 'usc-trojans',
    schoolId: 'usc',
    name: 'USC Trojans',
    defaultVenueId: 'la-memorial-coliseum',
    price: 'under_50',
  },
  {
    espnSport: 'football',
    espnLeague: 'college-football',
    espnTeamId: '26',
    scscTeamId: 'ucla-bruins',
    schoolId: 'ucla',
    name: 'UCLA Bruins',
    defaultVenueId: 'rose-bowl',
    price: 'under_50',
  },
  // --- Men's Basketball ---
  {
    espnSport: 'basketball',
    espnLeague: 'mens-college-basketball',
    espnTeamId: '30',
    scscTeamId: 'usc-trojans',
    schoolId: 'usc',
    name: 'USC Trojans',
    defaultVenueId: 'galen-center',
    price: 'under_50',
  },
  {
    espnSport: 'basketball',
    espnLeague: 'mens-college-basketball',
    espnTeamId: '26',
    scscTeamId: 'ucla-bruins',
    schoolId: 'ucla',
    name: 'UCLA Bruins',
    defaultVenueId: 'pauley-pavilion',
    price: 'under_50',
  },
  {
    espnSport: 'basketball',
    espnLeague: 'mens-college-basketball',
    espnTeamId: '2463',
    scscTeamId: 'csun-matadors',
    schoolId: 'csun',
    name: 'CSUN Matadors',
    defaultVenueId: 'matadome',
    price: 'under_20',
  },
  {
    espnSport: 'basketball',
    espnLeague: 'mens-college-basketball',
    espnTeamId: '299',
    scscTeamId: 'long-beach-state-49ers',
    schoolId: 'lbsu',
    name: 'Long Beach State 49ers',
    defaultVenueId: 'walter-pyramid',
    price: 'under_20',
  },
  {
    espnSport: 'basketball',
    espnLeague: 'mens-college-basketball',
    espnTeamId: '2239',
    scscTeamId: 'csuf-titans',
    schoolId: 'csuf',
    name: 'Cal State Fullerton Titans',
    defaultVenueId: 'csuf-athletics',
    price: 'under_20',
  },
  {
    espnSport: 'basketball',
    espnLeague: 'mens-college-basketball',
    espnTeamId: '2350',
    scscTeamId: 'lmu-lions',
    schoolId: 'lmu',
    name: 'LMU Lions',
    defaultVenueId: 'gersten-pavilion',
    price: 'under_20',
  },
  {
    espnSport: 'basketball',
    espnLeague: 'mens-college-basketball',
    espnTeamId: '2492',
    scscTeamId: 'pepperdine-waves',
    schoolId: 'pepperdine',
    name: 'Pepperdine Waves',
    defaultVenueId: 'firestone-fieldhouse',
    price: 'under_20',
  },
  // --- Women's Basketball ---
  {
    espnSport: 'basketball',
    espnLeague: 'womens-college-basketball',
    espnTeamId: '30',
    scscTeamId: 'usc-trojans',
    schoolId: 'usc',
    name: 'USC Trojans',
    defaultVenueId: 'galen-center',
    price: 'under_50',
  },
  {
    espnSport: 'basketball',
    espnLeague: 'womens-college-basketball',
    espnTeamId: '26',
    scscTeamId: 'ucla-bruins',
    schoolId: 'ucla',
    name: 'UCLA Bruins',
    defaultVenueId: 'pauley-pavilion',
    price: 'under_50',
  },
  // --- Baseball ---
  {
    espnSport: 'baseball',
    espnLeague: 'college-baseball',
    espnTeamId: '30',
    scscTeamId: 'usc-trojans',
    schoolId: 'usc',
    name: 'USC Trojans',
    defaultVenueId: 'galen-center',
    price: 'under_20',
  },
  {
    espnSport: 'baseball',
    espnLeague: 'college-baseball',
    espnTeamId: '26',
    scscTeamId: 'ucla-bruins',
    schoolId: 'ucla',
    name: 'UCLA Bruins',
    defaultVenueId: 'pauley-pavilion',
    price: 'under_20',
  },
  {
    espnSport: 'baseball',
    espnLeague: 'college-baseball',
    espnTeamId: '2239',
    scscTeamId: 'csuf-titans',
    schoolId: 'csuf',
    name: 'Cal State Fullerton Titans',
    defaultVenueId: 'csuf-athletics',
    price: 'under_20',
  },
  {
    espnSport: 'baseball',
    espnLeague: 'college-baseball',
    espnTeamId: '299',
    scscTeamId: 'long-beach-state-49ers',
    schoolId: 'lbsu',
    name: 'Long Beach State 49ers',
    defaultVenueId: 'walter-pyramid',
    price: 'under_20',
  },
  // --- Women's Volleyball ---
  {
    espnSport: 'volleyball',
    espnLeague: 'womens-college-volleyball',
    espnTeamId: '30',
    scscTeamId: 'usc-trojans',
    schoolId: 'usc',
    name: 'USC Trojans',
    defaultVenueId: 'galen-center',
    price: 'under_20',
  },
  {
    espnSport: 'volleyball',
    espnLeague: 'womens-college-volleyball',
    espnTeamId: '26',
    scscTeamId: 'ucla-bruins',
    schoolId: 'ucla',
    name: 'UCLA Bruins',
    defaultVenueId: 'pauley-pavilion',
    price: 'under_20',
  },
  {
    espnSport: 'volleyball',
    espnLeague: 'womens-college-volleyball',
    espnTeamId: '299',
    scscTeamId: 'long-beach-state-49ers',
    schoolId: 'lbsu',
    name: 'Long Beach State 49ers',
    defaultVenueId: 'walter-pyramid',
    price: 'under_20',
  },
  // --- Men's Soccer ---
  {
    espnSport: 'soccer',
    espnLeague: 'mens-college-soccer',
    espnTeamId: '30',
    scscTeamId: 'usc-trojans',
    schoolId: 'usc',
    name: 'USC Trojans',
    defaultVenueId: 'galen-center',
    price: 'under_20',
  },
  {
    espnSport: 'soccer',
    espnLeague: 'mens-college-soccer',
    espnTeamId: '26',
    scscTeamId: 'ucla-bruins',
    schoolId: 'ucla',
    name: 'UCLA Bruins',
    defaultVenueId: 'pauley-pavilion',
    price: 'under_20',
  },
  // --- Women's Soccer ---
  {
    espnSport: 'soccer',
    espnLeague: 'womens-college-soccer',
    espnTeamId: '30',
    scscTeamId: 'usc-trojans',
    schoolId: 'usc',
    name: 'USC Trojans',
    defaultVenueId: 'galen-center',
    price: 'under_20',
  },
  {
    espnSport: 'soccer',
    espnLeague: 'womens-college-soccer',
    espnTeamId: '26',
    scscTeamId: 'ucla-bruins',
    schoolId: 'ucla',
    name: 'UCLA Bruins',
    defaultVenueId: 'pauley-pavilion',
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

    // Extract actual venue data from ESPN API (instead of ignoring it)
    const espnVenue = competition.venue;
    const espnVenueName = espnVenue?.fullName || espnVenue?.shortName || null;
    const espnVenueCity = espnVenue?.address?.city || null;
    const espnVenueState = espnVenue?.address?.state || null;
    const isNeutralSiteFlag = competition.neutralSite === true;

    // Run venue verification against ESPN data
    const verification = verifyVenue({
      espnVenueName,
      espnVenueCity,
      espnVenueState,
      defaultVenueId: config.defaultVenueId,
      isNeutralSiteFlag,
    });

    // Skip events confirmed to be outside LA County
    if (verification.excluded) {
      console.log(`[espn-college] Excluding ${config.name} event: ${awayName} — ${verification.excludeReason}`);
      continue;
    }

    events.push(
      normalizeEvent({
        homeTeamId: config.scscTeamId,
        awayTeamId: null,
        sport: sportRaw,
        level: 'college',
        dateTime: event.date,
        endTime: null,
        venueId: verification.venueId,
        venueSourceName: verification.venueSourceName,
        venueConfidence: verification.venueConfidence,
        isNeutralSite: verification.isNeutralSite,
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
