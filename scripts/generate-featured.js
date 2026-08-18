#!/usr/bin/env node
/**
 * generate-featured.js — Auto-generate Game of the Week and Hidden Gem picks.
 *
 * Scores upcoming events using rivalry detection, venue uniqueness, price,
 * sport diversity, and editorial heuristics. Produces template-driven
 * descriptions that feel editorial, not robotic.
 *
 * Runs as part of the daily schedule refresh.
 */

const fs = require('fs');
const path = require('path');

const EVENTS_PATH = path.join(__dirname, '../src/data/events.json');
const TEAMS_PATH = path.join(__dirname, '../src/data/teams.json');
const VENUES_PATH = path.join(__dirname, '../src/data/venues.json');
const FEATURED_PATH = path.join(__dirname, '../src/data/featured.json');

const LOOKAHEAD_DAYS = 14;
const GOTW_COUNT = 3;
const GEM_COUNT = 3;
const MIN_GOTW_SCORE = 15;
const MIN_GEM_SCORE = 10;

// --- Rivalry definitions: [homeTeamId, opponentKeyword, nickname, context] ---
const RIVALRIES = [
  ['la-lakers', 'clippers', 'Battle of LA', 'The Hallway Series rivalry never gets old'],
  ['la-clippers', 'lakers', 'Battle of LA', 'The Hallway Series comes to Intuit Dome'],
  ['la-lakers', 'celtics', "NBA's Greatest Rivalry", 'Decades of history in every possession'],
  ['la-lakers', 'warriors', 'Pacific Showdown', 'California basketball at its finest'],
  ['la-lakers', 'nuggets', 'Western Conference Clash', 'A playoff-caliber matchup with real stakes'],
  ['la-dodgers', 'giants', 'The Best Rivalry in Baseball', 'Dating back to New York, this one defines the NL West'],
  ['la-dodgers', 'padres', 'NL West Battle', "Southern California's NL West rivalry heats up"],
  ['la-dodgers', 'yankees', 'The Classic', "Baseball's most iconic matchup comes to Chavez Ravine"],
  ['la-dodgers', 'mets', 'October Flashback', 'The Dodgers and Mets have unfinished business'],
  ['la-galaxy', 'lafc', 'El Tráfico', "MLS's fiercest rivalry — the atmosphere is electric"],
  ['lafc', 'galaxy', 'El Tráfico', "MLS's fiercest rivalry — expect a packed house at BMO"],
  ['la-rams', 'chargers', 'Battle of LA', "The NFL's LA rivalry takes center stage at SoFi"],
  ['la-rams', '49ers', 'NFC West Showdown', "NFC West bragging rights on the line"],
  ['la-chargers', 'chiefs', 'AFC West Headliner', 'The AFC West brings its A-game to Inglewood'],
  ['la-chargers', '49ers', 'NFC West vs. AFC West', 'A cross-conference showdown between two top-tier franchises'],
  ['la-chargers', 'rams', 'Battle of LA', "The NFL's LA rivalry returns to SoFi"],
  ['la-rams', 'chargers', 'Battle of LA', "The NFL's LA rivalry takes center stage at SoFi"],
  ['la-rams', '49ers', 'NFC West Showdown', "NFC West bragging rights on the line at SoFi"],
  ['la-kings', 'ducks', 'Freeway Faceoff', 'The SoCal hockey rivalry hits the ice'],
  ['la-kings', 'sharks', 'California Cup', 'Another chapter in California hockey'],
  ['usc-trojans', 'ucla', 'Crosstown Showdown', "The biggest rivalry in LA college sports"],
  ['ucla-bruins', 'usc', 'Crosstown Showdown', "Bragging rights on the line between LA's two college powerhouses"],
  ['usc-trojans', 'notre dame', 'The Greatest Intersectional Rivalry', 'College football tradition at its peak'],
  ['usc-trojans', 'michigan', 'Big Ten Heavyweights', 'Two of the biggest brands in college football meet'],
  ['ucla-bruins', 'oregon', 'Big Ten Showdown', 'The Bruins face a stiff Big Ten test'],
];

const POPULAR_TEAMS = new Set([
  'la-dodgers', 'la-lakers', 'la-rams', 'la-chargers', 'la-kings',
  'la-clippers', 'usc-trojans', 'ucla-bruins', 'lafc', 'la-galaxy',
]);

