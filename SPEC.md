# SoCal Sports Calendar (SCSC) — Product Spec

## 1. Vision

A single destination where anyone in LA County can see every sporting event — pro, college, junior college, and high school — on one interactive calendar. No more checking 50+ team websites. Filter, browse, and discover games you never knew were happening.

---

## 2. Problem Statement

LA County is arguably the sports capital of the world: 11+ professional teams, two major D1 programs, dozens of community college teams, and 560+ high schools across two CIF sections. Yet there is no single place to see it all.

- **Today's workarounds:** Manually checking team sites, ESPN, CIF-SS/CIF-LA schedules, or generic "things to do" sites like WeLikeLA and MommyPoppins.
- **Existing tools fall short:** FixtureCalendar.com covers pro/international but not college or high school. AllSportDB is a database, not a calendar. Neither is LA-focused.
- **The gap:** A hyper-local, all-levels sports calendar with smart filtering — purpose-built for the LA County sports fan.

---

## 3. Target Audience

| Persona | Description |
|---|---|
| **The Weekend Planner** | Parent or couple looking for something to do this Saturday. Wants to browse by date and time. |
| **The Die-Hard** | Follows specific teams. Wants to track their schedule and discover nearby games on off-days. |
| **The Explorer** | Curious fan open to anything — college baseball on a Tuesday, high school football Friday night lights. Browses by sport or area. |
| **The Budget-Conscious Fan** | Knows that JuCo and high school games are cheap or free. Wants to filter by level. |

---

## 4. Core Features

### 4.1 Interactive Calendar

The centerpiece. A responsive calendar view with three modes:

| View | Description |
|---|---|
| **Month** | Bird's-eye overview. Days with events show dot indicators color-coded by sport. Click a day to drill in. |
| **Week** | Column-per-day layout showing event blocks with time, teams, and venue. |
| **Day** | Full detail list for a single day. Default view on mobile. |

Each event card displays:
- Sport icon + name
- Home team vs. Away team (or event name for tournaments/meets)
- Time (with morning/afternoon/evening badge)
- Venue name + neighborhood
- Level badge (Pro / College / JuCo / High School)
- Ticket link (when available)
- "Add to Calendar" button (Google, Apple, Outlook)

### 4.2 Filter System

The filter bar is persistent (sticky sidebar on desktop, slide-out drawer on mobile). All filters are combinable and update the calendar in real time.

| Filter | Options |
|---|---|
| **Sport** | Football, Basketball, Baseball/Softball, Soccer, Hockey, Volleyball, Track and Field, Tennis, Swimming, Golf, Lacrosse, Water Polo, Other |
| **Level** | Professional, College (NCAA D1/D2/D3), Junior College (CCCAA), High School (CIF-SS / CIF-LA City) |
| **Time of Day** | Morning (before 12pm), Afternoon (12pm-5pm), Evening (after 5pm) |
| **Day Type** | Weekday, Weekend |
| **Gender** | Men/Boys, Women/Girls, Co-ed |
| **Price** | Free, Under $20, Under $50, $50+ |
| **Area** | Sub-regions within LA County (Downtown/Central LA, Westside, South Bay, San Fernando Valley, San Gabriel Valley, East LA, South LA, Gateway Cities, Antelope Valley) |
| **Team** | Search/select specific teams (with autocomplete) |
| **Venue** | Search/select specific venues |
| **Conference/League** | NFL, NBA, MLB, NHL, MLS, NWSL, Big Ten, CCCAA Western State, CIF-SS leagues, CIF-LA City leagues, etc. |

**Saved Filters:** Users can save a filter combination (e.g., "Friday Night Football") for one-click access on return visits. Stored in localStorage, no account required.

### 4.3 Event Detail View

Clicking an event expands or opens a detail panel with:

- Full team names and logos/crests (where available)
- Date, time, doors open time (if known)
- Venue name, address, map embed
- Ticket purchase link (affiliate where applicable)
- Transit/parking info snippet
- Share button (copy link, Twitter/X, SMS)
- "Add to Calendar" export (.ics download + Google Calendar link)
- For high school / JuCo: note that these are often free or low-cost

### 4.4 Newsletter Signup (beehiiv Integration)

- **Sticky banner / footer CTA** on all pages with email input and subscribe button.
- **Dedicated signup section** on the homepage (above the fold, right-side or inline).
- **Exit-intent popup** (desktop) and **scroll-triggered popup** (mobile) — shown once per session.
- Integration via beehiiv embedded HTML form snippet.
- Placeholder for beehiiv publication ID — to be configured when the newsletter is set up.
- Copy angle: "Get the best LA sports events in your inbox every week. Pro to prep — we've got you covered."

### 4.5 Featured / Editorial Content Section

A section on the homepage (below the calendar or as a secondary tab) for curated content:

- **"Games of the Week"** — 3-5 hand-picked marquee matchups with short write-ups.
- **"Hidden Gems"** — Spotlight on lesser-known events (JuCo rivalry, high school playoff, etc.)
- **"This Weekend in LA Sports"** — Auto-generated summary of upcoming events grouped by day.

Content will be stored as structured data (JSON/Markdown) so it can be managed without code changes.

### 4.6 "What's On Now / Today" Quick View

A prominent section (top of homepage) showing:
- Events happening right now (live badge)
- Events happening today, sorted by next kickoff
- Quick count: "47 events today across LA County"

---

## 5. Teams and Events Scope (v1)

### 5.1 Professional (11+ teams)

| Sport | Teams |
|---|---|
| MLB | Dodgers |
| NFL | Rams, Chargers |
| NBA | Lakers, Clippers |
| WNBA | Sparks |
| NHL | Kings |
| MLS | LAFC, Galaxy |
| NWSL | Angel City FC |
| Cricket | LA Knight Riders |

Note: Angels (Anaheim) are in Orange County but could be included given proximity and fanbase.

### 5.2 College / University (NCAA)

| Division | Schools |
|---|---|
| D1 (FBS) | USC, UCLA |
| D1 (no football) | Pepperdine, LMU, CSUN, Long Beach State |
| D2 | Cal Poly Pomona |
| D3 | Claremont-Mudd-Scripps, Pomona-Pitzer, Caltech, Occidental, La Verne, Whittier, Redlands |

### 5.3 Junior College (CCCAA)

Key LA County community colleges with athletics:
East LA College, LA City College, LA Valley College, LA Pierce College, LA Harbor College, LA Mission College, LA Southwest College, LA Trade-Tech, West LA College, El Camino College, Compton College, Cerritos College, Citrus College, Mt. SAC, Pasadena City College, Rio Hondo College, Glendale CC, Santa Monica College

### 5.4 High School (CIF)

- **CIF Southern Section:** Private schools in LA + public schools outside LAUSD. ~560 schools across ~90 leagues.
- **CIF LA City Section:** LAUSD public schools and some surrounding communities.
- v1 will focus on varsity-level games in football, basketball, baseball, soccer, volleyball, and track.
- High school data is the most complex; v1 may launch with a curated subset of top programs and rivalries, expanding over time.

---

## 6. Data Strategy

### 6.1 Data Sources (in order of feasibility)

| Source | Coverage | Method |
|---|---|---|
| Public APIs (ESPN, SportsData.io, TheSportsDB) | Professional | API integration |
| Team/league official sites + RSS feeds | Pro + College | Structured scraping / RSS |
| NCAA / Big Ten / conference schedule pages | College | Structured scraping |
| CCCAA official schedules | Junior College | Structured scraping |
| CIF-SS and CIF-LA schedule portals | High School | Structured scraping |
| Manual entry / community submission | Gap-fill | Admin CMS or JSON files |

### 6.2 Data Model (Core)

