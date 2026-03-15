/**
 * juco/scraper.js — JuCo schedule scraper for all LA County CCCAA schools
 *
 * CCCAA schools use two main platforms:
 *   1. ArbiterSports/FinalForms — used by many CCC schools
 *   2. School-specific athletic pages (often on Sidearm or custom HTML)
 *
 * Strategy:
 *   - Primary: scrape each school's athletic schedule page
 *   - Fall back to CCCAA conference schedule pages for cross-referencing
 */

const { normalizeEvent, inferGender } = require('../../normalize');
const { verifyVenue } = require('../../venue-verify');

const JUCO_SCHOOLS = [
  {
    id: 'elac',
    name: 'East LA College Huskies',
    scscTeamId: 'elac-huskies',
    scheduleUrl: 'https://www.elac.edu/Student-Services/Associated-Student-Organization/Athletics/Schedule',
    platform: 'generic',
    level: 'juco',
    defaultVenueId: 'elac-campus',
    price: 'free',
  },
  {
    id: 'lacc',
    name: 'LA City College Cubs',
    scscTeamId: 'lacc-cubs',
    scheduleUrl: 'https://www.lacitycollege.edu/Athletics/Schedules',
    platform: 'generic',
    level: 'juco',
    defaultVenueId: 'lacc-campus',
    price: 'free',
  },
  {
    id: 'lavc',
    name: 'LA Valley College Monarchs',
    scscTeamId: 'lavc-monarchs',
    scheduleUrl: 'https://www.lavc.edu/athletics/schedules.aspx',
    platform: 'generic',
    level: 'juco',
    defaultVenueId: 'lavc-campus',
    price: 'free',
  },
  {
    id: 'lapc',
    name: 'LA Pierce College Brahmas',
    scscTeamId: 'lapc-brahmas',
    scheduleUrl: 'https://www.piercecollege.edu/offices/athletics/schedule.asp',
    platform: 'generic',
    level: 'juco',
    defaultVenueId: 'lapc-campus',
    price: 'free',
  },
  {
    id: 'el-camino',
    name: 'El Camino College Warriors',
    scscTeamId: 'el-camino-warriors',
    scheduleUrl: 'https://www.elcaminowarriors.com/composite-schedule',
    platform: 'sidearm',
    level: 'juco',
    defaultVenueId: 'el-camino-campus',
    price: 'free',
  },
  {
    id: 'smc',
    name: 'Santa Monica College Corsairs',
    scscTeamId: 'smc-corsairs',
    scheduleUrl: 'https://www.smccorsairs.com/composite-schedule',
    platform: 'sidearm',
    level: 'juco',
    defaultVenueId: 'smc-campus',
    price: 'free',
  },
  {
    id: 'cerritos',
    name: 'Cerritos College Falcons',
    scscTeamId: 'cerritos-falcons',
    scheduleUrl: 'https://athletics.cerritos.edu/composite-schedule',
    platform: 'sidearm',
    level: 'juco',
    defaultVenueId: 'cerritos-campus',
    price: 'free',
  },
  {
    id: 'mt-sac',
    name: 'Mt. SAC Mounties',
    scscTeamId: 'mt-sac-mounties',
    scheduleUrl: 'https://www.mtsacmounties.com/composite-schedule',
    platform: 'sidearm',
    level: 'juco',
    defaultVenueId: 'mt-sac-campus',
    price: 'free',
  },
  {
    id: 'pcc',
    name: 'Pasadena City College Lancers',
    scscTeamId: 'pcc-lancers',
    scheduleUrl: 'https://www.pcc.edu/athletics/schedule/',
    platform: 'generic',
    level: 'juco',
    defaultVenueId: 'pcc-campus',
    price: 'free',
  },
  {
    id: 'glendale',
    name: 'Glendale CC Vaqueros',
    scscTeamId: 'glendale-vaqueros',
    scheduleUrl: 'https://www.glendalevaqueros.com/composite-schedule',
    platform: 'sidearm',
    level: 'juco',
    defaultVenueId: 'glendale-campus',
    price: 'free',
  },
  {
    id: 'rio-hondo',
    name: 'Rio Hondo College Roadrunners',
    scscTeamId: 'rio-hondo-roadrunners',
    scheduleUrl: 'https://www.riohondoroadrunners.com/composite-schedule',
    platform: 'sidearm',
    level: 'juco',
    defaultVenueId: 'rio-hondo-campus',
    price: 'free',
  },
  {
    id: 'citrus',
    name: 'Citrus College Owls',
    scscTeamId: 'citrus-owls',
    scheduleUrl: 'https://www.citruscollege.edu/studentlife/athletics/Pages/schedule.aspx',
    platform: 'generic',
    level: 'juco',
    defaultVenueId: 'citrus-campus',
    price: 'free',
  },
  {
    id: 'west-la',
    name: 'West LA College Wildcats',
    scscTeamId: 'west-la-wildcats',
    scheduleUrl: 'https://www.wlac.edu/student-services/athletics/',
    platform: 'generic',
    level: 'juco',
    defaultVenueId: 'west-la-campus',
    price: 'free',
  },
  {
    id: 'compton',
    name: 'Compton College Tartars',
    scscTeamId: 'compton-tartars',
    scheduleUrl: 'https://www.compton.edu/studentservices/athletics/',
    platform: 'generic',
    level: 'juco',
    defaultVenueId: 'compton-campus',
    price: 'free',
  },
  {
    id: 'harbor',
    name: 'Harbor College Seahawks',
    scscTeamId: 'harbor-seahawks',
    scheduleUrl: 'https://www.laharbor.edu/student-services/athletics/',
    platform: 'generic',
    level: 'juco',
    defaultVenueId: 'harbor-campus',
    price: 'free',
  },
  {
    id: 'la-southwest',
    name: 'LA Southwest College Cougars',
    scscTeamId: 'lasw-cougars',
    scheduleUrl: 'https://www.lasc.edu/student_services/athletics/',
    platform: 'generic',
    level: 'juco',
    defaultVenueId: 'la-southwest-campus',
    price: 'free',
  },
];