const SCENIC_VENUES = {
  'firestone-fieldhouse': 'perched above the Pacific Ocean in Malibu',
  'rose-bowl': 'at the iconic Rose Bowl in the Arroyo Seco',
  'mt-sac-hilmer-lodge': "at Mt. SAC's world-class Hilmer Lodge Stadium",
  'occidental-athletics': "at Occidental's gorgeous Eagle Rock campus",
  'la-memorial-coliseum': 'at the historic Los Angeles Memorial Coliseum',
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const SPORT_DISPLAY = {
  baseball: 'baseball', basketball: 'basketball', football: 'football',
  hockey: 'hockey', soccer: 'soccer', softball: 'softball',
  volleyball: 'volleyball', track: 'track & field', tennis: 'tennis',
  swimming: 'swimming & diving', golf: 'golf', lacrosse: 'lacrosse',
  'water-polo': 'water polo', cricket: 'cricket', other: 'sports',
};

function loadJSON(p) { return JSON.parse(fs.readFileSync(p, 'utf-8')); }

function hashPick(str, max) {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = ((h << 5) - h) + str.charCodeAt(i) | 0;
  return Math.abs(h) % max;
}

function extractOpponent(event) {
  if (!event.eventName) return 'the visitors';
  const at = event.eventName.match(/^(.+?)\s+at\s+/i);
  if (at) return at[1].trim();
  const vs = event.eventName.match(/vs\.?\s+(.+)$/i);
  if (vs) return vs[1].trim();
  return event.eventName;
}

function detectRivalry(event) {
  const name = (event.eventName || '').toLowerCase();
  for (const [teamId, keyword, nickname, context] of RIVALRIES) {
    if (event.homeTeam === teamId && name.includes(keyword.toLowerCase())) {
      return { nickname, context };
    }
  }
  return null;
}

function getUpcoming(events, days) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setDate(end.getDate() + days);
  return events.filter(e => {
    const d = new Date(e.dateTime);
    return d >= now && d <= end;
  });
}

// ---- Scoring ----

function scoreGOTW(event, teams) {
  let s = 0;
  if (detectRivalry(event)) s += 50;
  if (POPULAR_TEAMS.has(event.homeTeam)) s += 20;
  if (event.level === 'pro') s += 15;
  if (event.level === 'college') s += 10;
  const day = new Date(event.dateTime).getDay();
  if (day === 0 || day === 5 || day === 6) s += 10;
  if (event.sport === 'football') s += 10;
  if (event.sport === 'basketball') s += 5;
  if (event.venueConfidence === 'verified') s += 5;
  if (event.venueConfidence === 'unverified') s -= 10;
  return s;
}

function scoreGem(event, teams, venues) {
  let s = 0;
  if (event.price === 'free') s += 35;
  if (event.level === 'juco') s += 30;
  if (event.level === 'college' && !POPULAR_TEAMS.has(event.homeTeam)) s += 25;
  if (event.gender === 'womens') s += 15;
  if (['lacrosse', 'water-polo', 'cricket', 'swimming', 'track', 'softball'].includes(event.sport)) s += 15;
  if (event.venue in SCENIC_VENUES) s += 20;
  const day = new Date(event.dateTime).getDay();
  if (day === 0 || day === 6) s += 10;
  if (event.venueConfidence === 'unverified') s -= 20;
  if (POPULAR_TEAMS.has(event.homeTeam)) s -= 30;
  return s;
}

// ---- Description generation ----

function gotwTitle(event, teams) {
  const team = teams.find(t => t.id === event.homeTeam);
  const name = team?.shortName || event.homeTeam;
  const opp = extractOpponent(event);
  const rivalry = detectRivalry(event);
  if (rivalry) return `${rivalry.nickname}: ${name} vs. ${opp}`;
  return `${name} vs. ${opp}`;
}

