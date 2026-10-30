import { cache } from 'react';
import { supabase } from './supabase';
import type { SportEvent, Team, Venue, FeaturedContent } from './types';

// Supabase returns at most 1000 rows per request, so tables that can outgrow
// that (events) are read a page at a time until a short page comes back.
const PAGE_SIZE = 1000;

async function selectAll<T>(table: string, orderBy: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .order(orderBy)
      .order('id')
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    rows.push(...(data as T[]));
    if (data.length < PAGE_SIZE) return rows;
  }
}

// Wrapped in React.cache so multiple calls within the same page render/build
// (e.g. generateMetadata + the page component) share one Supabase query.

export const getTeams = cache(async (): Promise<Team[]> => {
  const { data, error } = await supabase.from('teams').select('*').order('id');
  if (error) throw new Error(`getTeams: ${error.message}`);
  return data as Team[];
});

export const getVenues = cache(async (): Promise<Venue[]> => {
  const { data, error } = await supabase.from('venues').select('*').order('id');
  if (error) throw new Error(`getVenues: ${error.message}`);
  return data as Venue[];
});

export const getEvents = cache(async (): Promise<SportEvent[]> => {
  try {
    return await selectAll<SportEvent>('events', 'dateTime');
  } catch (err) {
    throw new Error(`getEvents: ${(err as Error).message}`);
  }
});

export const getFeatured = cache(async (): Promise<FeaturedContent[]> => {
  const { data, error } = await supabase.from('featured').select('*').order('id');
  if (error) throw new Error(`getFeatured: ${error.message}`);
  return data as FeaturedContent[];
});
