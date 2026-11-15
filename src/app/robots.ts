import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/seo';

// Search engines and AI crawlers/assistants are all welcome. The AI agents are
// listed by name so the intent is explicit to each of them.
const AI_AGENTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User',
  'Google-Extended', 'PerplexityBot', 'Perplexity-User',
  'Applebot-Extended', 'CCBot', 'meta-externalagent', 'Bytespider', 'cohere-ai',
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/' },
      { userAgent: AI_AGENTS, allow: '/' },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