```
Event {
  id: string
  sport: enum
  level: enum (pro | college | juco | high_school)
  gender: enum (mens | womens | coed)
  homeTeam: Team
  awayTeam: Team (nullable for tournaments/meets)
  eventName: string (nullable for non-head-to-head events)
  dateTime: ISO 8601
  endTime: ISO 8601 (nullable)
  venue: Venue
  ticketUrl: string (nullable)
  price: enum (free | under_20 | under_50 | over_50 | tbd)
  conference: string (nullable)
  league: string (nullable)
  isFeatured: boolean
  source: string
  lastUpdated: ISO 8601
}

Team {
  id: string
  name: string
  shortName: string
  level: enum
  school: string (nullable)
  conference: string (nullable)
  sport: enum
  logoUrl: string (nullable)
  primaryColor: string
  secondaryColor: string
}

Venue {
  id: string
  name: string
  address: string
  neighborhood: string (LA County sub-region)
  lat: number
  lng: number
  capacity: number (nullable)
  parkingInfo: string (nullable)
  transitInfo: string (nullable)
}
```

### 6.3 Update Cadence

| Level | Frequency |
|---|---|
| Professional | Daily (automated via API) |
| College | Daily during season (automated) |
| Junior College | Weekly (semi-automated) |
| High School | Weekly (semi-automated + manual) |

---

## 7. Design Direction

### 7.1 Aesthetic: "Modern Retro Minimalist"

**Typography:**
- Bold, clean sans-serif for headings (e.g., Space Grotesk or Outfit)
- A slightly retro condensed font for sport-specific accents and badges (e.g., Bebas Neue or Barlow Condensed)

