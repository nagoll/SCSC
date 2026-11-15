import type { Filters, SportEvent, Team, Venue } from './types';
import { SPORT_LABELS, LEVEL_LABELS, GENDER_LABELS, PRICE_LABELS } from './constants';
import { escapeICSText, formatCalendarDate, resolveEventWindow } from './calendar';
import { filtersToSearchParams } from './filters';
import { SITE_URL, eventTitle, eventUrl } from './seo';

// Subscribable calendar feeds: /calendar.ics takes the same query string as the
// filtered calendar (/?team=…&sport=…), so any view can become a feed that
// calendar apps re-fetch and that tracks the daily schedule refresh.

export const FEED_PATH = '/calendar.ics';

/** How far back a feed reaches, so a just-played game doesn't vanish from a subscriber's calendar. */
const PAST_DAYS = 7;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Absolute https feed URL for a set of filters. */
export function feedUrl(filters: Filters, origin = SITE_URL): string {
  const qs = filtersToSearchParams(filters).toString();
  return `${origin}${FEED_PATH}${qs ? `?${qs}` : ''}`;
}

/** Links that subscribe a calendar app to a feed (rather than importing a one-off copy). */
export function subscribeLinks(httpsUrl: string, name: string) {
  const webcal = httpsUrl.replace(/^https?:\/\//, 'webcal://');
  return {
    webcal, // Apple Calendar, Outlook desktop, most phone calendars
    google: `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(webcal)}`,
    outlook: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(httpsUrl)}&name=${encodeURIComponent(name)}`,
  };
}

function listNames(names: string[], max = 3): string {
  if (names.length <= max) return names.join(', ');
  return `${names.slice(0, max).join(', ')} +${names.length - max} more`;
}

/** Human name for a feed, shown as the calendar's title in the subscriber's app. */
export function feedName(filters: Filters, teams: Record<string, Team>): string {
  const parts: string[] = [];
  if (filters.team.length) parts.push(listNames(filters.team.map((id) => teams[id]?.shortName || teams[id]?.name || id)));
  const levels = filters.level.map((l) => LEVEL_LABELS[l]).filter(Boolean);
  const sports = filters.sport.map((s) => SPORT_LABELS[s]).filter(Boolean);
  if (levels.length || sports.length) parts.push(listNames([...levels, ...sports], 4));
  if (filters.search) parts.push(`“${filters.search}”`);
  return parts.length ? `SCSC: ${parts.join(' · ')}` : 'SCSC: All LA sports';
}

/** Folds a content line to 75 octets (RFC 5545 §3.1) without splitting a UTF-8 character. */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;
  const out: string[] = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const size = encoder.encode(ch).length;
    // Continuation lines start with a space, which counts toward their 75.
    if (bytes + size > (out.length ? 74 : 75)) {
      out.push(current);
      current = '';
      bytes = 0;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out.join('\r\n ');
}

export function buildFeed(
  events: SportEvent[],
  teams: Record<string, Team>,
  venues: Record<string, Venue>,
  name: string,
  now = Date.now(),
): string {
  const host = new URL(SITE_URL).hostname;
  const cutoff = now - PAST_DAYS * DAY_MS;
  const stamp = formatCalendarDate(new Date(now).toISOString());

  const lines: (string | null)[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SCSC//Southern California Sports Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICSText(name)}`,
    `X-WR-CALDESC:${escapeICSText(`LA County games from ${SITE_URL}. Schedules refresh daily.`)}`,
    'X-WR-TIMEZONE:America/Los_Angeles',
    // Hints for how often to re-fetch; schedules only change once a day.
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
    'X-PUBLISHED-TTL:PT12H',
  ];

  for (const e of events) {
    if (Date.parse(e.dateTime) < cutoff) continue;
    const home = teams[e.homeTeam];
    const away = e.awayTeam ? teams[e.awayTeam] : null;
    const venue = venues[e.venue];
    const { start, end } = resolveEventWindow({ start: e.dateTime, end: e.endTime });
    const url = eventUrl(e.id);
    const details = [
      `${GENDER_LABELS[e.gender]} ${LEVEL_LABELS[e.level]} ${SPORT_LABELS[e.sport]}${e.league ? ` · ${e.league}` : ''}`,
      `Price: ${PRICE_LABELS[e.price]}`,
      e.ticketUrl ? `Tickets: ${e.ticketUrl}` : null,
      `Details: ${url}`,
    ].filter(Boolean).join('\n');

    lines.push(
      'BEGIN:VEVENT',
      // Stable per game, so a rescheduled game moves instead of duplicating.
      `UID:${e.id}@${host}`,
      `DTSTAMP:${stamp}`,
      `LAST-MODIFIED:${formatCalendarDate(e.lastUpdated)}`,
      `DTSTART:${formatCalendarDate(start)}`,
      `DTEND:${formatCalendarDate(end)}`,
      `SUMMARY:${escapeICSText(eventTitle(e, home, away))}`,
      venue ? `LOCATION:${escapeICSText(`${venue.name}, ${venue.address}`)}` : null,
      venue ? `GEO:${venue.lat};${venue.lng}` : null,
      `DESCRIPTION:${escapeICSText(details)}`,
      `URL:${url}`,
      'END:VEVENT',
    );
  }

  lines.push('END:VCALENDAR');
  return lines.filter((l): l is string => l !== null).map(foldLine).join('\r\n') + '\r\n';
}
