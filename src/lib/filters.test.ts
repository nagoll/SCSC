import { describe, it, expect } from 'vitest';
import {
  applyFilters,
  isFiltersEmpty,
  getActiveFilterCount,
  filtersToSearchParams,
  searchParamsToFilters,
  getVenuesWithinRadius,
} from './filters';
import { DEFAULT_FILTERS } from './constants';
import type { SportEvent, Team, Venue, Filters } from './types';

const teams: Record<string, Team> = {
  'usc-trojans': {
    id: 'usc-trojans',
    name: 'USC Trojans',
    shortName: 'USC',
    level: 'college',
    school: 'USC',
    conference: 'Big Ten',
    sport: ['basketball'],
    logoUrl: null,
    primaryColor: '#990000',
    secondaryColor: '#FFC72C',
  },
  'ucla-bruins': {
    id: 'ucla-bruins',
    name: 'UCLA Bruins',
    shortName: 'UCLA',
    level: 'college',
    school: 'UCLA',
    conference: 'Big Ten',
    sport: ['basketball'],
    logoUrl: null,
    primaryColor: '#2774AE',
    secondaryColor: '#FFD100',
  },
};

const venues: Record<string, Venue> = {
  'galen-center': {
    id: 'galen-center',
    name: 'Galen Center',
    address: '3400 S Figueroa St',
    neighborhood: 'downtown',
    lat: 34.022,
    lng: -118.286,
    capacity: 10258,
    parkingInfo: null,
    transitInfo: null,
  },
  'pauley-pavilion': {
    id: 'pauley-pavilion',
    name: 'Pauley Pavilion',
    address: '301 Westwood Plaza',
    neighborhood: 'westside',
    lat: 34.0708,
    lng: -118.4473,
    capacity: 13800,
    parkingInfo: null,
    transitInfo: null,
  },
};

function makeEvent(overrides: Partial<SportEvent>): SportEvent {
  return {
    id: 'usc-trojans-20260101',
    sport: 'basketball',
    level: 'college',
    gender: 'mens',
    homeTeam: 'usc-trojans',
    awayTeam: 'ucla-bruins',
    eventName: null,
    dateTime: '2026-01-01T20:00:00.000Z', // Thu noon PST -> weekday, afternoon
    endTime: null,
    venue: 'galen-center',
    venueSourceName: 'Galen Center',
    venueConfidence: 'verified',
    isNeutralSite: false,
    ticketUrl: null,
    price: 'under_50',
    conference: null,
    league: null,
    isFeatured: false,
    source: 'pro-api:test',
    lastUpdated: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('applyFilters', () => {
  const events = [
    makeEvent({ id: 'e1', sport: 'basketball', level: 'college', price: 'under_50', venue: 'galen-center', homeTeam: 'usc-trojans' }),
    makeEvent({ id: 'e2', sport: 'baseball', level: 'pro', price: 'free', venue: 'pauley-pavilion', homeTeam: 'ucla-bruins', awayTeam: null }),
  ];

  it('returns all events when no filters are active', () => {
    expect(applyFilters(events, DEFAULT_FILTERS, teams, venues)).toHaveLength(2);
  });

  it('filters by sport', () => {
    const filters: Filters = { ...DEFAULT_FILTERS, sport: ['baseball'] };
    const result = applyFilters(events, filters, teams, venues);
    expect(result.map((e) => e.id)).toEqual(['e2']);
  });

  it('filters by level', () => {
    const filters: Filters = { ...DEFAULT_FILTERS, level: ['pro'] };
    expect(applyFilters(events, filters, teams, venues).map((e) => e.id)).toEqual(['e2']);
  });

  it('filters by price', () => {
    const filters: Filters = { ...DEFAULT_FILTERS, price: ['free'] };
    expect(applyFilters(events, filters, teams, venues).map((e) => e.id)).toEqual(['e2']);
  });

  it('filters by area via the venue neighborhood', () => {
    const filters: Filters = { ...DEFAULT_FILTERS, area: ['westside'] };
    expect(applyFilters(events, filters, teams, venues).map((e) => e.id)).toEqual(['e2']);
  });

  it('filters by team, matching either home or away', () => {
    const filters: Filters = { ...DEFAULT_FILTERS, team: ['ucla-bruins'] };
    // e1 has ucla-bruins as away, e2 has it as home
    expect(applyFilters(events, filters, teams, venues).map((e) => e.id).sort()).toEqual(['e1', 'e2']);
  });

  it('filters by venue', () => {
    const filters: Filters = { ...DEFAULT_FILTERS, venue: ['pauley-pavilion'] };
    expect(applyFilters(events, filters, teams, venues).map((e) => e.id)).toEqual(['e2']);
  });

  it('filters by free-text search across team/venue names', () => {
    const filters: Filters = { ...DEFAULT_FILTERS, search: 'pauley' };
    expect(applyFilters(events, filters, teams, venues).map((e) => e.id)).toEqual(['e2']);
  });

  it('combines multiple filters with AND semantics', () => {
    const filters: Filters = { ...DEFAULT_FILTERS, sport: ['basketball'], level: ['college'] };
    expect(applyFilters(events, filters, teams, venues).map((e) => e.id)).toEqual(['e1']);
  });
});

describe('isFiltersEmpty / getActiveFilterCount', () => {
  it('reports the default filters as empty', () => {
    expect(isFiltersEmpty(DEFAULT_FILTERS)).toBe(true);
    expect(getActiveFilterCount(DEFAULT_FILTERS)).toBe(0);
  });

  it('reports a populated filter as non-empty and counts entries', () => {
    const filters: Filters = { ...DEFAULT_FILTERS, sport: ['basketball', 'football'], search: 'lakers' };
    expect(isFiltersEmpty(filters)).toBe(false);
    expect(getActiveFilterCount(filters)).toBe(3); // 2 sports + 1 search
  });
});

describe('filtersToSearchParams / searchParamsToFilters round-trip', () => {
  it('round-trips array and search filters through URL params', () => {
    const filters: Filters = {
      ...DEFAULT_FILTERS,
      sport: ['basketball', 'baseball'],
      level: ['pro'],
      search: 'dodgers',
    };
    const params = filtersToSearchParams(filters);
    expect(params.get('sport')).toBe('basketball,baseball');
    expect(params.get('q')).toBe('dodgers');

    const roundTripped = searchParamsToFilters(params);
    expect(roundTripped.sport).toEqual(['basketball', 'baseball']);
    expect(roundTripped.level).toEqual(['pro']);
    expect(roundTripped.search).toBe('dodgers');
  });

  it('produces empty params for the default filters', () => {
    expect(filtersToSearchParams(DEFAULT_FILTERS).toString()).toBe('');
  });
});

describe('getVenuesWithinRadius', () => {
  it('includes venues within the radius and excludes those outside it', () => {
    // Galen Center to itself is 0 miles; Pauley Pavilion is ~9-10 miles away
    const near = getVenuesWithinRadius(venues, 34.022, -118.286, 5);
    expect(near.has('galen-center')).toBe(true);
    expect(near.has('pauley-pavilion')).toBe(false);

    const far = getVenuesWithinRadius(venues, 34.022, -118.286, 50);
    expect(far.has('pauley-pavilion')).toBe(true);
  });
});
