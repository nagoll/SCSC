import { formatDateLong, formatTime } from '@/lib/calendar';
import { getEvents, getTeams, getVenues } from '@/lib/data';
import { SPORT_LABELS, LEVEL_LABELS } from '@/lib/constants';
import { SITE_DESCRIPTION, SITE_URL, STATIC_PAGES, eventTitle, eventUrl, upcomingEvents } from '@/lib/seo';

// llms.txt (https://llmstxt.org): a plain-markdown summary of the site plus the
// next two weeks of events, so AI assistants can answer "what's on in LA?"
// without parsing the calendar UI.
export const dynamic = 'force-dynamic';

const WINDOW_DAYS = 14;

export async function GET() {
  const [events, teams, venues] = await Promise.all([getEvents(), getTeams(), getVenues()]);
  const teamById = new Map(teams.map((t) => [t.id, t]));
  const venueById = new Map(venues.map((v) => [v.id, v]));
  const now = Date.now();
  const until = now + WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const soon = upcomingEvents(events, now).filter((e) => Date.parse(e.dateTime) <= until);

  const lines: string[] = [
    '# SCSC — Southern California Sports Calendar',
    '',
    `> ${SITE_DESCRIPTION} Schedules are refreshed daily from official team and athletics sources. All times are Pacific.`,
    '',
    '## Pages',
    '',
    ...STATIC_PAGES.map((p) => `- [${p.title}](${SITE_URL}${p.path}): ${p.description}`),
    `- [Sitemap](${SITE_URL}/sitemap.xml): every event page`,
    '',
    `## Events in the next ${WINDOW_DAYS} days`,
  ];

  let day = '';
  for (const e of soon) {
    const d = formatDateLong(e.dateTime);
    if (d !== day) {
      lines.push('', `### ${d}`, '');
      day = d;
    }
    const home = teamById.get(e.homeTeam);
    const away = e.awayTeam ? teamById.get(e.awayTeam) : null;
    const venue = venueById.get(e.venue);
    const time = formatTime(e.dateTime);
    lines.push(
      `- ${time} · [${eventTitle(e, home, away)}](${eventUrl(e.id)}) · ${LEVEL_LABELS[e.level]} ${SPORT_LABELS[e.sport]}${venue ? ` · ${venue.name}` : ''}`,
    );
  }
  if (soon.length === 0) lines.push('', 'No events scheduled in this window.');

  return new Response(lines.join('\n') + '\n', {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