function gotwDesc(event, teams, venues) {
  const team = teams.find(t => t.id === event.homeTeam);
  const venue = venues.find(v => v.id === event.venue);
  const name = team?.shortName || event.homeTeam;
  const vn = venue?.name || 'the venue';
  const opp = extractOpponent(event);
  const day = DAYS[new Date(event.dateTime).getDay()];
  const rivalry = detectRivalry(event);
  const sd = SPORT_DISPLAY[event.sport] || event.sport;

  if (rivalry) {
    const t = [
      `${rivalry.context}. The ${opp} come to ${vn} for a ${day} showdown. This is appointment viewing.`,
      `${rivalry.nickname} — need we say more? ${vn} will be rocking when the ${opp} roll in. Don't miss this one.`,
      `One of the best rivalries in ${sd} is back. The ${opp} visit ${vn} with bragging rights on the line.`,
    ];
    return t[hashPick(event.id, t.length)];
  }

  const t = [
    `The ${name} host the ${opp} at ${vn} this ${day}. ${event.level === 'pro' ? 'A marquee matchup' : 'A solid matchup'} you won't want to miss.`,
    `The ${opp} come to town for a ${day} clash at ${vn}. The ${name} are looking to put on a show for the home crowd.`,
    `${vn} plays host as the ${name} take on the ${opp} this ${day}. Circle this one on the calendar.`,
  ];
  return t[hashPick(event.id, t.length)];
}

function gemTitle(event, teams) {
  const team = teams.find(t => t.id === event.homeTeam);
  const short = team?.shortName || event.homeTeam;
  const opp = extractOpponent(event);
  const sd = SPORT_DISPLAY[event.sport] || event.sport;

  if (event.venue in SCENIC_VENUES) {
    const labels = {
      'firestone-fieldhouse': 'in Malibu',
      'rose-bowl': 'at the Rose Bowl',
      'mt-sac-hilmer-lodge': 'at Mt. SAC',
      'occidental-athletics': 'at Occidental',
      'la-memorial-coliseum': 'at the Coliseum',
    };
    const cap = sd.charAt(0).toUpperCase() + sd.slice(1);
    return `${cap} ${labels[event.venue] || ''}: ${short} vs. ${opp}`;
  }
  if (event.level === 'juco' && event.price === 'free') {
    const cap = sd.charAt(0).toUpperCase() + sd.slice(1);
    return `Free JuCo ${cap}: ${short} vs. ${opp}`;
  }
  if (event.gender === 'womens') {
    const cap = sd.charAt(0).toUpperCase() + sd.slice(1);
    return `Women's ${cap}: ${short} vs. ${opp}`;
  }
  return `${short} vs. ${opp}`;
}

function gemDesc(event, teams, venues) {
  const team = teams.find(t => t.id === event.homeTeam);
  const venue = venues.find(v => v.id === event.venue);
  const short = team?.shortName || event.homeTeam;
  const vn = venue?.name || 'the venue';
  const opp = extractOpponent(event);
  const day = DAYS[new Date(event.dateTime).getDay()];
  const sd = SPORT_DISPLAY[event.sport] || event.sport;
  const conf = team?.conference || '';
  const free = event.price === 'free';

  if (event.venue in SCENIC_VENUES) {
    return `${SCENIC_VENUES[event.venue].charAt(0).toUpperCase() + SCENIC_VENUES[event.venue].slice(1)}, ${short} hosts ${opp} for ${sd}. The setting alone makes this worth the trip${free ? ' — and admission is free' : ''}.`;
  }

  if (free && event.level === 'juco') {
    const t = [
      `${conf ? conf + ' ' + sd : sd.charAt(0).toUpperCase() + sd.slice(1)} at its best. ${short} hosts ${opp} — completely free to attend. Real competition, great atmosphere, zero ticket cost.`,
      `Want competitive ${sd} without spending a dime? ${short} takes on ${opp} at ${vn}. Free admission — just show up.`,
      `Skip the $200 pro tickets and catch genuine ${sd} at ${vn}. ${short} vs. ${opp} is free and delivers real energy.`,
    ];
    return t[hashPick(event.id, t.length)];
  }

  if (event.gender === 'womens') {
    const t = [
      `Women's ${sd} is having a moment, and ${short} is part of it. Catch them hosting ${opp} at ${vn}${free ? ' — free admission' : ''}.`,
      `${short} takes on ${opp} in women's ${sd} at ${vn}. Competitive, fast-paced, and ${free ? 'completely free' : 'affordable'}.`,
    ];
    return t[hashPick(event.id, t.length)];
  }

  if (['lacrosse', 'water-polo', 'cricket', 'swimming', 'track', 'softball'].includes(event.sport)) {
    const t = [
      `${sd.charAt(0).toUpperCase() + sd.slice(1)} doesn't get the headlines, but it should. ${short} hosts ${opp} at ${vn}${free ? ' — free admission' : ''}. Step outside your comfort zone.`,
      `Looking beyond the big four? ${sd.charAt(0).toUpperCase() + sd.slice(1)} at ${vn} is a great way to spend a ${day}. ${short} takes on ${opp}.`,
    ];
    return t[hashPick(event.id, t.length)];
  }

  const t = [
    `Under the radar but worth your time: ${short} hosts ${opp} at ${vn}.${free ? ' Free admission makes this an easy yes.' : ''} Great live sports without the big-venue hassle.`,
    `${short} vs. ${opp} at ${vn} is the kind of local sports experience that makes LA special.${free ? ' And it\'s free.' : ''} Go check it out.`,
  ];
  return t[hashPick(event.id, t.length)];
}