/**
 * Extract games from a Sidearm Sports page (same logic as college scraper).
 */
async function parseSidearmJuco(html, school, start, end) {
  const events = [];

  // Try __NEXT_DATA__ JSON first
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextDataMatch) {
    try {
      const json = JSON.parse(nextDataMatch[1]);
      const scheduleItems =
        json?.props?.pageProps?.schedule ||
        json?.props?.pageProps?.events ||
        json?.props?.pageProps?.games || [];

      for (const item of scheduleItems) {
        const rawDate = item.date || item.gameDate || item.startDate;
        if (!rawDate) continue;
        const gameDate = new Date(rawDate);
        if (isNaN(gameDate) || gameDate < start || gameDate > end) continue;

        const isHome = item.homeAway === 'home' || item.location === 'home' || !item.isAway;
        if (!isHome) continue;

        const sportRaw = item.sport?.name || item.sportName || 'other';
        const opponent = item.opponent?.name || item.opponentName || 'Opponent';

        // Extract venue from source data
        const scrapedVenueName = item.venue?.name || item.venueName || item.location?.name || null;
        const verification = verifyVenue({
          scrapedVenueName,
          defaultVenueId: school.defaultVenueId,
        });

        if (verification.excluded) {
          console.log(`[${school.id}] Excluding event: ${opponent} — ${verification.excludeReason}`);
          continue;
        }

        events.push(normalizeEvent({
          homeTeamId: school.scscTeamId,
          awayTeamId: null,
          sport: sportRaw,
          level: school.level,
          gender: inferGender(sportRaw, item.gender),
          dateTime: gameDate.toISOString(),
          endTime: null,
          venueId: verification.venueId,
          venueSourceName: verification.venueSourceName,
          venueConfidence: verification.venueConfidence,
          isNeutralSite: verification.isNeutralSite,
          eventName: `${opponent} at ${school.name}`,
          ticketUrl: null,
          price: school.price,
          conference: null,
          league: null,
          source: `${school.id}-juco-scraper`,
        }));
      }
      if (events.length > 0) return events;
    } catch { /* fall through */ }
  }

  // Fallback: parse <li class="sidearm-schedule-game"> blocks
  const gameBlocks = html.matchAll(/<li[^>]+class="[^"]*sidearm-schedule-game[^"]*"[^>]*>([\s\S]*?)<\/li>/g);
  for (const [, block] of gameBlocks) {
    if (/sidearm-schedule-game-away|data-home-away="away"/.test(block)) continue;

    const dateMatch = block.match(/data-date="([^"]+)"|<time[^>]*datetime="([^"]+)"/);
    if (!dateMatch) continue;
    const gameDate = new Date(dateMatch[1] || dateMatch[2]);
    if (isNaN(gameDate) || gameDate < start || gameDate > end) continue;

    const opponentMatch = block.match(/class="[^"]*opponent[^"]*"[^>]*>([^<]+)</);
    const opponent = opponentMatch ? opponentMatch[1].trim() : 'Opponent';
    const sportMatch = block.match(/data-sport="([^"]+)"/);
    const sportRaw = sportMatch ? sportMatch[1] : 'other';

    // Try to extract venue from HTML
    const venueMatch = block.match(/class="[^"]*(?:venue|location|facility)[^"]*"[^>]*>([^<]+)/);
    const scrapedVenueName = venueMatch ? venueMatch[1].trim() : null;

    const verification = verifyVenue({
      scrapedVenueName,
      defaultVenueId: school.defaultVenueId,
    });

    if (verification.excluded) {
      console.log(`[${school.id}] Excluding event: ${opponent} — ${verification.excludeReason}`);
      continue;
    }

    events.push(normalizeEvent({
      homeTeamId: school.scscTeamId,
      awayTeamId: null,
      sport: sportRaw,
      level: school.level,
      gender: inferGender(sportRaw, null),
      dateTime: gameDate.toISOString(),
      endTime: null,
      venueId: verification.venueId,
      venueSourceName: verification.venueSourceName,
      venueConfidence: verification.venueConfidence,
      isNeutralSite: verification.isNeutralSite,
      eventName: `${opponent} at ${school.name}`,
      ticketUrl: null,
      price: school.price,
      conference: null,
      league: null,
      source: `${school.id}-juco-scraper`,
    }));
  }

  return events;
}

