/**
 * scraper.js — college composite schedules (primary college source).
 *
 * The schools' SIDEARM sites render the composite schedule client-side, so
 * these go through the same browser scraper and parsers as the JuCo sites.
 * No proxy: plain requests from GitHub Actions reach these sites (the old
 * /composite-schedule URLs answered 404 rather than a bot-block 405).
 */

const { scrapeSidearmSchools } = require('../juco/scraper');

/**
 * School configs — composite schedule URLs and metadata.
 * scheduleUrl: the full URL to the school's composite schedule page
 * platform: 'sidearm' | 'presto' | 'generic'
 * scscTeamPrefix: maps to team IDs like 'usc-trojans', 'ucla-bruins', etc.
 */
const COLLEGE_SCHOOLS = [
  {
    id: 'usc',
    name: 'USC Trojans',
    scscTeamId: 'usc-trojans',
    scheduleUrl: 'https://usctrojans.com/composite',
    platform: 'sidearm',
    level: 'college',
    defaultVenueId: 'galen-center',
    ticketUrl: 'https://usctrojans.com/tickets',
    price: 'under_50',
  },
  {
    id: 'ucla',
    name: 'UCLA Bruins',
    scscTeamId: 'ucla-bruins',
    scheduleUrl: 'https://uclabruins.com/composite',
    platform: 'sidearm',
    level: 'college',
    defaultVenueId: 'pauley-pavilion',
    ticketUrl: 'https://uclabruins.com/tickets',
    price: 'under_50',
  },
  {
    id: 'pepperdine',
    name: 'Pepperdine Waves',
    scscTeamId: 'pepperdine-waves',
    scheduleUrl: 'https://pepperdinewaves.com/composite',
    platform: 'sidearm',
    level: 'college',
    defaultVenueId: 'firestone-fieldhouse',
    ticketUrl: 'https://pepperdinewaves.com/tickets',
    price: 'under_20',
  },
  {
    id: 'lmu',
    name: 'LMU Lions',
    scscTeamId: 'lmu-lions',
    scheduleUrl: 'https://lmulions.com/composite',
    platform: 'sidearm',
    level: 'college',
    defaultVenueId: 'gersten-pavilion',
    ticketUrl: 'https://lmulions.com/tickets',
    price: 'under_20',
  },
  {
    id: 'csun',
    name: 'CSUN Matadors',
    scscTeamId: 'csun-matadors',
    scheduleUrl: 'https://gomatadors.com/composite',
    platform: 'sidearm',
    level: 'college',
    defaultVenueId: 'matadome',
    ticketUrl: 'https://gomatadors.com/tickets',
    price: 'under_20',
  },
  {
    id: 'lbsu',
    name: 'Long Beach State 49ers',
    scscTeamId: 'long-beach-state-49ers',
    scheduleUrl: 'https://longbeachstate.com/composite',
    platform: 'sidearm',
    level: 'college',
    defaultVenueId: 'walter-pyramid',
    ticketUrl: 'https://longbeachstate.com/tickets',
    price: 'under_20',
  },
  {
    id: 'csuf',
    name: 'Cal State Fullerton Titans',
    scscTeamId: 'csuf-titans',
    scheduleUrl: 'https://fullertontitans.com/composite',
    platform: 'sidearm',
    level: 'college',
    defaultVenueId: 'csuf-athletics',
    ticketUrl: 'https://fullertontitans.com/tickets',
    price: 'under_20',
  },
  {
    id: 'cal-poly-pomona',
    name: 'Cal Poly Pomona Broncos',
    scscTeamId: 'cal-poly-pomona-broncos',
    scheduleUrl: 'https://athletics.cpp.edu/composite',
    platform: 'generic',
    level: 'college',
    defaultVenueId: 'cal-poly-pomona-kellogg-gym',
    ticketUrl: null,
    price: 'free',
  },
  {
    id: 'cal-state-la',
    name: 'Cal State LA Golden Eagles',
    scscTeamId: 'calstate-la-eagles',
    scheduleUrl: 'https://calstatelaeagles.com/composite',
    platform: 'sidearm',
    level: 'college',
    defaultVenueId: 'calstate-la-athletics',
    ticketUrl: 'https://calstatelaeagles.com/tickets',
    price: 'free',
  },
  {
    id: 'csudh',
    name: 'Cal State Dominguez Hills Toros',
    scscTeamId: 'csudh-toros',
    scheduleUrl: 'https://csudhtoros.com/composite',
    platform: 'sidearm',
    level: 'college',
    defaultVenueId: 'csudh-athletics',
    ticketUrl: null,
    price: 'free',
  },
  {
    id: 'pomona-pitzer',
    name: 'Pomona-Pitzer Sagehens',
    scscTeamId: 'pomona-pitzer-sagehens',
    scheduleUrl: 'https://sagehens.com/composite',
    platform: 'sidearm',
    level: 'college',
    defaultVenueId: 'pomona-pitzer-athletics',
    ticketUrl: null,
    price: 'free',
  },
  {
    id: 'occidental',
    name: 'Occidental College Tigers',
    scscTeamId: 'occidental-tigers',
    scheduleUrl: 'https://www.occidentaltigers.com/composite',
    platform: 'presto',
    level: 'college',
    defaultVenueId: 'occidental-athletics',
    ticketUrl: null,
    price: 'free',
  },
];

async function scrapeAllColleges(startDate, endDate) {
  const events = await scrapeSidearmSchools(COLLEGE_SCHOOLS, startDate, endDate);
  // The shared parsers tag events as JuCo; college sites rank higher in merge.
  return events.map(e => ({ ...e, source: e.source.replace(/^juco-scraper:/, 'university-scraper:') }));
}

function combineCollegeSources(composite, espn) {
  // ESPN and the school's own site give the same game different IDs. Match on
  // team + sport + gender + day: the school's data wins, but it takes over the
  // ESPN row's ID so that row is updated in place instead of duplicated.
  const key = e => `${e.homeTeam}|${e.sport}|${e.gender}|${e.dateTime.slice(0, 10)}`;
  const espnByKey = new Map(espn.map(e => [key(e), e]));
  const events = composite.map(e => {
    const match = espnByKey.get(key(e));
    if (!match) return e;
    espnByKey.delete(key(e));
    return { ...e, id: match.id, ticketUrl: e.ticketUrl || match.ticketUrl };
  });
  events.push(...espnByKey.values());
  return events;
}

module.exports = { scrapeAllColleges, combineCollegeSources, COLLEGE_SCHOOLS };
