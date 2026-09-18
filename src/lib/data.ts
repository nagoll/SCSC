import { cache } from 'react';
import { supabase } from './supabase';
import type { SportEvent, Team, Venue, FeaturedContent } from './types';

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
  const { data, error } = await supabase.from('events').select('*').order('dateTime');
  if (error) throw new Error(`getEvents: ${error.message}`);
  return data as SportEvent[];
});

export const getFeatured = cache(async (): Promise<FeaturedContent[]> => {
  const { data, error } = await supabase.from('featured').select('*').order('id');
  if (error) throw new Error(`getFeatured: ${error.message}`);
  return data as FeaturedContent[];
});
