/**
 * scraper.js — Shared college composite schedule scraper
 *
 * Most college athletic sites run on Sidearm Sports or PrestoSports platforms.
 * Both render composite schedule pages with consistent HTML/JSON structures.
 * This module handles both, with a fallback generic HTML parser.
 *
 * Usage:
 *   const events = await scrapeComposite(schoolConfig, startDate, endDate);
 */

const { normalizeEvent, normalizeSport, inferGender } = require('../../normalize');

/**
 * School configs — composite schedule URLs and metadata.
 * compositeUrl: the full URL to the school's composite schedule page
 * platform: 'sidearm' | 'presto' | 'generic'
 * scscTeamPrefix: maps to team IDs like 'usc-trojans', 'ucla-bruins', etc.
 */
const COLLEGE_SCHOOLS = [
  {
    id: 'usc',
    name: 'USC Trojans',
    scscTeamId: 'usc-trojans',
    compositeUrl: 'https://usctrojans.com/composite-schedule',
    espnTeamId: '30',
    platform: 'sidearm',
    level: 'college',
    defaultVenueId: 'usc-campus',
    ticketUrl: 'https://usctrojans.com/tickets',
    price: 'under_50',
  },
  {
    id: 'ucla',
    name: 'UCLA Bruins',
    scscTeamId: 'ucla-bruins',
    compositeUrl: 'https://uclabruins.com/composite-schedule',
    espnTeamId: '26',
    platform: 'sidearm',
    level: 'college',
    defaultVenueId: 'ucla-campus',
    ticketUrl: 'https://uclabruins.com/tickets',
    price: 'under_50',
  },
  {
    id: 'pepperdine',
    name: 'Pepperdine Waves',
    scscTeamId: 'pepperdine-waves',
    compositeUrl: 'https://pepperdinewaves.com/composite-schedule',
    espnTeamId: null, // Pepperdine not tracked via ESPN college API
    platform: 'sidearm',
    level: 'college',
    defaultVenueId: 'pepperdine-campus',
    ticketUrl: 'https://pepperdinewaves.com/tickets',
    price: 'under_20',
  },
  {
    id: 'lmu',
    name: 'LMU Lions',
    scscTeamId: 'lmu-lions',
    compositeUrl: 'https://lmulions.com/composite-schedule',
    espnTeamId: null,
    platform: 'sidearm',
    level: 'college',
    defaultVenueId: 'lmu-campus',
    ticketUrl: 'https://lmulions.com/tickets',
    price: 'under_20',
  },
  {
    id: 'csun',
    name: 'CSUN Matadors',
    scscTeamId: 'csun-matadors',
    compositeUrl: 'https://gomatadors.com/composite-schedule',
    espnTeamId: null,
    platform: 'sidearm',
    level: 'college',
    defaultVenueId: 'csun-campus',
    ticketUrl: 'https://gomatadors.com/tickets',
    price: 'under_20',
  },
  {
    id: 'lbsu',
    name: 'Long Beach State 49ers',
    scscTeamId: 'long-beach-state-49ers',
    compositeUrl: 'https://longbeachstate.com/composite-schedule',
    espnTeamId: null,
    platform: 'sidearm',
    level: 'college',
    defaultVenueId: 'lbsu-campus',
    ticketUrl: 'https://longbeachstate.com/tickets',
    price: 'under_20',
  },
  {
    id: 'cal-poly-pomona',
    name: 'Cal Poly Pomona Broncos',
    scscTeamId: 'cal-poly-pomona-broncos',
    compositeUrl: 'https://athletics.cpp.edu/composite-schedule',
    espnTeamId: null,
    platform: 'generic',
    level: 'college',
    defaultVenueId: 'cpp-campus',
    ticketUrl: null,
    price: 'free',
  },
  {
    id: 'cal-state-la',
    name: 'Cal State LA Golden Eagles',
    scscTeamId: 'calstate-la-eagles',
    compositeUrl: 'https://calstatelaeagles.com/composite-schedule',
    espnTeamId: null,
    platform: 'sidearm',
    level: 'college',
    defaultVenueId: 'calstatela-campus',
    ticketUrl: 'https://calstatelaeagles.com/tickets',
    price: 'free',
  },
  {
    id: 'csudh',
    name: 'Cal State Dominguez Hills Toros',
    scscTeamId: 'csudh-toros',
    compositeUrl: 'https://csudhtoros.com/composite-schedule',
    espnTeamId: null,
    platform: 'sidearm',
    level: 'college',
    defaultVenueId: 'csudh-campus',
    ticketUrl: null,
    price: 'free',
  },
  {
    id: 'pomona-pitzer',
    name: 'Pomona-Pitzer Sagehens',
    scscTeamId: 'pomona-pitzer-sagehens',
    compositeUrl: 'https://sagehens.com/composite-schedule',
    espnTeamId: null,
    platform: 'sidearm',
    level: 'college',
    defaultVenueId: 'pomona-pitzer-campus',
    ticketUrl: null,
    price: 'free',
  },
  {
    id: 'occidental',
    name: 'Occidental College Tigers',
    scscTeamId: 'occidental-tigers',
    compositeUrl: 'https://www.occidentaltigers.com/composite-schedule',
    espnTeamId: null,
    platform: 'presto',
    level: 'college',
    defaultVenueId: 'occidental-campus',
    ticketUrl: null,
    price: 'free',
  },
];

