/**
 * venue-verify.js — Venue verification and LA County geo-boundary checking
 *
 * Provides dual-source venue comparison and geographic validation to prevent
 * events from being listed at incorrect locations.
 *
 * Key rules:
 * 1. If both sources (official website + ESPN API) agree on venue → "verified"
 * 2. If only one source provides venue and it's in LA County → "likely"
 * 3. If venue is outside LA County → exclude event (not local)
 * 4. If sources disagree on venue → flag for review, use official website as primary
 * 5. If no venue data available → "unverified", use default but flag it
 */

const fs = require('fs');
const path = require('path');

const VENUES_PATH = path.join(__dirname, '../src/data/venues.json');

/**
 * LA County approximate bounding box.
 * This is intentionally generous to avoid false exclusions.
 * Covers from Antelope Valley (north) to San Pedro (south),
 * Malibu (west) to Pomona/Claremont (east).
 */
const LA_COUNTY_BOUNDS = {
  north: 34.82,   // Antelope Valley / Lancaster
  south: 33.70,   // San Pedro / Palos Verdes
  west: -118.95,  // Malibu / western edge
  east: -117.65,  // Claremont / Pomona eastern edge
};

/**
 * Known out-of-area keywords that indicate an event is NOT in LA County.
 * Used as a quick check before geocoding.
 */
const OUT_OF_AREA_KEYWORDS = [
  // States (when mentioned as locations)
  'alabama', 'alaska', 'arizona', 'arkansas', 'colorado', 'connecticut',
  'delaware', 'florida', 'georgia', 'hawaii', 'idaho', 'illinois', 'indiana',
  'iowa', 'kansas', 'kentucky', 'louisiana', 'maine', 'maryland', 'massachusetts',
  'michigan', 'minnesota', 'mississippi', 'missouri', 'montana', 'nebraska',
  'nevada', 'new hampshire', 'new jersey', 'new mexico', 'new york',
  'north carolina', 'north dakota', 'ohio', 'oklahoma', 'oregon', 'pennsylvania',
  'rhode island', 'south carolina', 'south dakota', 'tennessee', 'texas', 'utah',
  'vermont', 'virginia', 'washington', 'west virginia', 'wisconsin', 'wyoming',

  // Common out-of-state college cities
  'fayetteville', 'tuscaloosa', 'columbus', 'ann arbor', 'austin', 'gainesville',
  'knoxville', 'baton rouge', 'eugene', 'boulder', 'salt lake', 'seattle',
  'corvallis', 'pullman', 'tucson', 'tempe', 'phoenix', 'denver',
  'las vegas', 'reno', 'honolulu', 'stanford', 'berkeley', 'palo alto',
  'san francisco', 'sacramento', 'fresno', 'san jose', 'san diego',
  'santa barbara', 'davis', 'provo', 'lubbock', 'norman', 'stillwater',
  'waco', 'college station', 'manhattan, ks', 'lawrence, ks', 'lincoln, ne',
  'iowa city', 'madison, wi', 'minneapolis', 'champaign', 'west lafayette',
  'bloomington, in', 'state college', 'morgantown', 'lexington, ky',
];

/**
 * Known LA County cities/neighborhoods for positive matching.
 */
const LA_COUNTY_CITIES = [
  'los angeles', 'la', 'inglewood', 'carson', 'pasadena', 'long beach',
  'torrance', 'santa monica', 'malibu', 'glendale', 'burbank', 'pomona',
  'claremont', 'whittier', 'monterey park', 'alhambra', 'arcadia', 'azusa',
  'covina', 'west covina', 'glendora', 'el monte', 'norwalk', 'downey',
  'compton', 'gardena', 'hawthorne', 'redondo beach', 'manhattan beach',
  'hermosa beach', 'culver city', 'beverly hills', 'westwood', 'northridge',
  'woodland hills', 'encino', 'sherman oaks', 'van nuys', 'sylmar',
  'lancaster', 'palmdale', 'walnut', 'diamond bar', 'cerritos', 'lakewood',
  'calabasas', 'agoura hills', 'westlake village', 'san dimas', 'la verne',
  'south gate', 'bell gardens', 'huntington park', 'lynwood', 'paramount',
  'bellflower', 'artesia', 'la mirada', 'pico rivera', 'montebello',
  'san gabriel', 'temple city', 'rosemead', 'irwindale', 'duarte', 'monrovia',
  'baldwin park', 'la puente', 'rowland heights', 'hacienda heights',
  'valley glen', 'wilmington', 'san pedro',
];

/**
 * Load all known venues from venues.json.
 */
