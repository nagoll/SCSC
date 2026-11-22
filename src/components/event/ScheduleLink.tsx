import { scheduleUrlHost } from '@/lib/schedule-link';

/**
 * "Official schedule" card: links a game back to the team's own schedule
 * page it was read from, so people can confirm the time and admission at
 * the source. Renders nothing when the game has no schedule link.
 */
export default function ScheduleLink({ url, className = '' }: { url?: string | null; className?: string }) {
  const host = url ? scheduleUrlHost(url) : null;
  if (!url || !host) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-burnt-orange ${className}`}
    >
      <div className="min-w-0">
        <span className="text-sm text-ink-muted">Official schedule</span>
        <div className="mt-0.5 truncate font-semibold text-ink">See it on {host}</div>
        <p className="mt-0.5 text-xs text-ink-muted">Confirm the time and admission before you go.</p>
      </div>
      <svg className="h-5 w-5 shrink-0 text-ink-light" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
      </svg>
    </a>
  );
}
