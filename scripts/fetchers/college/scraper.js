/**
 * scraper.js — college schedules from the schools' own SIDEARM sites
 * (primary college source; ESPN fills in what these miss).
 *
 * The composite pages render client-side from SIDEARM's calendar service, so
 * we read that JSON directly instead of loading the page in a browser. Sites
 * on SIDEARM's newer front end serve that service from an "admin." host, and
 * every SIDEARM site also publishes an all-sports iCal feed, used last.
 * No proxy: plain requests from GitHub Actions reach these sites.
 */

const { fromZonedTime } = require('date-fns-tz');
const { normalizeEvent, normalizeSport } = require('../../normalize');
const { verifyVenue } = require('../../venue-verify');
const { eventIdSuffix } = require('../juco/scraper');

const COLLEGE_SCHOOLS = [
  {
    id: 'usc',
    homeCity: 'Los Angeles',
    name: 'USC Trojans',
    scscTeamId: 'usc-trojans',
    site: 'https://usctrojans.com',
    platform: 'sidearm',
    level: 'college',
    defaultVenueId: 'galen-center',
    ticketUrl: 'https://usctrojans.com/tickets',
    price: 'under_50',
  },
  {
    id: 'ucla',
    homeCity: 'Los Angeles',
    name: 'UCLA Bruins',
    scscTeamId: 'ucla-bruins',
    site: 'https://uclabruins.com',
    platform: 'wmt', // not SIDEARM; ESPN covers UCLA for now
    level: 'college',
    defaultVenueId: 'pauley-pavilion',
    ticketUrl: 'https://uclabruins.com/tickets',
    price: 'under_50',
  },
  {
    id: 'pepperdine',
    homeCity: 'Malibu',
    name: 'Pepperdine Waves',
    scscTeamId: 'pepperdine-waves',
    site: 'https://pepperdinewaves.com',
    platform: 'sidearm',
    level: 'college',
    defaultVenueId: 'firestone-fieldhouse',
    ticketUrl: 'https://pepperdinewaves.com/tickets',
    price: 'under_20',
  },
  {
    id: 'lmu',
    homeCity: 'Los Angeles',
    name: 'LMU Lions',
    scscTeamId: 'lmu-lions',
    site: 'https://lmulions.com',
    platform: 'sidearm',
    level: 'college',
    defaultVenueId: 'gersten-pavilion',
    ticketUrl: 'https://lmulions.com/tickets',
    price: 'under_20',
  },
  {
    id: 'csun',
    homeCity: 'Northridge',
    name: 'CSUN Matadors',
    scscTeamId: 'csun-matadors',
    site: 'https://gomatadors.com',
    platform: 'sidearm',
    level: 'college',
    defaultVenueId: 'matadome',
    ticketUrl: 'https://gomatadors.com/tickets',
    price: 'under_20',
  },
  {
    id: 'lbsu',
    homeCity: 'Long Beach',
    name: 'Long Beach State 49ers',
    scscTeamId: 'long-beach-state-49ers',
    site: 'https://longbeachstate.com',
    platform: 'sidearm',
    level: 'college',
    defaultVenueId: 'walter-pyramid',
    ticketUrl: 'https://longbeachstate.com/tickets',
    price: 'under_20',
  },
  {
    id: 'csuf',
    homeCity: 'Fullerton',
    name: 'Cal State Fullerton Titans',
    scscTeamId: 'csuf-titans',
    site: 'https://fullertontitans.com',
    platform: 'sidearm',
    level: 'college',
    defaultVenueId: 'csuf-athletics',
    ticketUrl: 'https://fullertontitans.com/tickets',
    price: 'under_20',
  },
  {
    id: 'cal-poly-pomona',
    homeCity: 'Pomona',
    name: 'Cal Poly Pomona Broncos',
    scscTeamId: 'cal-poly-pomona-broncos',
    site: 'https://broncoathletics.com',
    platform: 'sidearm',
    level: 'college',
    defaultVenueId: 'cal-poly-pomona-kellogg-gym',
    ticketUrl: null,
    price: 'free',
  },
  {
    id: 'cal-state-la',
    homeCity: 'Los Angeles',
    name: 'Cal State LA Golden Eagles',
    scscTeamId: 'calstate-la-eagles',
    site: 'https://lagoldeneagles.com',
    platform: 'sidearm',
    level: 'college',
    defaultVenueId: 'calstate-la-athletics',
    ticketUrl: 'https://lagoldeneagles.com/tickets',
    price: 'free',
  },
  {
    id: 'csudh',
    homeCity: 'Carson',
    name: 'Cal State Dominguez Hills Toros',
    scscTeamId: 'csudh-toros',
    site: 'https://gotoros.com',
    platform: 'sidearm',
    level: 'college',
    defaultVenueId: 'csudh-athletics',
    ticketUrl: null,
    price: 'free',
  },
  {
    id: 'pomona-pitzer',
    homeCity: 'Claremont',
    name: 'Pomona-Pitzer Sagehens',
    scscTeamId: 'pomona-pitzer-sagehens',
    site: 'https://sagehens.com',
    platform: 'sidearm',
    level: 'college',
    defaultVenueId: 'pomona-pitzer-athletics',
    ticketUrl: null,
    price: 'free',
  },
  {
    id: 'occidental',
    homeCity: 'Los Angeles',
    name: 'Occidental College Tigers',
    scscTeamId: 'occidental-tigers',
    site: 'https://oxyathletics.com',
    platform: 'sidearm',
    level: 'college',
    defaultVenueId: 'occidental-athletics',
    ticketUrl: null,
    price: 'free',
  },
];

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36';
const TZ = 'America/Los_Angeles';