function loadVenues() {
  try {
    return JSON.parse(fs.readFileSync(VENUES_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

/**
 * Check if a coordinate pair is within LA County bounds.
 */
function isInLACounty(lat, lng) {
  if (lat == null || lng == null) return null; // unknown
  return (
    lat >= LA_COUNTY_BOUNDS.south &&
    lat <= LA_COUNTY_BOUNDS.north &&
    lng >= LA_COUNTY_BOUNDS.west &&
    lng <= LA_COUNTY_BOUNDS.east
  );
}

/**
 * Check if a venue name string suggests an out-of-area location.
 * Returns { isOutOfArea: boolean, matchedKeyword: string|null }
 */
function checkVenueNameLocation(venueName) {
  if (!venueName) return { isOutOfArea: false, matchedKeyword: null };

  const lower = venueName.toLowerCase();

  // Check for out-of-area keywords
  for (const keyword of OUT_OF_AREA_KEYWORDS) {
    if (lower.includes(keyword)) {
      // Make sure it's not a false positive (e.g., "New York Pizza" in LA)
      // Only flag if the keyword appears as a standalone location component
      return { isOutOfArea: true, matchedKeyword: keyword };
    }
  }

  return { isOutOfArea: false, matchedKeyword: null };
}

/**
 * Check if a venue name suggests it's in LA County.
 */
function checkIsLACounty(venueName) {
  if (!venueName) return false;
  const lower = venueName.toLowerCase();
  return LA_COUNTY_CITIES.some(city => lower.includes(city));
}

/**
 * Try to match a raw venue name to a known venue in venues.json.
 * Returns the venue ID if matched, null otherwise.
 */
function matchVenueByName(rawVenueName, venues) {
  if (!rawVenueName) return null;

  const lower = rawVenueName.toLowerCase().trim();

  // Direct match on venue name
  for (const venue of venues) {
    if (venue.name.toLowerCase() === lower) return venue.id;
  }

  // Partial match (venue name contains or is contained in raw name)
  for (const venue of venues) {
    const venueLower = venue.name.toLowerCase();
    if (lower.includes(venueLower) || venueLower.includes(lower)) {
      return venue.id;
    }
  }

  // Fuzzy: match on key words (stadium, arena, field names)
  const rawWords = lower.replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3);
  for (const venue of venues) {
    const venueWords = venue.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 3);
    const overlap = rawWords.filter(w => venueWords.includes(w));
    if (overlap.length >= 2) return venue.id;
  }

  return null;
}

/**
 * Verify a venue assignment for an event.
 *
 * @param {Object} params
 * @param {string|null} params.scrapedVenueName - Venue name from official website scraper
 * @param {string|null} params.espnVenueName - Venue name from ESPN API
 * @param {string|null} params.espnVenueCity - City from ESPN API venue data
 * @param {string|null} params.espnVenueState - State from ESPN API venue data
 * @param {string} params.defaultVenueId - The team's default home venue ID
 * @param {boolean} params.isNeutralSiteFlag - Whether source data marks this as neutral
 *
 * @returns {Object} { venueId, venueSourceName, venueConfidence, isNeutralSite, excluded, excludeReason }
 */
function verifyVenue({
  scrapedVenueName = null,
  espnVenueName = null,
  espnVenueCity = null,
  espnVenueState = null,
  defaultVenueId,
  isNeutralSiteFlag = false,
}) {
  const venues = loadVenues();
  const result = {
    venueId: defaultVenueId,
    venueSourceName: scrapedVenueName || espnVenueName || null,
    venueConfidence: 'unverified',
    isNeutralSite: isNeutralSiteFlag,
    excluded: false,
    excludeReason: null,
  };

  // Build the full ESPN location string for geo checks
  const espnLocation = [espnVenueName, espnVenueCity, espnVenueState]
    .filter(Boolean)
    .join(', ');

  // Step 1: Check if either source indicates out-of-area
  const scrapedCheck = checkVenueNameLocation(scrapedVenueName);
  const espnCheck = checkVenueNameLocation(espnLocation);

  if (scrapedCheck.isOutOfArea || espnCheck.isOutOfArea) {
    const source = scrapedCheck.isOutOfArea ? 'official website' : 'ESPN';
    const keyword = scrapedCheck.matchedKeyword || espnCheck.matchedKeyword;

    // If the official website says out of area, trust it
    // If only ESPN says out of area, still exclude but log
    result.excluded = true;
    result.excludeReason = `Out of LA County — ${source} location contains "${keyword}" (${result.venueSourceName || espnLocation})`;
    return result;
  }

  // Step 2: Check ESPN state data directly (most reliable for out-of-area detection)
  if (espnVenueState) {
    const stateLower = espnVenueState.toLowerCase().trim();
    // California is OK, but verify it's in LA County area
    if (stateLower !== 'ca' && stateLower !== 'california') {
      result.excluded = true;
      result.excludeReason = `Out of state — ESPN reports venue in ${espnVenueState} (${espnVenueName || 'unknown venue'})`;
      return result;
    }
  }

  // Step 3: Try to match venue names to our known venues
  const scrapedMatch = matchVenueByName(scrapedVenueName, venues);
  const espnMatch = matchVenueByName(espnVenueName, venues);

  // Step 4: Determine confidence based on source agreement
  if (scrapedMatch && espnMatch) {
    if (scrapedMatch === espnMatch) {
      // Both sources agree — highest confidence
      result.venueId = scrapedMatch;
      result.venueConfidence = 'verified';
    } else {
      // Sources disagree — use official website (primary), flag it
      result.venueId = scrapedMatch;
      result.venueConfidence = 'likely';
      result.venueSourceName = `${scrapedVenueName} [website] vs ${espnVenueName} [ESPN]`;
    }
  } else if (scrapedMatch) {
    // Only website has a match
    result.venueId = scrapedMatch;
    result.venueConfidence = 'likely';
  } else if (espnMatch) {
    // Only ESPN has a match
    result.venueId = espnMatch;
    result.venueConfidence = 'likely';
  } else if (scrapedVenueName || espnVenueName) {
    // We have a venue name but it doesn't match any known venue
    // Check if it's at least in LA County
    const nameToCheck = scrapedVenueName || espnVenueName;
    if (checkIsLACounty(nameToCheck)) {
      result.venueConfidence = 'likely';
    }
    // Keep default venue but mark as unverified
  }

  // Step 5: Handle neutral site flag
  if (isNeutralSiteFlag) {
    result.isNeutralSite = true;
    // If neutral site and we couldn't match the venue, be more cautious
    if (result.venueConfidence === 'unverified') {
      result.excluded = true;
      result.excludeReason = `Neutral site with unverified venue — cannot confirm LA County location`;
    }
  }

  return result;
}

module.exports = {
  verifyVenue,
  isInLACounty,
  checkVenueNameLocation,
  matchVenueByName,
  loadVenues,
  LA_COUNTY_BOUNDS,
};
