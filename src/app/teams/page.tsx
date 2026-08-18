import type { Metadata } from 'next';
import type { Team, SportEvent } from '@/lib/types';
import { LEVEL_LABELS, SPORT_ICONS } from '@/lib/constants';
import Link from 'next/link';

import teamsData from '@/data/teams.json';
import eventsData from '@/data/events.json';

export const metadata: Metadata = {
  title: 'All Teams — SCSC',
  description: 'Every team tracked on the Southern California Sports Calendar — pro, college, and junior college teams across LA County.',
};

const teams = teamsData as Team[];
const events = eventsData as SportEvent[];

function countUpcomingEvents(teamId: string): number {
  return events.filter(
    (e) => e.homeTeam === teamId || e.awayTeam === teamId
  ).length;
}

export default function TeamsPage() {
  const grouped: Record<string, Team[]> = {};
  for (const t of teams) {
    const level = t.level;
    if (!grouped[level]) grouped[level] = [];
    grouped[level].push(t);
  }

  const levelOrder = ['pro', 'college', 'juco'] as const;

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <Link href="/" className="text-sm text-burnt-orange hover:text-burnt-orange-dark">&larr; Back to Calendar</Link>
          <h1 className="mt-2 font-display text-3xl tracking-wide text-navy dark:text-gold uppercase">
            All Teams
          </h1>
          <p className="mt-1 text-ink-muted">
            {teams.length} teams across LA County
          </p>
        </div>

        {levelOrder.map((level) => {
          const levelTeams = grouped[level];
          if (!levelTeams || levelTeams.length === 0) return null;

          return (
            <section key={level} className="mb-10">
              <h2 className="mb-4 font-display text-xl tracking-wide text-navy dark:text-gold uppercase">
                {LEVEL_LABELS[level]}
                <span className="ml-2 text-sm font-normal normal-case text-ink-muted">
                  ({levelTeams.length} team{levelTeams.length !== 1 ? 's' : ''})
                </span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {levelTeams
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((team) => {
                    const upcoming = countUpcomingEvents(team.id);
                    return (
                      <div
                        key={team.id}
                        className="flex items-start gap-3 rounded-lg border border-border bg-surface p-4 transition-colors hover:border-burnt-orange/30"
                      >
                        <div
                          className="mt-0.5 h-10 w-10 shrink-0 rounded-full"
                          style={{ backgroundColor: team.primaryColor || '#6b7280' }}
                        />
                        <div className="min-w-0">
                          <div className="font-semibold text-ink">{team.name}</div>
                          {team.school && (
                            <div className="text-xs text-ink-muted">{team.school}</div>
                          )}
                          {team.conference && (
                            <div className="text-xs text-ink-muted">{team.conference}</div>
                          )}
                          <div className="mt-1 flex flex-wrap gap-1">
                            {team.sport.map((s) => (
                              <span key={s} className="text-sm" title={s}>
                                {SPORT_ICONS[s]}
                              </span>
                            ))}
                          </div>
                          <div className="mt-1 text-xs text-ink-muted">
                            {upcoming > 0
                              ? `${upcoming} upcoming event${upcoming !== 1 ? 's' : ''}`
                              : 'No upcoming events'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
