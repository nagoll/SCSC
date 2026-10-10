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
const { chromium } = require('playwright');
const { fromZonedTime } = require('date-fns-tz');
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
  {
    id: 'lamc',
    name: 'LA Mission College Eagles',
    scscTeamId: 'lamc-eagles',
    scheduleUrl: 'https://www.lamcathletics.com/composite',
    platform: 'sidearm',
    level: 'juco',
    defaultVenueId: 'lamc-athletics',
    price: 'free',
  },
];

/** Lowercase, strip punctuation/extra whitespace so "Mt. SAC" == "mt sac". */
function normalizeTeamName(name) {
  return (name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * The school's own name without the "College"/mascot words, e.g.
 * "Cerritos College Falcons" -> "cerritos", "Mt. SAC Mounties" -> "mt sac".
 */
function schoolKey(school) {
  return normalizeTeamName(school.name)
    .replace(/\bcollege\b/g, ' ')
    .replace(/\s+\S+$/, '')
    .trim();
}

/**
 * SIDEARM participant lists can include the host school itself (and in some
 * sites list it first), so teamNames[0] is not reliably the opponent. Drop
 * any name that is the school and take the first remaining one.
 */
function pickOpponent(teamNames, school) {
  const key = schoolKey(school);
  const others = teamNames.filter(n => {
    const norm = normalizeTeamName(n);
    return !(key && (norm === key || norm.startsWith(`${key} `)));
  });
  return others[0] || 'Opponent';
}

/** Distinguishes same-day events for one school (different sport/opponent). */
function eventIdSuffix(sportRaw, opponent) {
  const slug = s => normalizeTeamName(s).replace(/ /g, '-');
  return [slug(sportRaw), slug(opponent)].filter(Boolean).join('-');
}

/**
 * Combines a "Sun. September 27, 2026" date string and a "9:00 AM PDT" time
 * string (as found on SIDEARM composite-calendar pages) into a UTC ISO
 * string, correctly anchored to Pacific time regardless of the scraping
 * machine's own timezone. Returns null if either piece can't be parsed.
 */
function parsePacificDateTime(dateText, timeText) {
  const dateOnly = (dateText || '').replace(/^\s*\w+\.\s*/, '').trim();
  const timeMatch = (timeText || '').match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!dateOnly || !timeMatch) return null;

  const probe = new Date(`${dateOnly} ${timeMatch[0]}`);
  if (isNaN(probe)) return null;

  const pad = n => String(n).padStart(2, '0');
  const localIso = `${probe.getFullYear()}-${pad(probe.getMonth() + 1)}-${pad(probe.getDate())}T${pad(probe.getHours())}:${pad(probe.getMinutes())}:00`;
  const utc = fromZonedTime(localIso, 'America/Los_Angeles');
  return isNaN(utc) ? null : utc.toISOString();
}

/**
 * Extract games from SIDEARM's actual composite-calendar markup: date
 * groups (.section-event-date) each containing one or more event cards
 * (.event-box), with team names, sport, and time as direct text/attributes.
 * Reverse-engineered from real pages — SIDEARM has no public schema for
 * this, and it doesn't match either of the older strategies below.
 */
function parseSidearmComposite(html, school, start, end) {
  const events = [];
  const $ = cheerio.load(html);

  $('.section-event-date').each((_, dateGroup) => {
    const $group = $(dateGroup);
    const dateText = $group.find('.date-title').first().text().trim();

    $group.find('.event-box').each((__, box) => {
      const $box = $(box);
      const classes = ($box.attr('class') || '').split(/\s+/);
      if (classes.includes('away')) return;

      const timeText = $box.find('.cal-status').first().text().trim();
      const dateTime = parsePacificDateTime(dateText, timeText);
      if (!dateTime) return;
      const gameDate = new Date(dateTime);
      if (gameDate < start || gameDate > end) return;

      const sportRaw = $box.find('.list-event-sport .sport').first().text().trim() || 'other';

      const teamNames = $box.find('.list-events-participants .team-name')
        .map((___, el) => $(el).attr('title')?.trim()).get()
        .filter(Boolean);
      const opponent = pickOpponent(teamNames, school);

      const isNeutral = classes.includes('neutral');
      const neutralSiteName = isNeutral
        ? $box.find('.neutral-site').first().text().trim() || null
        : null;

      const verification = verifyVenue({
        scrapedVenueName: neutralSiteName,
        defaultVenueId: school.defaultVenueId,
        isNeutralSiteFlag: isNeutral,
      });

      if (verification.excluded) {
        console.log(`[${school.id}] Excluding event: ${opponent} — ${verification.excludeReason}`);
        return;
      }

      events.push(normalizeEvent({
        homeTeamId: school.scscTeamId,
        idSuffix: eventIdSuffix(sportRaw, opponent),
        awayTeamId: null,
        sport: sportRaw,
        level: school.level,
        gender: inferGender(sportRaw, null),
        dateTime,
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
  });

  return events;
}

/**
 * Extract games from SIDEARM's calendar-grid composite variant: a month
 * grid of <td class="cal-day"> cells, each holding a <ul> of
 * .cal-event-item entries. The cell's date comes from the aria-label on
 * its "show more" link (e.g. "Show events for Tue Sep 01 ... 2026") since
 * there's no per-event date field — only a per-event time (or "Final" for
 * past games, which naturally fails to parse as a time and gets skipped).
 */
function parseSidearmCalendarGrid(html, school, start, end) {
  const events = [];
  const $ = cheerio.load(html);

  $('.cal-day').each((_, dayCell) => {
    const $day = $(dayCell);
    const ariaLabel = $day.find('.cal-show-more a[aria-label]').first().attr('aria-label') || '';
    const dateMatch = ariaLabel.match(/([A-Za-z]{3})\s+(\d{1,2})\s+[\d:]+\s+\S+\s+(\d{4})/);
    if (!dateMatch) return;
    const dateText = `${dateMatch[1]} ${dateMatch[2]}, ${dateMatch[3]}`;

    $day.find('.cal-event-item').each((__, item) => {
      const $item = $(item);
      const timeText = $item.find('.cal-status').first().text().trim();
      const dateTime = parsePacificDateTime(dateText, timeText);
      if (!dateTime) return;
      const gameDate = new Date(dateTime);
      if (gameDate < start || gameDate > end) return;

      const $teamName = $item.find('.cal-event-team-name').first();
      const isAway = $teamName.find('.va').first().text().trim().toLowerCase() === 'at';
      if (isAway) return;

      const sportRaw = $item.find('.cal-sport .sport').first().text().trim() || 'other';
      const opponent = $teamName.attr('title')?.trim() || 'Opponent';

      const neutralSiteName = $item.find('.cal-neutral-site').first().text().trim() || null;
      const isNeutral = Boolean(neutralSiteName);

      const verification = verifyVenue({
        scrapedVenueName: neutralSiteName,
        defaultVenueId: school.defaultVenueId,
        isNeutralSiteFlag: isNeutral,
      });

      if (verification.excluded) {
        console.log(`[${school.id}] Excluding event: ${opponent} — ${verification.excludeReason}`);
        return;
      }

      events.push(normalizeEvent({
        homeTeamId: school.scscTeamId,
        idSuffix: eventIdSuffix(sportRaw, opponent),
        awayTeamId: null,
        sport: sportRaw,
        level: school.level,
        gender: inferGender(sportRaw, null),
        dateTime,
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
  });

  return events;
}

/**
 * Extract games from SIDEARM's older PrestoSports "schedule grid" variant
 * (schedule.grid.plugin.js): a .date-panel per day with .event-box entries.
 * The composite page only server-renders the currently active date tab —
 * other days load via AJAX on click, which this scraper doesn't follow — so
 * schools on this variant only yield whatever game falls on that one active
 * day per run. Acceptable given the daily refresh cadence; a full crawl of
 * every date tab would add real complexity for a variant only two schools use.
 */
function parseSidearmScheduleGrid(html, school, start, end) {
  const events = [];
  const $ = cheerio.load(html);

  $('.date-panel').each((_, panel) => {
    const $panel = $(panel);
    const dateText = $panel.find('.month-title').first().text().trim();

    $panel.find('.event-box').each((__, box) => {
      const $box = $(box);
      const classes = ($box.attr('class') || '').split(/\s+/);
      if (classes.includes('event-box-away')) return;

      const timeText = $box.find('.status').first().text().trim();
      const dateTime = parsePacificDateTime(dateText, timeText);
      if (!dateTime) return;
      const gameDate = new Date(dateTime);
      if (gameDate < start || gameDate > end) return;

      const sportRaw = $box.find('.sport').first().text().trim() || 'other';

      const teamNames = $box.find('.team-name')
        .map((___, el) => $(el).attr('title')?.trim()).get()
        .filter(Boolean);
      const opponent = pickOpponent(teamNames, school);

      const verification = verifyVenue({
        scrapedVenueName: null,
        defaultVenueId: school.defaultVenueId,
      });

      if (verification.excluded) {
        console.log(`[${school.id}] Excluding event: ${opponent} — ${verification.excludeReason}`);
        return;
      }

      events.push(normalizeEvent({
        homeTeamId: school.scscTeamId,
        idSuffix: eventIdSuffix(sportRaw, opponent),
        awayTeamId: null,
        sport: sportRaw,
        level: school.level,
        gender: inferGender(sportRaw, null),
        dateTime,
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
  });

  return events;
}

/**
 * Extract games from a Sidearm Sports page (same logic as college scraper).
 */
async function parseSidearmJuco(html, school, start, end) {
  const composite = parseSidearmComposite(html, school, start, end);
  if (composite.length > 0) return composite;

  const calendarGrid = parseSidearmCalendarGrid(html, school, start, end);
  if (calendarGrid.length > 0) return calendarGrid;

  const scheduleGrid = parseSidearmScheduleGrid(html, school, start, end);
  if (scheduleGrid.length > 0) return scheduleGrid;

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
          idSuffix: eventIdSuffix(sportRaw, opponent),
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
      idSuffix: eventIdSuffix(sportRaw, opponent),
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
          idSuffix: eventIdSuffix(sportRaw, awayOrg),
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

// Parses WEBSHARE_PROXIES ("host:port:username:password" per line, as
// exported from the Webshare dashboard) into Playwright proxy configs.
function parseProxyList(raw) {
  if (!raw) return [];
  return raw
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      const [host, port, username, password] = line.split(':');
      return { server: `http://${host}:${port}`, username, password };
    });
}

async function scrapeJucoSchool(school, startDate, endDate, browser, proxy) {
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    ...(proxy ? { proxy } : {}),
  });
  const page = await context.newPage();
  try {
    const res = await page.goto(school.scheduleUrl, {
      // SIDEARM's composite schedule fetches game data client-side after
      // the initial document loads — domcontentloaded fires before that
      // data lands in the DOM. networkidle waits for it to actually settle.
      waitUntil: 'networkidle',
      timeout: 45_000,
    });

    if (!res || !res.ok()) {
      console.warn(`[${school.id}] HTTP ${res ? res.status() : '(no response)'} — ${school.scheduleUrl}`);
      return [];
    }

    const html = await page.content();
    const start = new Date(startDate);
    const end = new Date(endDate);

    const events = school.platform === 'sidearm'
      ? await parseSidearmJuco(html, school, start, end)
      : await parseGenericJuco(html, school, start, end);

    return events;
  } catch (err) {
    const msg = err.name === 'TimeoutError' ? 'timed out after 45s' : err.message;
    console.warn(`[${school.id}] Scrape error: ${msg}`);
    return [];
  } finally {
    await page.close();
    await context.close();
  }
}

async function scrapeAllJuco(startDate, endDate) {
  // A real (non-headless-detectable) browser is required here — every LA
  // County CCCAA school's SIDEARM-hosted athletics site sits behind edge bot
  // detection (CloudFront/WAF) that uniformly blocks plain HTTP requests
  // with a 405, regardless of headers or User-Agent. Verified against the
  // real network (not just this sandbox) before committing to this.
  //
  // That same edge detection also blocks by IP reputation, so requests are
  // additionally routed through rotating proxies (one context per school,
  // proxies cycled round-robin) when WEBSHARE_PROXIES is set.
  const browser = await chromium.launch();
  const proxies = parseProxyList(process.env.WEBSHARE_PROXIES);
  if (proxies.length > 0) {
    console.log(`[juco] Routing through ${proxies.length} rotating proxies`);
  }

  // Residential proxy bandwidth is real-home-network speed, not datacenter —
  // scraping too many schools at once over one shared connection starved
  // requests (timeouts) and even broke the proxy tunnel itself under burst
  // load (ERR_TUNNEL_CONNECTION_FAILED). Small batches with a short stagger
  // between them keep each connection healthy.
  const BATCH_SIZE = 2;
  const results = [];
  try {
    for (let i = 0; i < JUCO_SCHOOLS.length; i += BATCH_SIZE) {
      if (i > 0) await new Promise(r => setTimeout(r, 1500));
      const batch = JUCO_SCHOOLS.slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map((school, j) => {
          const idx = i + j;
          const proxy = proxies.length > 0 ? proxies[idx % proxies.length] : undefined;
          return scrapeJucoSchool(school, startDate, endDate, browser, proxy);
        })
      );
      results.push(...batchResults);
    }
  } finally {
    await browser.close();
  }

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

module.exports = { scrapeAllJuco, JUCO_SCHOOLS, pickOpponent, eventIdSuffix };
