/** "https://www.gccathletics.com/composite" → "gccathletics.com"; null for a malformed URL. */
export function scheduleUrlHost(url: string): string | null {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}
