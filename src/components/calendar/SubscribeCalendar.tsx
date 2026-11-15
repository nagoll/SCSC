'use client';

import { useState } from 'react';
import type { Filters, Team } from '@/lib/types';
import { FEED_PATH, feedName, feedUrl, subscribeLinks } from '@/lib/ics';
import { filtersToSearchParams } from '@/lib/filters';

interface SubscribeCalendarProps {
  filters: Filters;
  teams: Record<string, Team>;
  nearMeActive: boolean;
}

const itemClass =
  'flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-left text-sm text-ink hover:bg-cream-dark';

export default function SubscribeCalendar({ filters, teams, nearMeActive }: SubscribeCalendarProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Only computed while open, i.e. after a click, so `window` is always defined.
  const name = feedName(filters, teams);
  const url = open ? feedUrl(filters, window.location.origin) : '';
  const links = open ? subscribeLinks(url, name) : null;
  const qs = filtersToSearchParams(filters).toString();

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-surface px-4 py-2 text-sm font-medium text-ink-light transition-colors hover:bg-cream-dark"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
        Subscribe to calendar
      </button>

      {open && links && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-md border border-border bg-surface shadow-lg">
            <div className="px-4 py-3">
              <div className="text-sm font-semibold text-ink">{name}</div>
              <p className="mt-1 text-xs text-ink-muted">
                Every game matching your current filters. Subscribed calendars update on their own as schedules change.
              </p>
              {nearMeActive && (
                <p className="mt-1 text-xs text-burnt-orange">Near Me isn&apos;t part of the feed. Use the Area filter instead.</p>
              )}
            </div>
            <a href={links.webcal} className={itemClass}>Apple Calendar / Outlook app</a>
            <a href={links.google} target="_blank" rel="noopener noreferrer" className={itemClass}>Google Calendar</a>
            <a href={links.outlook} target="_blank" rel="noopener noreferrer" className={itemClass}>Outlook.com</a>
            <a href={`${FEED_PATH}${qs ? `?${qs}` : ''}`} download="scsc.ics" className={itemClass}>
              Download .ics (one-time copy)
            </a>
            <button onClick={copy} className={itemClass}>{copied ? 'Copied!' : 'Copy feed link'}</button>
          </div>
        </>
      )}
    </div>
  );
}
