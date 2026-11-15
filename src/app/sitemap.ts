import type { MetadataRoute } from 'next';
import { getEvents } from '@/lib/data';
import { SITE_URL, STATIC_PAGES, eventUrl, upcomingEvents } from '@/lib/seo';

// Events change daily; build the sitemap per request (crawlers fetch it rarely).
export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const events = upcomingEvents(await getEvents());
  return [
    ...STATIC_PAGES.map((p) => ({
      url: `${SITE_URL}${p.path === '/' ? '' : p.path}`,
      changeFrequency: 'daily' as const,
      priority: p.path === '/' ? 1 : 0.7,
    })),
    ...events.map((e) => ({
      url: eventUrl(e.id),
      lastModified: e.lastUpdated,
      changeFrequency: 'daily' as const,
      priority: 0.5,
    })),
  ];
}
