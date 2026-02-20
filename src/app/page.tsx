import { Suspense } from 'react';
import HomePageClient from './HomePageClient';

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-ink-muted">Loading calendar...</div>
      </div>
    }>
      <HomePageClient />
    </Suspense>
  );
}
