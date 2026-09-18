/**
 * schema.js — Runtime validation for normalized events before they enter events.json.
 *
 * Mirrors the SportEvent shape in src/lib/types.ts. Scraped/API data is untrusted:
 * a source can change its markup or return a malformed field at any time, so every
 * event is validated at the ingestion boundary (in fetch-schedules.js, right before
 * merge) instead of relying on TypeScript types that only exist at compile time.
 */

const { z } = require('zod');

const SportEnum = z.enum([
  'football', 'basketball', 'baseball', 'softball', 'soccer', 'hockey',
  'volleyball', 'track', 'tennis', 'swimming', 'golf', 'lacrosse',
  'water-polo', 'cricket', 'other',
]);

const LevelEnum = z.enum(['pro', 'college', 'juco', 'high_school']);
const GenderEnum = z.enum(['mens', 'womens', 'coed']);
const PriceEnum = z.enum(['free', 'under_20', 'under_50', 'over_50', 'tbd']);
const VenueConfidenceEnum = z.enum(['verified', 'likely', 'unverified']);

const SportEventSchema = z.object({
  id: z.string().min(1),
  sport: SportEnum,
  level: LevelEnum,
  gender: GenderEnum,
  homeTeam: z.string().min(1),
  awayTeam: z.string().min(1).nullable(),
  eventName: z.string().nullable(),
  dateTime: z.string().datetime(),
  endTime: z.string().datetime().nullable(),
  venue: z.string().min(1),
  venueSourceName: z.string().nullable(),
  venueConfidence: VenueConfidenceEnum,
  isNeutralSite: z.boolean(),
  ticketUrl: z.string().nullable(),
  price: PriceEnum,
  conference: z.string().nullable(),
  league: z.string().nullable(),
  isFeatured: z.boolean(),
  source: z.string().min(1),
  lastUpdated: z.string().datetime(),
});

/**
 * Split a batch of normalized events into those that match the canonical
 * SportEvent shape and those that don't (with the reason why).
 */
function validateEvents(events) {
  const valid = [];
  const invalid = [];

  for (const event of events) {
    const result = SportEventSchema.safeParse(event);
    if (result.success) {
      valid.push(result.data);
    } else {
      const reasons = result.error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
      invalid.push({ event, reasons });
    }
  }

  return { valid, invalid };
}

module.exports = { SportEventSchema, validateEvents };