/**
 * Parse a Sidearm Sports composite schedule page.
 * Sidearm renders schedule data in a <script id="__NEXT_DATA__"> JSON block
 * or in structured <li class="sidearm-schedule-game"> elements.
 *
 * We try the JSON approach first (more reliable), fall back to HTML parsing.
 */
async function parseSidearm(html, school, startDate, endDate) {
  const events = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Attempt 1: Extract JSON from __NEXT_DATA__ (newer Sidearm sites)
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextDataMatch) {
    try {
      const json = JSON.parse(nextDataMatch[1]);
      // Navigate the Next.js page props structure to find schedule items
      const props = json?.props?.pageProps;
      const scheduleItems = props?.schedule || props?.events || props?.games || [];
      for (const item of scheduleItems) {
        const ev = parseSidearmItem(item, school, start, end);
        if (ev) events.push(ev);
      }
      if (events.length > 0) return events;
    } catch {
      // fall through to HTML parsing
    }
  }

  // Attempt 2: Parse HTML <li> game elements (classic Sidearm)
  // Pattern: <li class="sidearm-schedule-game ...">
  const gameBlocks = html.matchAll(/<li[^>]+class="[^"]*sidearm-schedule-game[^"]*"[^>]*>([\s\S]*?)<\/li>/g);
  for (const [, block] of gameBlocks) {
    const ev = parseSidearmBlock(block, school, start, end);
    if (ev) events.push(ev);
  }

  return events;
}

function parseSidearmItem(item, school, start, end) {
  try {
    const rawDate = item.date || item.gameDate || item.startDate;
    if (!rawDate) return null;
    const gameDate = new Date(rawDate);
    if (isNaN(gameDate) || gameDate < start || gameDate > end) return null;

    const sportRaw = item.sport?.name || item.sportName || item.sport || 'other';
    const opponent = item.opponent?.name || item.opponentName || item.awayTeam || 'Opponent';
    const isHome = item.homeAway === 'home' || item.location === 'home' || !item.isAway;
    if (!isHome) return null;

    const venue = item.venue?.name || item.venueName || school.defaultVenueId;
    const venueId = slugify(venue) || school.defaultVenueId;

    return normalizeEvent({
      homeTeamId: school.scscTeamId,
      awayTeamId: null,
      sport: sportRaw,
      level: school.level,
      gender: inferGender(sportRaw, item.gender),
      dateTime: gameDate.toISOString(),
      endTime: null,
      venueId,
      eventName: `${opponent} at ${school.name}`,
      ticketUrl: item.ticketUrl || school.ticketUrl || null,
      price: school.price,
      conference: item.conference || null,
      league: null,
      source: `${school.id}-composite`,
    });
  } catch {
    return null;
  }
}

