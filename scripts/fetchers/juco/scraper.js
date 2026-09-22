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

const cheerio = require('cheerio');
const { normalizeEvent, inferGender } = require('../../normalize');
const { verifyVenue } = require('../../venue-verify');

// Every LA County CCCAA school runs its athletics site on SIDEARM Sports, on
// a dedicated athletics domain separate from the college's main .edu site —
// each with a "composite" page (SIDEARM's standard all-sports schedule view)
// at "/composite". The previous URLs pointed at the college's main site
// instead of the athletics site, which is why they 403'd, 404'd, or timed
// out outright. Confirmed via web search of each school's current athletics
// site; verify with a workflow_dispatch dry run before relying on this list.
const JUCO_SCHOOLS = [
  {
    id: 'elac',
    name: 'East LA College Huskies',
    scscTeamId: 'elac-huskies',
    scheduleUrl: 'https://www.elacathletics.com/composite',
    platform: 'sidearm',
    level: 'juco',
    defaultVenueId: 'elac-stadium',
    price: 'free',
  },
  {
    id: 'lacc',
    name: 'LA City College Cubs',
    scscTeamId: 'lacc-cubs',
    scheduleUrl: 'https://laccathletics.com/composite',
    platform: 'sidearm',
    level: 'juco',
    defaultVenueId: 'lacc-athletic-field',
    price: 'free',
  },
  {
    id: 'lavc',
    name: 'LA Valley College Monarchs',
    scscTeamId: 'lavc-monarchs',
    scheduleUrl: 'https://www.lavcathletics.com/composite',
    platform: 'sidearm',
    level: 'juco',
    defaultVenueId: 'lavc-athletic-complex',
    price: 'free',
  },
  {
    id: 'lapc',
    name: 'LA Pierce College Brahmas',
    scscTeamId: 'lapc-brahmas',
    scheduleUrl: 'https://www.lapcbrahmas.com/composite',
    platform: 'sidearm',
    level: 'juco',
    defaultVenueId: 'lapc-athletics',
    price: 'free',
  },
  {
    id: 'el-camino',
    name: 'El Camino College Warriors',
    scscTeamId: 'el-camino-warriors',
    scheduleUrl: 'https://eccwarriors.com/composite',
    platform: 'sidearm',
    level: 'juco',
    defaultVenueId: 'el-camino-stadium',
    price: 'free',
  },
  {
    id: 'smc',
    name: 'Santa Monica College Corsairs',
    scscTeamId: 'smc-corsairs',
    scheduleUrl: 'https://www.smccorsairs.com/composite',
    platform: 'sidearm',
    level: 'juco',
    defaultVenueId: 'smc-corsair-field',
    price: 'free',
  },
  {
    id: 'cerritos',
    name: 'Cerritos College Falcons',
    scscTeamId: 'cerritos-falcons',
    scheduleUrl: 'https://www.cerritosfalcons.com/composite',
    platform: 'sidearm',
    level: 'juco',
    defaultVenueId: 'cerritos-college-stadium',
    price: 'free',
  },
  {
    id: 'mt-sac',
    name: 'Mt. SAC Mounties',
    scscTeamId: 'mt-sac-mounties',
    scheduleUrl: 'https://www.mtsacathletics.com/composite',
    platform: 'sidearm',
    level: 'juco',
    defaultVenueId: 'mt-sac-hilmer-lodge',
    price: 'free',
  },
  {
    id: 'pcc',
    name: 'Pasadena City College Lancers',
    scscTeamId: 'pcc-lancers',
    scheduleUrl: 'https://pcclancers.com/composite',
    platform: 'sidearm',
    level: 'juco',
    defaultVenueId: 'pcc-robinson-stadium',
    price: 'free',
  },
  {
    id: 'glendale',
    name: 'Glendale CC Vaqueros',
    scscTeamId: 'glendale-vaqueros',
    scheduleUrl: 'https://www.gccathletics.com/composite',
    platform: 'sidearm',
    level: 'juco',
    defaultVenueId: 'glendale-cc-athletics',
    price: 'free',
  },
  {
    id: 'rio-hondo',
    name: 'Rio Hondo College Roadrunners',
    scscTeamId: 'rio-hondo-roadrunners',
    scheduleUrl: 'https://athletics.riohondo.edu/composite',
    platform: 'sidearm',
    level: 'juco',
    defaultVenueId: 'rio-hondo-athletics',
    price: 'free',
  },
  {
    id: 'citrus',
    name: 'Citrus College Owls',
    scscTeamId: 'citrus-owls',
    scheduleUrl: 'https://www.citrusowls.com/composite',
    platform: 'sidearm',
    level: 'juco',
    defaultVenueId: 'citrus-athletics',
    price: 'free',
  },
  {
    id: 'west-la',
    name: 'West LA College Wildcats',
    scscTeamId: 'west-la-wildcats',
    scheduleUrl: 'https://www.westlacollegeathletics.com/composite',
    platform: 'sidearm',
    level: 'juco',
    defaultVenueId: 'west-la-athletics',
    price: 'free',
  },
  {
    id: 'compton',
    name: 'Compton College Tartars',
    scscTeamId: 'compton-tartars',
    scheduleUrl: 'https://comptoncollegeathletics.com/composite',
    platform: 'sidearm',
    level: 'juco',
    defaultVenueId: 'compton-athletics',
    price: 'free',
  },
  {
    id: 'harbor',
    name: 'Harbor College Seahawks',
    scscTeamId: 'harbor-seahawks',
    scheduleUrl: 'https://www.lahcathletics.com/composite',
    platform: 'sidearm',
    level: 'juco',
    defaultVenueId: 'harbor-athletics',
    price: 'free',
  },
  {
    id: 'la-southwest',
    name: 'LA Southwest College Cougars',
    scscTeamId: 'lasw-cougars',
    scheduleUrl: 'https://athletics.lasc.edu/composite',
    platform: 'sidearm',
    level: 'juco',
    defaultVenueId: 'la-southwest-athletics',
    price: 'free',
  },
];

