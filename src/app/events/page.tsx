import type { Metadata } from 'next';
import { Suspense } from 'react';
import EventsListClient from './EventsListClient';

export const metadata: Metadata = {
  title: 'All Events — SCSC',
  description: 'Browse every upcoming sporting event in LA County — filter by sport, level, and date.',
};

export default function EventsPage() {
  return (
    <Suspense>
      <EventsListClient />
    </Suspense>
  );
}
