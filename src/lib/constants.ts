import type { Sport, Level, Gender, PriceRange, TimeOfDay, DayType, Area, Filters } from './types';

export const SPORT_LABELS: Record<Sport, string> = {
  football: 'Football',
  basketball: 'Basketball',
  baseball: 'Baseball',
  softball: 'Softball',
  soccer: 'Soccer',
  hockey: 'Hockey',
  volleyball: 'Volleyball',
  track: 'Track & Field',
  tennis: 'Tennis',
  swimming: 'Swimming',
  golf: 'Golf',
  lacrosse: 'Lacrosse',
  'water-polo': 'Water Polo',
  cricket: 'Cricket',
  other: 'Other',
};

export const LEVEL_LABELS: Record<Level, string> = {
  pro: 'Professional',
  college: 'College',
  juco: 'Junior College',
  high_school: 'High School',
};

export const GENDER_LABELS: Record<Gender, string> = {
  mens: "Men's / Boys",
  womens: "Women's / Girls",
  coed: 'Co-ed',
};

export const PRICE_LABELS: Record<PriceRange, string> = {
  free: 'Free',
  under_20: 'Under $20',
  under_50: 'Under $50',
  over_50: '$50+',
  tbd: 'TBD',
};

export const TIME_LABELS: Record<TimeOfDay, string> = {
  morning: 'Morning (before 12pm)',
  afternoon: 'Afternoon (12pm–5pm)',
  evening: 'Evening (after 5pm)',
};

export const DAY_TYPE_LABELS: Record<DayType, string> = {
  weekday: 'Weekday',
  weekend: 'Weekend',
};

export const AREA_LABELS: Record<Area, string> = {
  downtown: 'Downtown / Central LA',
  westside: 'Westside',
  'south-bay': 'South Bay',
  'san-fernando-valley': 'San Fernando Valley',
  'san-gabriel-valley': 'San Gabriel Valley',
  'east-la': 'East LA',
  'south-la': 'South LA',
  'gateway-cities': 'Gateway Cities',
  'antelope-valley': 'Antelope Valley',
};

export const SPORT_ICONS: Record<Sport, string> = {
  football: '🏈',
  basketball: '🏀',
  baseball: '⚾',
  softball: '🥎',
  soccer: '⚽',
  hockey: '🏒',
  volleyball: '🏐',
  track: '🏃',
  tennis: '🎾',
  swimming: '🏊',
  golf: '⛳',
  lacrosse: '🥍',
  'water-polo': '🤽',
  cricket: '🏏',
  other: '🏆',
};

export const LEVEL_COLORS: Record<Level, { bg: string; text: string }> = {
  pro: { bg: 'bg-amber-600', text: 'text-white' },
  college: { bg: 'bg-blue-700', text: 'text-white' },
  juco: { bg: 'bg-emerald-600', text: 'text-white' },
  high_school: { bg: 'bg-purple-600', text: 'text-white' },
};

export const DEFAULT_FILTERS: Filters = {
  sport: [],
  level: [],
  timeOfDay: [],
  dayType: [],
  gender: [],
  price: [],
  area: [],
  team: [],
  venue: [],
  conference: [],
  search: '',
};

export const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
] as const;