async function get(url) {
  const res = await fetch(url, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);
  return res.text();
}

function collegeEvent(school, { sportRaw, opponent: rawOpponent, dateTime, venueName, ticketUrl }) {
  // Drop poll rankings ("#15 Penn State"): they go stale and split event IDs.
  const opponent = rawOpponent.replace(/^(#|No\.\s*)\d+\s+/i, '');
  const verification = verifyVenue({ scrapedVenueName: venueName, defaultVenueId: school.defaultVenueId });
  if (verification.excluded) {
    console.log(`[${school.id}] Excluding event: ${opponent} — ${verification.excludeReason}`);
    return null;
  }
  return normalizeEvent({
    homeTeamId: school.scscTeamId,
    idSuffix: eventIdSuffix(sportRaw, opponent),
    awayTeamId: null,
    sport: sportRaw,
    level: school.level,
    dateTime,
    endTime: null,
    venueId: verification.venueId,
    venueSourceName: verification.venueSourceName,
    venueConfidence: verification.venueConfidence,
    isNeutralSite: false,
    eventName: `${opponent} at ${school.name}`,
    ticketUrl: ticketUrl || school.ticketUrl || null,
    price: school.price,
    conference: null,
    league: null,
    source: `university-scraper:${school.id}`,
  });
}

/**
 * One month of SIDEARM's responsive-calendar.ashx: a list of days, each with
 * its events. Keeps home games ("H") that have a clock time; "All Day" and
 * TBA entries are mostly multi-day tournaments.
 */
function parseSidearmCalendarJson(days, school, start, end) {
  const events = [];
  for (const day of days) {
    for (const g of day.events || []) {
      if (g.location_indicator !== 'H' || g.noplay_text || !/\d/.test(g.time || '')) continue;
      const dateTime = fromZonedTime(g.date, TZ);
      if (isNaN(dateTime) || dateTime < start || dateTime > end) continue;
      const opponent = [g.opponent?.prefix, g.opponent?.title].filter(Boolean).join(' ') || 'Opponent';
      const ev = collegeEvent(school, {
        sportRaw: g.sport?.title || 'other',
        opponent,
        dateTime: dateTime.toISOString(),
        venueName: g.facility?.title || g.location || null,
        ticketUrl: g.media?.tickets?.url,
      });
      if (ev) events.push({ ...ev, sourceGameId: g.id });
    }
  }
  return events;
}

async function fetchSidearmCalendarJson(host, school, start, end) {
  const byGame = new Map();
  const month = new Date(start.getFullYear(), start.getMonth(), 1);
  for (; month <= end; month.setMonth(month.getMonth() + 1)) {
    const date = `${month.getMonth() + 1}/1/${month.getFullYear()} 12:00:00 AM`;
    const url = `${host}/services/responsive-calendar.ashx?type=month&sport=0&location=all&date=${encodeURIComponent(date)}`;
    const days = JSON.parse(await get(url));
    if (!Array.isArray(days)) throw new Error(`unexpected calendar response — ${url}`);
    for (const ev of parseSidearmCalendarJson(days, school, start, end)) byGame.set(ev.sourceGameId, ev);
  }
  return [...byGame.values()].map(({ sourceGameId, ...ev }) => ev);
}

function unescapeIcs(v) {
  return v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');
}

/**
 * SIDEARM's all-sports iCal feed. It has no home/away flag, so a home game
 * is a "vs" game whose LOCATION names the school's home city. SUMMARY looks
 * like "[W] Cal Poly Pomona Women's Soccer vs Cal State LA - CCAA Opener"
 * (result prefix and school name optional).
 */
function parseSidearmIcs(text, school, start, end) {
  const events = [];
  const lines = text.replace(/\r?\n[ \t]/g, '').split(/\r?\n/);
  let cur = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') cur = {};
    else if (line === 'END:VEVENT' && cur) {
      const ev = icsEvent(cur, school, start, end);
      if (ev) events.push(ev);
      cur = null;
    } else if (cur) {
      const m = line.match(/^([A-Z-]+)(;[^:]*)?:(.*)$/);
      if (m) cur[m[1]] = { params: m[2] || '', value: unescapeIcs(m[3]) };
    }
  }
  return events;
}

function icsEvent(v, school, start, end) {
  const dt = v.DTSTART;
  if (!dt || /VALUE=DATE(?!-)/.test(dt.params)) return null; // all-day
  const m = dt.value.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!m) return null;
  const iso = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}`;
  const dateTime = m[7] ? new Date(`${iso}Z`) : fromZonedTime(iso, TZ);
  if (isNaN(dateTime) || dateTime < start || dateTime > end) return null;

  const summary = (v.SUMMARY?.value || '').replace(/^\[[^\]]*\]\s*/, '');
  // Away games read "... at Opponent"; school names can contain " at " too.
  const parts = summary.match(/^(.*?)\s+vs\.?\s+(.*)$/i);
  if (!parts) return null;
  const location = v.LOCATION?.value || '';
  if (!school.homeCity || !location.toLowerCase().includes(school.homeCity.toLowerCase())) return null;

  // The left side is "[school name] Sport"; take the longest tail that is a sport.
  const words = parts[1].split(/\s+/);
  let sportRaw = 'other';
  for (let i = 0; i < words.length; i++) {
    const cand = words.slice(i).join(' ');
    if (normalizeSport(cand) !== 'other') { sportRaw = cand; break; }
  }
  const opponent = parts[2].split(/\s+-\s+/)[0].trim() || 'Opponent';
  const ticket = (v.DESCRIPTION?.value || '').match(/Tickets:\s*(\S+)/);
  return collegeEvent(school, {
    sportRaw,
    opponent,
    dateTime: dateTime.toISOString(),
    venueName: location || null,
    ticketUrl: ticket?.[1],
  });
}

async function scrapeCollege(school, start, end) {
  const hosts = [school.site, school.site.replace('://', '://admin.')];
  for (const host of hosts) {
    try {
      const events = await fetchSidearmCalendarJson(host, school, start, end);
      console.log(`[${school.id}] calendar JSON from ${host}`);
      return events;
    } catch (err) {
      console.warn(`[${school.id}] calendar JSON failed: ${err.message}`);
    }
  }
  try {
    const events = parseSidearmIcs(await get(`${school.site}/calendar.ashx/calendar.ics?sport_id=0`), school, start, end);
    console.log(`[${school.id}] iCal feed`);
    return events;
  } catch (err) {
    console.warn(`[${school.id}] iCal feed failed: ${err.message}`);
    return [];
  }
}

async function scrapeAllColleges(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const schools = COLLEGE_SCHOOLS.filter(s => s.platform === 'sidearm');
  const results = await Promise.all(schools.map(s => scrapeCollege(s, start, end)));
  results.forEach((events, i) => console.log(`[${schools[i].id}] fetched ${events.length} events`));
  return results.flat();
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

module.exports = { scrapeAllColleges, combineCollegeSources, parseSidearmCalendarJson, parseSidearmIcs, COLLEGE_SCHOOLS };