/**
 * Extract games from a Sidearm Sports page (same logic as college scraper).
 */
async function parseSidearmJuco(html, school, start, end) {
  const events = [];
  const $ = cheerio.load(html);

  // Try __NEXT_DATA__ JSON first
  const nextDataText = $('script#__NEXT_DATA__').html();
  if (nextDataText) {
    try {
      const json = JSON.parse(nextDataText);
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
          source: `juco-scraper:${school.id}`,
        }));
      }
      if (events.length > 0) return events;
    } catch { /* fall through */ }
  }

  // Fallback: parse <li class="sidearm-schedule-game"> blocks
  $('li.sidearm-schedule-game').each((_, el) => {
    const $block = $(el);
    const isAway =
      $block.hasClass('sidearm-schedule-game-away') || $block.attr('data-home-away') === 'away';
    if (isAway) return;

    const rawDate = $block.attr('data-date') || $block.find('time[datetime]').first().attr('datetime');
    if (!rawDate) return;
    const gameDate = new Date(rawDate);
    if (isNaN(gameDate) || gameDate < start || gameDate > end) return;

    const opponent = $block.find('[class*="opponent"]').first().text().trim() || 'Opponent';
    const sportRaw = $block.attr('data-sport') || 'other';

    // Try to extract venue from HTML
    const scrapedVenueName =
      $block.find('[class*="venue"], [class*="location"], [class*="facility"]').first().text().trim() || null;

    const verification = verifyVenue({
      scrapedVenueName,
      defaultVenueId: school.defaultVenueId,
    });

    if (verification.excluded) {
      console.log(`[${school.id}] Excluding event: ${opponent} — ${verification.excludeReason}`);
      return;
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
      source: `juco-scraper:${school.id}`,
    }));
  });

  return events;
}

/**
 * Generic parser for schools without a known platform.
 * Extracts ISO dates and logs for manual review if nothing structured found.
 */
async function parseGenericJuco(html, school, start, end) {
  const events = [];
  const $ = cheerio.load(html);

  // Look for JSON-LD SportsEvent structured data
  const ldScripts = $('script[type="application/ld+json"]')
    .map((_, el) => $(el).html())
    .get();
  for (const json of ldScripts) {
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
          source: `juco-scraper:${school.id}`,
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
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    });

    if (!res.ok) {
      console.warn(`[${school.id}] HTTP ${res.status} — ${school.scheduleUrl} — server: ${res.headers.get('server')}, cf-ray: ${res.headers.get('cf-ray')}, cf-mitigated: ${res.headers.get('cf-mitigated')}`);
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