/**
 * Generic parser for schools without a known platform.
 * Extracts ISO dates and logs for manual review if nothing structured found.
 */
async function parseGenericJuco(html, school, start, end) {
  const events = [];

  // Look for JSON-LD SportsEvent structured data
  const ldMatches = html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g);
  for (const [, json] of ldMatches) {
    try {
      const data = JSON.parse(json);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item['@type'] !== 'SportsEvent') continue;
        const gameDate = new Date(item.startDate);
        if (isNaN(gameDate) || gameDate < start || gameDate > end) continue;

        const awayOrg = item.awayTeam?.name || item.competitor?.name || 'Opponent';
        const sportRaw = item.sport || 'other';

        // Extract venue from JSON-LD structured data
        const scrapedVenueName = item.location?.name || null;
        const venueCity = item.location?.address?.addressLocality || null;
        const venueState = item.location?.address?.addressRegion || null;
        const fullVenueName = [scrapedVenueName, venueCity, venueState].filter(Boolean).join(', ');

        const verification = verifyVenue({
          scrapedVenueName: fullVenueName || scrapedVenueName,
          defaultVenueId: school.defaultVenueId,
        });

        if (verification.excluded) {
          console.log(`[${school.id}] Excluding event: ${awayOrg} — ${verification.excludeReason}`);
          continue;
        }

        events.push(normalizeEvent({
          homeTeamId: school.scscTeamId,
          awayTeamId: null,
          sport: sportRaw,
          level: school.level,
          gender: inferGender(sportRaw, null),
          dateTime: gameDate.toISOString(),
          endTime: null,
          venueId: verification.venueId,
          venueSourceName: verification.venueSourceName,
          venueConfidence: verification.venueConfidence,
          isNeutralSite: verification.isNeutralSite,
          eventName: `${awayOrg} at ${school.name}`,
          ticketUrl: null,
          price: school.price,
          conference: null,
          league: null,
          source: `${school.id}-juco-scraper`,
        }));
      }
    } catch { continue; }
  }

  if (events.length === 0) {
    console.warn(`[${school.id}] No structured data found — manual review recommended for ${school.scheduleUrl}`);
  }

  return events;
}

async function scrapeJucoSchool(school, startDate, endDate) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15_000);
  try {
    const res = await fetch(school.scheduleUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SCSC-Bot/1.0; +https://github.com/SCSC)',
        'Accept': 'text/html,application/xhtml+xml',
      },
    });

    if (!res.ok) {
      console.warn(`[${school.id}] HTTP ${res.status} — ${school.scheduleUrl}`);
      return [];
    }

    const html = await res.text();
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (school.platform === 'sidearm') {
      return parseSidearmJuco(html, school, start, end);
    }
    return parseGenericJuco(html, school, start, end);
  } catch (err) {
    const msg = err.name === 'AbortError' ? 'timed out after 15s' : err.message;
    console.warn(`[${school.id}] Scrape error: ${msg}`);
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function scrapeAllJuco(startDate, endDate) {
  const results = await Promise.allSettled(
    JUCO_SCHOOLS.map(school => scrapeJucoSchool(school, startDate, endDate))
  );

  const events = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const school = JUCO_SCHOOLS[i];
    if (result.status === 'fulfilled') {
      console.log(`[${school.id}] fetched ${result.value.length} events`);
      events.push(...result.value);
    } else {
      console.warn(`[${school.id}] failed: ${result.reason?.message}`);
    }
  }
  return events;
}

module.exports = { scrapeAllJuco, JUCO_SCHOOLS };
