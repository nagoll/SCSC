'use client';

import type { Filters, Team, Venue, NearMeState } from '@/lib/types';
import { getActiveFilterCount } from '@/lib/filters';
import FilterSidebar from './FilterSidebar';

interface FilterDrawerProps {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  teams: Record<string, Team>;
  venues: Record<string, Venue>;
  nearMe: NearMeState;
  onNearMeChange: (state: NearMeState) => void;
}

export default function FilterDrawer({
  open,
  onClose,
  filters,
  onFiltersChange,
  teams,
  venues,
  nearMe,
  onNearMeChange,
}: FilterDrawerProps) {
  const activeCount = getActiveFilterCount(filters);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-80 max-w-[85vw] transform bg-cream shadow-xl transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Drawer Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <span className="font-display text-lg tracking-wide text-navy uppercase">
              Filters
              {activeCount > 0 && (
                <span className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-burnt-orange text-[10px] font-bold text-white">
                  {activeCount}
                </span>
              )}
            </span>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-ink-light hover:bg-cream-dark"
              aria-label="Close filters"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Drawer Body */}
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <FilterSidebar
              filters={filters}
              onFiltersChange={onFiltersChange}
              teams={teams}
              venues={venues}
              nearMe={nearMe}
              onNearMeChange={onNearMeChange}
            />
          </div>

          {/* Drawer Footer */}
          <div className="border-t border-border px-4 py-3">
            <button
              onClick={onClose}
              className="w-full rounded-md bg-navy py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-light"
            >
              Show Results
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
