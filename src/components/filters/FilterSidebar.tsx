'use client';

import { useState } from 'react';
import type { Filters, Team, Venue, NearMeState } from '@/lib/types';
import {
  SPORT_LABELS,
  LEVEL_LABELS,
  GENDER_LABELS,
  PRICE_LABELS,
  TIME_LABELS,
  DAY_TYPE_LABELS,
  AREA_LABELS,
  DEFAULT_FILTERS,
} from '@/lib/constants';
import { getActiveFilterCount, isFiltersEmpty } from '@/lib/filters';

const RADIUS_OPTIONS = [5, 10, 25, 50] as const;

interface FilterSidebarProps {
  filters: Filters;
  onFiltersChange: (filters: Filters) => void;
  teams: Record<string, Team>;
  venues: Record<string, Venue>;
  nearMe: NearMeState;
  onNearMeChange: (state: NearMeState) => void;
}

function FilterSection({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border pb-3">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-2 text-sm font-semibold text-ink"
      >
        {title}
        <svg
          className={`h-4 w-4 text-ink-muted transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="2"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && <div className="mt-1 space-y-1">{children}</div>}
    </div>
  );
}

function CheckboxFilter({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm text-ink-light transition-colors hover:bg-cream-dark">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-border text-burnt-orange focus:ring-burnt-orange"
      />
      {label}
    </label>
  );
}

export default function FilterSidebar({
  filters,
  onFiltersChange,
  teams,
  venues,
  nearMe,
  onNearMeChange,
}: FilterSidebarProps) {
  const activeCount = getActiveFilterCount(filters);

  function requestNearMe() {
    onNearMeChange({ ...nearMe, status: 'loading', active: false });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onNearMeChange({
          active: true,
          status: 'granted',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          radiusMiles: nearMe.radiusMiles,
        });
      },
      () => {
        onNearMeChange({ ...nearMe, status: 'denied', active: false });
      }
    );
  }

  function toggleArrayFilter<K extends keyof Filters>(key: K, value: string) {
    const arr = filters[key] as string[];
    const newArr = arr.includes(value)
      ? arr.filter((v) => v !== value)
      : [...arr, value];
    onFiltersChange({ ...filters, [key]: newArr });
  }

  return (
    <div className="space-y-1">
      {/* Header */}
      <div className="flex items-center justify-between pb-2">
        <h3 className="font-display text-lg tracking-wide text-navy dark:text-gold uppercase">
          Filters
        </h3>
        {!isFiltersEmpty(filters) && (
          <button
            onClick={() => onFiltersChange(DEFAULT_FILTERS)}
            className="text-xs font-medium text-burnt-orange hover:text-burnt-orange-dark"
          >
            Clear All ({activeCount})
          </button>
        )}
      </div>

      {/* Near Me */}
      <div className="border-b border-border pb-3">
        <div className="py-2 text-sm font-semibold text-ink">Near Me</div>
        {nearMe.status === 'idle' && (
          <button
            onClick={requestNearMe}
            className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-sm text-ink-light transition-colors hover:bg-cream-dark hover:text-burnt-orange"
          >
            <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
            </svg>
            Use My Location
          </button>
        )}
        {nearMe.status === 'loading' && (
          <p className="px-1 py-1 text-xs text-ink-muted">Getting location...</p>
        )}
        {nearMe.status === 'denied' && (
          <p className="px-1 py-1 text-xs text-burnt-orange">Location denied. Enable in browser settings.</p>
        )}
        {nearMe.status === 'granted' && (
          <div className="space-y-2">
            <div className="flex gap-1">
              {RADIUS_OPTIONS.map((miles) => (
                <button
                  key={miles}
                  onClick={() => onNearMeChange({ ...nearMe, radiusMiles: miles })}
                  className={`flex-1 rounded py-1 text-xs font-medium transition-colors ${
                    nearMe.radiusMiles === miles
                      ? 'bg-navy text-white'
                      : 'border border-border text-ink-muted hover:bg-cream-dark'
                  }`}
                >
                  {miles}mi
                </button>
              ))}
            </div>
            <button
              onClick={() => onNearMeChange({ active: false, status: 'idle', lat: null, lng: null, radiusMiles: nearMe.radiusMiles })}
              className="text-xs text-ink-muted hover:text-burnt-orange"
            >
              Clear location
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="pb-3">
        <input
          type="text"
          placeholder="Search teams, venues..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-burnt-orange focus:outline-none focus:ring-1 focus:ring-burnt-orange"
        />
      </div>

      {/* Sport */}
      <FilterSection title="Sport" defaultOpen={true}>
        {(Object.entries(SPORT_LABELS) as [string, string][]).map(([key, label]) => (
          <CheckboxFilter
            key={key}
            label={label}
            checked={filters.sport.includes(key as never)}
            onChange={() => toggleArrayFilter('sport', key)}
          />
        ))}
      </FilterSection>

      {/* Level */}
      <FilterSection title="Level" defaultOpen={true}>
        {(Object.entries(LEVEL_LABELS) as [string, string][])
          .filter(([key]) => key !== 'high_school')
          .map(([key, label]) => (
            <CheckboxFilter
              key={key}
              label={label}
              checked={filters.level.includes(key as never)}
              onChange={() => toggleArrayFilter('level', key)}
            />
          ))}
      </FilterSection>

      {/* Time of Day */}
      <FilterSection title="Time of Day" defaultOpen={false}>
        {(Object.entries(TIME_LABELS) as [string, string][]).map(([key, label]) => (
          <CheckboxFilter
            key={key}
            label={label}
            checked={filters.timeOfDay.includes(key as never)}
            onChange={() => toggleArrayFilter('timeOfDay', key)}
          />
        ))}
      </FilterSection>

      {/* Day Type */}
      <FilterSection title="Day Type" defaultOpen={false}>
        {(Object.entries(DAY_TYPE_LABELS) as [string, string][]).map(([key, label]) => (
          <CheckboxFilter
            key={key}
            label={label}
            checked={filters.dayType.includes(key as never)}
            onChange={() => toggleArrayFilter('dayType', key)}
          />
        ))}
      </FilterSection>

      {/* Gender */}
      <FilterSection title="Gender" defaultOpen={false}>
        {(Object.entries(GENDER_LABELS) as [string, string][]).map(([key, label]) => (
          <CheckboxFilter
            key={key}
            label={label}
            checked={filters.gender.includes(key as never)}
            onChange={() => toggleArrayFilter('gender', key)}
          />
        ))}
      </FilterSection>

      {/* Price */}
      <FilterSection title="Price" defaultOpen={false}>
        {(Object.entries(PRICE_LABELS) as [string, string][]).map(([key, label]) => (
          <CheckboxFilter
            key={key}
            label={label}
            checked={filters.price.includes(key as never)}
            onChange={() => toggleArrayFilter('price', key)}
          />
        ))}
      </FilterSection>

      {/* Area */}
      <FilterSection title="Area" defaultOpen={false}>
        {(Object.entries(AREA_LABELS) as [string, string][]).map(([key, label]) => (
          <CheckboxFilter
            key={key}
            label={label}
            checked={filters.area.includes(key as never)}
            onChange={() => toggleArrayFilter('area', key)}
          />
        ))}
      </FilterSection>

      {/* Teams */}
      <FilterSection title="Team" defaultOpen={false}>
        {Object.values(teams)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((team) => (
            <CheckboxFilter
              key={team.id}
              label={team.name}
              checked={filters.team.includes(team.id)}
              onChange={() => toggleArrayFilter('team', team.id)}
            />
          ))}
      </FilterSection>

      {/* Venues */}
      <FilterSection title="Venue" defaultOpen={false}>
        {Object.values(venues)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((venue) => (
            <CheckboxFilter
              key={venue.id}
              label={venue.name}
              checked={filters.venue.includes(venue.id)}
              onChange={() => toggleArrayFilter('venue', venue.id)}
            />
          ))}
      </FilterSection>
    </div>
  );
}
