-- Core schema for SCSC: teams, venues, events, featured.
-- Column names match the existing TS types (src/lib/types.ts) and zod schema
-- (scripts/schema.js) exactly, camelCase and all, so the data-access layer
-- needs no field-name translation.

create table teams (
  id text primary key,
  name text not null,
  "shortName" text not null,
  level text not null check (level in ('pro', 'college', 'juco', 'high_school')),
  school text,
  conference text,
  sport text[] not null,
  "logoUrl" text,
  "primaryColor" text not null,
  "secondaryColor" text not null,
  "ticketUrl" text,
  "websiteUrl" text
);

create table venues (
  id text primary key,
  name text not null,
  address text not null,
  neighborhood text not null check (neighborhood in (
    'downtown', 'westside', 'south-bay', 'san-fernando-valley', 'san-gabriel-valley',
    'east-la', 'south-la', 'gateway-cities', 'antelope-valley'
  )),
  lat double precision not null,
  lng double precision not null,
  capacity integer,
  "parkingInfo" text,
  "transitInfo" text
);

create table events (
  id text primary key,
  sport text not null check (sport in (
    'football', 'basketball', 'baseball', 'softball', 'soccer', 'hockey', 'volleyball',
    'track', 'tennis', 'swimming', 'golf', 'lacrosse', 'water-polo', 'cricket', 'other'
  )),
  level text not null check (level in ('pro', 'college', 'juco', 'high_school')),
  gender text not null check (gender in ('mens', 'womens', 'coed')),
  "homeTeam" text not null references teams(id),
  "awayTeam" text references teams(id),
  "eventName" text,
  "dateTime" timestamptz not null,
  "endTime" timestamptz,
  venue text not null references venues(id),
  "venueSourceName" text,
  "venueConfidence" text not null check ("venueConfidence" in ('verified', 'likely', 'unverified')),
  "isNeutralSite" boolean not null default false,
  "ticketUrl" text,
  price text not null check (price in ('free', 'under_20', 'under_50', 'over_50', 'tbd')),
  conference text,
  league text,
  "isFeatured" boolean not null default false,
  source text not null,
  "lastUpdated" timestamptz not null
);

create index events_datetime_idx on events ("dateTime");

create table featured (
  id text primary key,
  type text not null check (type in ('game-of-week', 'hidden-gem')),
  title text not null,
  description text not null,
  "eventId" text references events(id),
  "imageUrl" text,
  "publishDate" timestamptz not null
);

-- Public read access; all writes go through the service-role key (scripts/API
-- routes), which bypasses RLS, so no insert/update/delete policies yet.
alter table teams enable row level security;
alter table venues enable row level security;
alter table events enable row level security;
alter table featured enable row level security;

create policy "public read" on teams for select using (true);
create policy "public read" on venues for select using (true);
create policy "public read" on events for select using (true);
create policy "public read" on featured for select using (true);
