import rankingsData from '@/data/rankings.json';
import type { Gender, Sport } from './types';

export interface Poll {
  sport: Sport;
  gender: Gender;
  division: string;
  poll: string;
  through: string;
  source: string;
  ranked: { teamId: string; rank: number; region?: string }[];
}

export interface Rankings {
  updatedAt: string | null;
  polls: Poll[];
}

export interface TeamRank {
  rank: number;
  region?: string; // set for regional rankings, where rank counts within the region
  poll: string;
  through: string;
}

// Written weekly by scripts/fetch-rankings.js.
const rankings = rankingsData as Rankings;

export function getRankings(): Rankings {
  return rankings;
}

/** A team's current national poll rank in one sport, or null if unranked. */
export function getTeamRank(
  teamId: string,
  sport: Sport,
  gender: Gender,
  data: Rankings = rankings,
): TeamRank | null {
  for (const p of data.polls) {
    if (p.sport !== sport || p.gender !== gender) continue;
    const hit = p.ranked.find(r => r.teamId === teamId);
    if (hit) return { rank: hit.rank, region: hit.region, poll: p.poll, through: p.through };
  }
  return null;
}