// ---- Diversify picks: avoid duplicating same team or sport ----

function diversePicks(scored, count, minScore) {
  const picks = [];
  const usedTeams = new Set();
  const usedSports = new Set();

  for (const item of scored) {
    if (picks.length >= count) break;
    if (item.score < minScore) break;

    const teamAlready = usedTeams.has(item.event.homeTeam);
    const sportAlready = usedSports.has(item.event.sport);

    if (teamAlready && sportAlready && picks.length > 0) continue;
    if (teamAlready && picks.length >= 2) continue;

    picks.push(item);
    usedTeams.add(item.event.homeTeam);
    usedSports.add(item.event.sport);
  }

  return picks;
}

// ---- Main ----

function main() {
  const events = loadJSON(EVENTS_PATH);
  const teams = loadJSON(TEAMS_PATH);
  const venues = loadJSON(VENUES_PATH);

  let upcoming = getUpcoming(events, LOOKAHEAD_DAYS);
  console.log(`\n[featured] ${upcoming.length} events in next ${LOOKAHEAD_DAYS} days`);

  if (upcoming.length === 0) {
    upcoming = getUpcoming(events, 30);
    console.log(`[featured] Expanded to 30-day window: ${upcoming.length} events`);
  }

  if (upcoming.length === 0) {
    console.log('[featured] No upcoming events found — keeping existing featured.json');
    return;
  }

  const gotwScored = upcoming
    .map(e => ({ event: e, score: scoreGOTW(e, teams) }))
    .sort((a, b) => b.score - a.score);

  const gotwPicks = diversePicks(gotwScored, GOTW_COUNT, MIN_GOTW_SCORE);
  const gotwIds = new Set(gotwPicks.map(g => g.event.id));

  const gemScored = upcoming
    .filter(e => !gotwIds.has(e.id))
    .map(e => ({ event: e, score: scoreGem(e, teams, venues) }))
    .sort((a, b) => b.score - a.score);

  const gemPicks = diversePicks(gemScored, GEM_COUNT, MIN_GEM_SCORE);

  const today = new Date().toISOString().split('T')[0] + 'T00:00:00Z';
  const featured = [];

  for (const { event } of gotwPicks) {
    featured.push({
      id: `gotw-${event.id}`,
      type: 'game-of-week',
      title: gotwTitle(event, teams),
      description: gotwDesc(event, teams, venues),
      eventId: event.id,
      imageUrl: null,
      publishDate: today,
    });
  }

  for (const { event } of gemPicks) {
    featured.push({
      id: `gem-${event.id}`,
      type: 'hidden-gem',
      title: gemTitle(event, teams),
      description: gemDesc(event, teams, venues),
      eventId: event.id,
      imageUrl: null,
      publishDate: today,
    });
  }

  fs.writeFileSync(FEATURED_PATH, JSON.stringify(featured, null, 2) + '\n');
  console.log(`[featured] Generated ${gotwPicks.length} Game of the Week + ${gemPicks.length} Hidden Gem picks`);

  for (const { event, score } of gotwPicks) {
    console.log(`  GOTW: ${event.eventName || event.id} (score: ${score})`);
  }
  for (const { event, score } of gemPicks) {
    console.log(`  GEM:  ${event.eventName || event.id} (score: ${score})`);
  }
}

main();
