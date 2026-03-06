const REFERRAL_SOURCE = 'scsc';

/**
 * Appends UTM referral parameters to any outbound ticket URL.
 * When referral/affiliate codes are established with athletic departments,
 * update this function to include the appropriate partner code.
 */
export function buildTicketUrl(baseUrl: string): string {
  try {
    const url = new URL(baseUrl);
    url.searchParams.set('utm_source', REFERRAL_SOURCE);
    url.searchParams.set('utm_medium', 'referral');
    url.searchParams.set('utm_campaign', 'tickets');
    return url.toString();
  } catch {
    return baseUrl;
  }
}
