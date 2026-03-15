'use client';

import { useState } from 'react';
import { generateICS, getGoogleCalendarUrl } from '@/lib/calendar';

interface AddToCalendarProps {
  title: string;
  start: string;
  end: string | null;
  location: string;
  description: string;
}

export default function AddToCalendar({
  title,
  start,
  end,
  location,
  description,
}: AddToCalendarProps) {
  const [showOptions, setShowOptions] = useState(false);

  const calEvent = { title, start, end, location, description };

  const handleICSDownload = () => {
    const ics = generateICS(calEvent);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.replace(/[^a-zA-Z0-9]/g, '_')}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setShowOptions(false);
  };

  const handleGoogleCalendar = () => {
    window.open(getGoogleCalendarUrl(calEvent), '_blank');
    setShowOptions(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-navy bg-navy py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-light"
      >
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
        Add to Calendar
      </button>

      {showOptions && (
        <div className="absolute left-0 right-0 z-10 mt-1 overflow-hidden rounded-md border border-border bg-surface shadow-lg">
          <button
            onClick={handleGoogleCalendar}
            className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-ink hover:bg-cream-dark"
          >
            Google Calendar
          </button>
          <button
            onClick={handleICSDownload}
            className="flex w-full items-center gap-2 border-t border-border px-4 py-2.5 text-left text-sm text-ink hover:bg-cream-dark"
          >
            Apple Calendar / Outlook (.ics)
          </button>
        </div>
      )}
    </div>
  );
}
