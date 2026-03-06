import type { SportEvent, Filters, Venue, Team } from './types';
import { getTimeOfDay, getDayType } from './calendar';
import { DEFAULT_FILTERS } from './constants';

export function applyFilters(
  events: SportEvent[],
  filters: Filters,
  teams: Record<string, Team>,
  venues: Record<string, Venue>
): SportEvent[] {
  return events.filter((event) => {
    // Sport filter
    if (filters.sport.length > 0 && !filters.sport.includes(event.sport)) {
      return false;
    }

    // Level filter
    if (filters.level.length > 0 && !filters.level.includes(event.level)) {
      return false;
    }

    // Time of day filter
    if (filters.timeOfDay.length > 0 && !filters.timeOfDay.includes(getTimeOfDay(event.dateTime))) {
      return false;
    }

    // Day type filter
    if (filters.dayType.length > 0 && !filters.dayType.includes(getDayType(event.dateTime))) {
      return false;
    }

    // Gender filter
    if (filters.gender.length > 0 && !filters.gender.includes(event.gender)) {
      return false;
    }

    // Price filter
    if (filters.price.length > 0 && !filters.price.includes(event.price)) {
      return false;
    }

    // Area filter
    if (filters.area.length > 0) {
      const venue = venues[event.venue];
      if (venue && !filters.area.includes(venue.neighborhood)) {
        return false;
      }
    }

    // Team filter
    if (filters.team.length > 0) {
      const matchesTeam =
        filters.team.includes(event.homeTeam) ||
        (event.awayTeam !== null && filters.team.includes(event.awayTeam));
      if (!matchesTeam) return false;
    }

    // Venue filter
    if (filters.venue.length > 0 && !filters.venue.includes(event.venue)) {
      return false;
    }

    // Conference filter
    if (filters.conference.length > 0) {
      if (!event.conference || !filters.conference.includes(event.conference)) {
        return false;
      }
    }

    // Search text filter
    if (filters.search) {
      const query = filters.search.toLowerCase();
      const homeTeam = teams[event.homeTeam];
      const awayTeam = event.awayTeam ? teams[event.awayTeam] : null;
      const venue = venues[event.venue];
      const searchable = [
        homeTeam?.name,
        homeTeam?.shortName,
        awayTeam?.name,
        awayTeam?.shortName,
        event.eventName,
        venue?.name,
        event.sport,
        event.conference,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      if (!searchable.includes(query)) {
        return false;
      }
    }

    return true;
  });
}

export function filtersToSearchParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(filters)) {
    if (key === 'search' && value) {
      params.set('q', value as string);
    } else if (Array.isArray(value) && value.length > 0) {
      params.set(key, value.join(','));
    }
  }

  return params;
}

export function searchParamsToFilters(params: URLSearchParams): Filters {
  const filters = { ...DEFAULT_FILTERS };

  const arrayKeys = [
    'sport', 'level', 'timeOfDay', 'dayType', 'gender',
    'price', 'area', 'team', 'venue', 'conference',
  ] as const;

  for (const key of arrayKeys) {
    const value = params.get(key);
    if (value) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (filters as any)[key] = value.split(',');
    }
  }

  const search = params.get('q');
  if (search) {
    filters.search = search;
  }

  return filters;
}

export function isFiltersEmpty(filters: Filters): boolean {
  return (
    filters.sport.length === 0 &&
    filters.level.length === 0 &&
    filters.timeOfDay.length === 0 &&
    filters.dayType.length === 0 &&
    filters.gender.length === 0 &&
    filters.price.length === 0 &&
    filters.area.length === 0 &&
    filters.team.length === 0 &&
    filters.venue.length === 0 &&
    filters.conference.length === 0 &&
    filters.search === ''
  );
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3959; // Earth radius in miles
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLng = (lng2 - lng1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getVenuesWithinRadius(
  venues: Record<string, Venue>,
  userLat: number,
  userLng: number,
  radiusMiles: number
): Set<string> {
  const result = new Set<string>();
  for (const [id, venue] of Object.entries(venues)) {
    if (haversineDistance(userLat, userLng, venue.lat, venue.lng) <= radiusMiles) {
      result.add(id);
    }
  }
  return result;
}

export function getActiveFilterCount(filters: Filters): number {
  let count = 0;
  for (const [key, value] of Object.entries(filters)) {
    if (key === 'search' && value) count++;
    else if (Array.isArray(value)) count += value.length;
  }
  return count;
}