function parseSidearmBlock(block, school, start, end) {
  try {
    // Extract date from data attributes or datetime elements
    const dateMatch = block.match(/data-date="([^"]+)"|<time[^>]*datetime="([^"]+)"/);
    if (!dateMatch) return null;
    const rawDate = dateMatch[1] || dateMatch[2];
    const gameDate = new Date(rawDate);
    if (isNaN(gameDate) || gameDate < start || gameDate > end) return null;

    // Check home/away
    if (/sidearm-schedule-game-away|data-home-away="away"/.test(block)) return null;

    // Extract opponent
    const opponentMatch = block.match(/class="[^"]*opponent[^"]*"[^>]*>([^<]+)</);
    const opponent = opponentMatch ? opponentMatch[1].trim() : 'Opponent';

    // Extract sport
    const sportMatch = block.match(/data-sport="([^"]+)"/);
    const sportRaw = sportMatch ? sportMatch[1] : 'other';

    return normalizeEvent({
      homeTeamId: school.scscTeamId,
      awayTeamId: null,
      sport: sportRaw,
      level: school.level,
      gender: inferGender(sportRaw, null),
      dateTime: gameDate.toISOString(),
      endTime: null,
      venueId: school.defaultVenueId,
      eventName: `${opponent} at ${school.name}`,
      ticketUrl: school.ticketUrl || null,
      price: school.price,
      conference: null,
      league: null,
      source: `${school.id}-composite`,
    });
  } catch {
    return null;
  }
}

/**
 * Parse a PrestoSports composite schedule page.
 * PrestoSports embeds schedule data as JSON in a <script type="application/ld+json"> block
 * or in a structured table.
 */
async function parsePresto(html, school, startDate, endDate) {
  const events = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Try JSON-LD structured data
  const ldMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
  for (const [, json] of ldMatches) {
    try {
      const data = JSON.parse(json);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item['@type'] !== 'SportsEvent') continue;
        const gameDate = new Date(item.startDate);
        if (isNaN(gameDate) || gameDate < start || gameDate > end) continue;

        const location = item.location?.name || school.defaultVenueId;
        const awayOrg = item.awayTeam?.name || item.competitor?.name || 'Opponent';
        const sportRaw = item.sport || 'other';

        events.push(normalizeEvent({
          homeTeamId: school.scscTeamId,
          awayTeamId: null,
          sport: sportRaw,
          level: school.level,
          gender: inferGender(sportRaw, null),
          dateTime: gameDate.toISOString(),
          endTime: item.endDate ? new Date(item.endDate).toISOString() : null,
          venueId: slugify(location) || school.defaultVenueId,
          eventName: `${awayOrg} at ${school.name}`,
          ticketUrl: item.url || school.ticketUrl || null,
          price: school.price,
          conference: null,
          league: null,
          source: `${school.id}-composite`,
        }));
      }
    } catch {
      continue;
    }
  }

  return events;
}

/**
 * Generic HTML parser — fallback for schools not on Sidearm/PrestoSports.
 * Looks for common schedule table patterns.
 */
async function parseGeneric(html, school, startDate, endDate) {
  const events = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  // Generic platform is not yet implemented — no events will be produced.
  // Schools using platform: 'generic' require a custom parser.
  console.warn(`[${school.id}] platform 'generic' has no parser — 0 events returned. Add a custom parser for ${school.compositeUrl}`);

  return events;
}

function slugify(str) {
  if (!str) return '';
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Fetch and parse a school's composite schedule page.
 */
async function scrapeComposite(school, startDate, endDate) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(school.compositeUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SCSC-Bot/1.0; +https://github.com/SCSC)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!res.ok) {
      console.warn(`[${school.id}] HTTP ${res.status} for ${school.compositeUrl}`);
      return [];
    }

    const html = await res.text();

    switch (school.platform) {
      case 'sidearm': return parseSidearm(html, school, startDate, endDate);
      case 'presto':  return parsePresto(html, school, startDate, endDate);
      default:        return parseGeneric(html, school, startDate, endDate);
    }
  } catch (err) {
    const msg = err.name === 'AbortError' ? 'timed out after 15s' : err.message;
    console.warn(`[${school.id}] Scrape failed: ${msg}`);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Scrape all college schools.
 */
async function scrapeAllColleges(startDate, endDate) {
  const results = await Promise.allSettled(
    COLLEGE_SCHOOLS.map(school => scrapeComposite(school, startDate, endDate))
  );

  const events = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const school = COLLEGE_SCHOOLS[i];
    if (result.status === 'fulfilled') {
      console.log(`[${school.id}] fetched ${result.value.length} events`);
      events.push(...result.value);
    } else {
      console.warn(`[${school.id}] failed: ${result.reason?.message}`);
    }
  }
  return events;
}

module.exports = { scrapeAllColleges, scrapeComposite, COLLEGE_SCHOOLS };
