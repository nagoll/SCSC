/**
 * normalize.js
 * Maps raw data from any source into the canonical SportEvent schema.
 */

const SPORT_MAP = {
  // ESPN / API variants → canonical
  baseball: 'baseball',
  softball: 'softball',
  'mens-basketball': 'basketball',
  'womens-basketball': 'basketball',
  basketball: 'basketball',
  football: 'football',
  soccer: 'soccer',
  'mens-soccer': 'soccer',
  'womens-soccer': 'soccer',
  hockey: 'hockey',
  'mens-hockey': 'hockey',
  volleyball: 'volleyball',
  'womens-volleyball': 'volleyball',
  'mens-tennis': 'tennis',
  'womens-tennis': 'tennis',
  tennis: 'tennis',
  'track-and-field': 'track',
  'mens-track-and-field': 'track',
  'womens-track-and-field': 'track',
  'cross-country': 'track',
  swimming: 'swimming',
  'mens-swimming-and-diving': 'swimming',
  'womens-swimming-and-diving': 'swimming',
  golf: 'golf',
  'mens-golf': 'golf',
  'womens-golf': 'golf',
  lacrosse: 'lacrosse',
  'mens-lacrosse': 'lacrosse',
  'womens-lacrosse': 'lacrosse',
  'water-polo': 'water-polo',
  'mens-water-polo': 'water-polo',
  'womens-water-polo': 'water-polo',
  cricket: 'cricket',
};

const GENDER_MAP = {
  mens: 'mens',
  womens: 'womens',
  men: 'mens',
  women: 'womens',
  male: 'mens',
  female: 'womens',
  coed: 'coed',
  mixed: 'coed',
};

/**
 * Infer gender from sport string or explicit field.
 * e.g. "mens-basketball" → "mens", "womens-soccer" → "womens"
 */
function inferGender(raw, explicitGender) {
  if (explicitGender && GENDER_MAP[explicitGender.toLowerCase()]) {
    return GENDER_MAP[explicitGender.toLowerCase()];
  }
  const lower = (raw || '').toLowerCase();
  if (lower.startsWith('womens-') || lower.startsWith('women-') || lower.includes("women's")) return 'womens';
  if (lower.startsWith('mens-') || lower.startsWith('men-') || lower.includes("men's")) return 'mens';
  return 'mens'; // default
}

/**
 * Map a raw sport string to canonical sport value.
 */
function normalizeSport(raw) {
  if (!raw) return 'other';
  const key = raw.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z-]/g, '');
  return SPORT_MAP[key] || 'other';
}

/**
 * Normalize a price string / number to PriceRange enum.
 */
function normalizePrice(raw) {
  if (raw === null || raw === undefined || raw === '' || raw === 'free' || raw === 0) return 'free';
  const num = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[^0-9.]/g, ''));
  if (isNaN(num) || num === 0) return 'free';
  if (num < 20) return 'under_20';
  if (num < 50) return 'under_50';
  return 'over_50';
}

/**
 * Build a stable event ID from components.
 */
function buildEventId(teamId, dateStr, suffix = '') {
  const date = dateStr.slice(0, 10).replace(/-/g, '');
  return `${teamId}-${date}${suffix ? '-' + suffix : ''}`;
}

/**
 * Normalize a raw event from any source into the canonical SportEvent shape.
 *
 * @param {Object} raw
 * @param {string} raw.homeTeamId   - canonical team ID from teams.json
 * @param {string|null} raw.awayTeamId
 * @param {string} raw.sport        - raw sport string (will be normalized)
 * @param {string} raw.level        - 'pro' | 'college' | 'juco' | 'high_school'
 * @param {string} [raw.gender]     - raw gender string
 * @param {string} raw.dateTime     - ISO 8601 or parseable date string
 * @param {string|null} [raw.endTime]
 * @param {string} raw.venueId      - canonical venue ID from venues.json
 * @param {string|null} [raw.venueSourceName] - raw venue name from source data
 * @param {string} [raw.venueConfidence] - 'verified' | 'likely' | 'unverified'
 * @param {boolean} [raw.isNeutralSite] - whether this is a neutral site event
 * @param {string|null} [raw.eventName]
 * @param {string|null} [raw.ticketUrl]
 * @param {number|string|null} [raw.price]
 * @param {string|null} [raw.conference]
 * @param {string|null} [raw.league]
 * @param {string} raw.source       - fetcher identifier e.g. 'mlb-api', 'ucla-scraper'
 * @param {string} [raw.idSuffix]   - optional suffix for ID disambiguation
 */
function normalizeEvent(raw) {
  const sport = normalizeSport(raw.sport);
  const gender = inferGender(raw.sport, raw.gender);
  const dateTime = new Date(raw.dateTime).toISOString().slice(0, 19);
  const endTime = raw.endTime ? new Date(raw.endTime).toISOString().slice(0, 19) : null;
  const id = raw.id || buildEventId(raw.homeTeamId, dateTime, raw.idSuffix);

  return {
    id,
    sport,
    level: raw.level,
    gender,
    homeTeam: raw.homeTeamId,
    awayTeam: raw.awayTeamId || null,
    eventName: raw.eventName || null,
    dateTime,
    endTime,
    venue: raw.venueId,
    venueSourceName: raw.venueSourceName || null,
    venueConfidence: raw.venueConfidence || 'unverified',
    isNeutralSite: raw.isNeutralSite || false,
    ticketUrl: raw.ticketUrl || null,
    price: normalizePrice(raw.price),
    conference: raw.conference || null,
    league: raw.league || null,
    isFeatured: false,
    source: raw.source,
    lastUpdated: new Date().toISOString(),
  };
}

module.exports = { normalizeEvent, normalizeSport, normalizePrice, inferGender, buildEventId };
