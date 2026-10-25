import type { Metadata } from 'next';
import Link from 'next/link';
import type { Gender, Sport } from '@/lib/types';
import { getTeams } from '@/lib/data';
import { getRankings } from '@/lib/rankings';
import directoryData from '@/data/rankings-directory.json';

export const metadata: Metadata = {
  title: 'College Rankings — SCSC',
  description:
    'Where LA college teams stand in this week’s national polls, plus a directory of the official rankings for every college sport and level.',
};

// Team names come from Supabase, like the rest of the site.
export const dynamic = 'force-dynamic';

interface DirectoryPoll {
  level: string;
  name: string;
  url: string;
  kind: 'national' | 'regional' | 'computer' | 'state';
}

interface DirectorySport {
  sport: Sport;
  gender: Gender;
  label: string;
  polls: DirectoryPoll[];
}

const directory = directoryData as DirectorySport[];

const KIND_LABELS: Record<DirectoryPoll['kind'], string | null> = {
  national: null,
  regional: 'Regional',
  computer: 'Computer',
  state: 'California',
};

function anchor(s: DirectorySport) {
  return `${s.gender}-${s.sport}`;
}

function formatThrough(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default async function RankingsPage() {
  const teams = await getTeams();
  const teamName = (id: string) => teams.find(t => t.id === id)?.name ?? id;
  const rankings = getRankings();
  const rankedPolls = rankings.polls.filter(p => p.ranked.length > 0);
  const labelFor = (sport: Sport, gender: Gender) =>
    directory.find(s => s.sport === sport && s.gender === gender)?.label ?? sport;

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8">
          <Link href="/" className="text-sm text-burnt-orange hover:text-burnt-orange-dark">&larr; Back to Calendar</Link>
          <h1 className="mt-2 font-display text-3xl tracking-wide text-navy dark:text-gold uppercase">
            College Rankings
          </h1>
          <p className="mt-1 text-ink-muted">
            This week&apos;s national polls for LA college teams, and where to find the official rankings for every sport.
          </p>
        </div>

        <section className="mb-10">
          <h2 className="font-display text-xl tracking-wide text-navy dark:text-gold uppercase">
            LA teams in the polls
          </h2>
          {rankedPolls.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">No LA teams are in a national poll this week.</p>
          ) : (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {rankedPolls.map(p => (
                <div key={p.source} className="rounded-lg border border-border bg-surface p-4">
                  <div className="text-sm font-semibold text-ink">
                    {labelFor(p.sport, p.gender)}
                    {p.division !== 'all' && <span className="ml-1.5 text-xs font-normal text-ink-muted">{p.division.toUpperCase()}</span>}
                  </div>
                  <a href={p.source} target="_blank" rel="noopener noreferrer" className="text-xs text-burnt-orange hover:underline">
                    {p.poll} · through {formatThrough(p.through)}
                  </a>
                  <ul className="mt-2 space-y-1">
                    {p.ranked.map(r => (
                      <li key={r.teamId} className="flex items-center gap-2 text-sm text-ink">
                        <span className="w-8 shrink-0 rounded bg-gold/20 text-center text-xs font-bold text-gold">#{r.rank}</span>
                        {teamName(r.teamId)}
                        {r.region && <span className="text-xs text-ink-muted">{r.region} region</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
          {rankings.updatedAt && (
            <p className="mt-2 text-xs text-ink-muted">
              Checked {new Date(rankings.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}. Updated every Wednesday.
            </p>
          )}
        </section>

        <section>
          <h2 className="font-display text-xl tracking-wide text-navy dark:text-gold uppercase">
            Rankings directory
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            The official poll for each sport and level, from NCAA.com, the NAIA, the coaches&apos; associations and the CCCAA.
          </p>
          <nav className="mt-3 flex flex-wrap gap-2">
            {directory.map(s => (
              <a key={anchor(s)} href={`#${anchor(s)}`} className="rounded-full border border-border px-3 py-1 text-xs font-medium text-ink-light hover:border-burnt-orange hover:text-burnt-orange">
                {s.label}
              </a>
            ))}
          </nav>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {directory.map(s => (
              <div key={anchor(s)} id={anchor(s)} className="scroll-mt-20 rounded-lg border border-border bg-surface p-4">
                <h3 className="font-semibold text-ink">{s.label}</h3>
                <ul className="mt-2 divide-y divide-border">
                  {s.polls.map(p => (
                    <li key={`${p.level}-${p.name}`} className="flex items-baseline justify-between gap-3 py-1.5 text-sm">
                      <span className="shrink-0 text-ink-muted">{p.level}</span>
                      <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-right text-burnt-orange hover:underline">
                        {p.name}
                        {KIND_LABELS[p.kind] && (
                          <span className="ml-1.5 rounded bg-cream-dark px-1 py-0.5 text-[10px] font-medium text-ink-muted">
                            {KIND_LABELS[p.kind]}
                          </span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
