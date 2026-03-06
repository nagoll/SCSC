export type Sport =
  | 'football'
  | 'basketball'
  | 'baseball'
  | 'softball'
  | 'soccer'
  | 'hockey'
  | 'volleyball'
  | 'track'
  | 'tennis'
  | 'swimming'
  | 'golf'
  | 'lacrosse'
  | 'water-polo'
  | 'cricket'
  | 'other';

export type Level = 'pro' | 'college' | 'juco' | 'high_school';

export type Gender = 'mens' | 'womens' | 'coed';

export type PriceRange = 'free' | 'under_20' | 'under_50' | 'over_50' | 'tbd';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export type DayType = 'weekday' | 'weekend';

export type Area =
  | 'downtown'
  | 'westside'
  | 'south-bay'
  | 'san-fernando-valley'
  | 'san-gabriel-valley'
  | 'east-la'
  | 'south-la'
  | 'gateway-cities'
  | 'antelope-valley';

export type CalendarViewMode = 'month' | 'week' | 'day';

export interface Team {
  id: string;
  name: string;
  shortName: string;
  level: Level;
  school: string | null;
  conference: string | null;
  sport: Sport[];
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  ticketUrl?: string | null; // athletic department ticket page for referral links
}

export interface Venue {
  id: string;
  name: string;
  address: string;
  neighborhood: Area;
  lat: number;
  lng: number;
  capacity: number | null;
  parkingInfo: string | null;
  transitInfo: string | null;
}

export interface SportEvent {
  id: string;
  sport: Sport;
  level: Level;
  gender: Gender;
  homeTeam: string; // team ID
  awayTeam: string | null; // team ID or null for tournaments
  eventName: string | null;
  dateTime: string; // ISO 8601
  endTime: string | null;
  venue: string; // venue ID
  ticketUrl: string | null;
  price: PriceRange;
  conference: string | null;
  league: string | null;
  isFeatured: boolean;
  source: string;
  lastUpdated: string;
}

export interface FeaturedContent {
  id: string;
  type: 'game-of-week' | 'hidden-gem';
  title: string;
  description: string;
  eventId: string | null;
  imageUrl: string | null;
  publishDate: string;
}

export interface Filters {
  sport: Sport[];
  level: Level[];
  timeOfDay: TimeOfDay[];
  dayType: DayType[];
  gender: Gender[];
  price: PriceRange[];
  area: Area[];
  team: string[];
  venue: string[];
  conference: string[];
  search: string;
}

export interface SavedFilter {
  id: string;
  name: string;
  filters: Filters;
}

export interface NearMeState {
  active: boolean;
  status: 'idle' | 'loading' | 'granted' | 'denied';
  lat: number | null;
  lng: number | null;
  radiusMiles: number;
}