**Color Palette:**
- Background: Off-white / warm cream (#FAF8F5)
- Primary text: Near-black (#1A1A1A)
- Accent 1: Burnt orange (#D4622B) — warmth, energy
- Accent 2: Deep navy (#1B2A4A) — trust, sports authority
- Accent 3: Muted gold (#C9A84C) — premium feel, retro nod
- Success/live: Vibrant green (#2E8B57)
- Neutral borders/dividers: Light warm gray (#E5E0DA)

**Visual Style:**
- Generous whitespace, grid-based layout
- Subtle grain/texture overlay on hero sections (retro nod)
- Sport-specific iconography (simple, geometric line icons)
- Event cards with thin borders, slight shadow on hover
- Retro-inspired badge shapes for level indicators (Pro, College, etc.)
- No heavy gradients or 3D effects — flat with subtle depth

### 7.2 Layout (Desktop)

```
+-----------------------------------------------------+
|  Logo / Wordmark          Nav: Calendar | Featured  |
|                           | Newsletter    [Search]  |
+------------+----------------------------------------+
|            |                                        |
|  FILTERS   |        CALENDAR / EVENT GRID           |
|  (sidebar) |        Month | Week | Day toggle       |
|            |                                        |
|  Sport     |  +-----+-----+-----+-----+-----+     |
|  Level     |  | Mon | Tue | Wed | Thu | Fri | ... |
|  Time      |  +-----+-----+-----+-----+-----+     |
|  Area      |  | ..  | .   | ... |     | ..  |     |
|  Gender    |  |     |     |     |     |     |     |
|  Price     |  +-----+-----+-----+-----+-----+     |
|  Day Type  |                                        |
|  Team      |  +------------------------------+     |
|  Venue     |  | Event Cards (expanded day)   |     |
|            |  +------------------------------+     |
|  [Save     |                                        |
|   Filter]  |                                        |
+------------+----------------------------------------+
|                                                     |
|  GAMES OF THE WEEK          NEWSLETTER SIGNUP       |
|  Featured matchup cards      Email + Subscribe      |
|                                                     |
+-----------------------------------------------------+
|  HIDDEN GEMS / EDITORIAL CONTENT                    |
|  Cards with short write-ups                         |
+-----------------------------------------------------+
|  Footer: About | Contact | Advertise | Social       |
+-----------------------------------------------------+
```

### 7.3 Layout (Mobile)

- Full-width calendar in day/list view by default
- Filter drawer triggered by floating filter button
- Event cards stack vertically
- Newsletter CTA as inline banner between event cards
- Bottom nav: Calendar | Featured | Newsletter | Filters

---

## 8. Technical Architecture

### 8.1 Tech Stack

| Layer | Technology | Rationale |
|---|---|---|
| Framework | Next.js 14+ (App Router) | SSR/SSG for SEO, React ecosystem, API routes |
| Styling | Tailwind CSS | Rapid iteration, utility-first, responsive |
| Calendar | Custom build on CSS Grid | Full control over design; no library limitations |
| State | React Context + URL params | Filters sync to URL for shareable views |
| Data (v1) | Static JSON files in /data | Ship fast, no backend dependency |
| Data (v2) | Supabase or PlanetScale | When event volume demands a real database |
| Deployment | Vercel | Zero-config Next.js hosting, edge functions |
| Newsletter | beehiiv embed | Drop-in HTML snippet, no custom backend needed |
| Analytics | Plausible or PostHog | Privacy-friendly, event tracking |
| Maps | Mapbox GL JS or Google Maps Embed | Venue location on event detail |

### 8.2 Project Structure

```
/
├── app/
│   ├── layout.tsx              # Root layout with nav, footer
│   ├── page.tsx                # Homepage: calendar + featured
│   ├── event/[id]/page.tsx     # Event detail page
│   ├── featured/page.tsx       # Editorial content page
│   └── api/events/route.ts     # API endpoint for event data
├── components/
│   ├── calendar/               # CalendarView, MonthView, WeekView, DayView, EventCard
│   ├── filters/                # FilterSidebar, FilterDrawer, SavedFilters
│   ├── newsletter/             # SignupBanner, SignupPopup
│   ├── featured/               # GameOfWeek, HiddenGem
│   ├── event/                  # EventDetail, AddToCalendar
│   └── shared/                 # Header, Footer, SportIcon, LevelBadge
├── data/
│   ├── events.json             # Event data (v1)
│   ├── teams.json              # Team reference data
│   ├── venues.json             # Venue reference data
│   └── featured.json           # Editorial content
├── lib/
│   ├── types.ts                # TypeScript interfaces
│   ├── filters.ts              # Filter logic
│   ├── calendar.ts             # Date utilities
│   └── constants.ts            # Sport/level/area enums
├── public/
│   ├── icons/                  # Sport icons
│   └── logos/                  # Team logos
├── tailwind.config.ts
├── next.config.js
└── package.json
```

### 8.3 URL Structure and SEO

- `/` — Homepage with calendar (default: current week)
- `/event/[slug]` — Individual event detail page (SSG-friendly)
- `/featured` — Editorial content
- `/?sport=football&level=pro&area=downtown` — Filtered calendar (shareable URLs)
- `/day/2026-02-21` — Direct link to a specific day view

All filtered views encode state in URL query params so users can share links like:
"Hey check out all the free college basketball this weekend" ->
`scsc.com/?sport=basketball&level=college&price=free&dayType=weekend`

---

## 9. MVP / Phased Rollout

### Phase 1: Launch MVP
- Static site with curated event data (JSON files)
- Interactive calendar with month/week/day views
- Full filter system
- Event detail panel
- Newsletter signup (beehiiv embed)
- Mobile responsive
- Seed data: all pro teams current season + USC/UCLA marquee sports
- SEO-optimized pages

### Phase 2: Expand Coverage
- Add all NCAA programs in LA County
- Add top community college programs
- Add featured high school games (football, basketball)
- "Games of the Week" editorial section
- Saved filters (localStorage)
- Add to calendar functionality

### Phase 3: Scale and Automate
- API integrations for automated pro schedule updates
- CIF-SS / CIF-LA schedule scraping pipeline
- CCCAA schedule ingestion
- User-submitted events (with moderation)
- Push notifications (PWA)
- Venue detail pages with maps
- Affiliate ticket links for monetization

### Phase 4: Community and Growth
- User accounts for personalized calendars
- "My Teams" follow/favorites
- Social sharing enhancements
- Community ratings on "hidden gem" events
- Mobile app (React Native or PWA)
- Expansion beyond LA County (Orange County, Inland Empire)

---

## 10. Features You Might Be Missing (Recommendations)

These are features not in your original brief that would meaningfully improve the product:

| Feature | Why It Matters |
|---|---|
| **Sub-region / Area filter** | LA County is huge. "South Bay" vs. "Valley" vs. "Downtown" matters more than city boundaries. |
| **Price / Free filter** | Huge differentiator. Many JuCo and HS games are free. Budget-conscious fans will love this. |
| **Gender filter** | Women's sports are growing fast. Angel City FC, Sparks, college women's basketball — let people find them. |
| **"Add to Calendar" export** | The number 1 action after finding an event. Google Calendar, Apple Calendar, Outlook .ics support. |
| **Shareable filtered URLs** | Filters encode in URL params so you can text a friend "all free basketball this weekend" as a link. |
| **"What's On Now" live section** | Creates urgency and a reason to check the site on game days, not just for planning. |
| **Venue/area map view** | Some users think spatially. A map with event pins filtered by the same criteria would be powerful for v2+. |
| **Transit/parking info** | LA traffic is part of every sports decision. Even a one-liner per venue helps. |
| **Weather context** | For outdoor events, a small weather indicator helps planning (especially for track, baseball, soccer). |
| **Rivalry / "Big Game" badges** | Flag rivalry games, playoff matchups, record-setting opportunities. Drives clicks and interest. |
| **Accessibility info** | ADA seating, sensory-friendly games, family sections — serves an underserved audience. |
| **"Near Me" geo-filter** | If the user grants location permission, show events within X miles. Powerful for mobile. |

---

## 11. Monetization Opportunities (Future)

- **Affiliate ticket links** — Commission on ticket purchases via partner links (SeatGeek, StubHub, Ticketmaster affiliate programs).
- **Sponsored "Featured Game"** — Teams or venues pay to be highlighted.
- **Newsletter sponsorship** — Standard beehiiv newsletter ad placements.
- **Local business partnerships** — "Pre-game dinner at [restaurant]" tied to venue proximity.
- **Premium data access** — API for other developers or media outlets.

---

## 12. Success Metrics

| Metric | Target (6 months) |
|---|---|
| Monthly unique visitors | 10,000 |
| Newsletter subscribers | 2,500 |
| Avg. session duration | > 2 minutes |
| Events in database | 5,000+ per season |
| Filter usage rate | > 60% of sessions |
| Add-to-calendar clicks | > 10% of event views |
| Return visitor rate | > 30% |

---

## 13. Decisions Log

1. **Data sourcing priority:** v1 is broad — all levels except high school (Pro + College + JuCo), all sports.
2. **Content cadence:** TBD — to be determined when editorial workflow is established.
3. **Angels inclusion:** No. Anaheim Angels are in Orange County and excluded from v1 scope.
4. **High school scope:** Excluded from v1. Infrastructure and data model will support high school from day one. Future: all schools + a "Top 50" section highlighting top teams and prospects per sport.
5. **Domain/brand:** "Southern California Sports Calendar" (SCSC) is the working brand name. Open to change.
6. **beehiiv publication:** To be configured later. Placeholder embed in v1.
7. **Budget for data APIs:** TBD. v1 uses free sources and static JSON data.

## 14. Open Questions (Remaining)

- Content cadence for editorial sections
- Final brand name decision
- beehiiv publication setup
- Data API budget for v2+
