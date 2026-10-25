import type { Gender, Sport } from '@/lib/types';
import { getTeamRank } from '@/lib/rankings';

interface RankBadgeProps {
  teamId: string;
  sport: Sport;
  gender: Gender;
  size?: 'sm' | 'md';
}

const sizeStyles = {
  sm: 'px-1 text-[10px]',
  md: 'px-1.5 py-0.5 text-xs',
};

/** "#5" next to a team that's in its sport's national poll this week. */
export default function RankBadge({ teamId, sport, gender, size = 'md' }: RankBadgeProps) {
  const r = getTeamRank(teamId, sport, gender);
  if (!r) return null;
  return (
    <span
      className={`inline-block shrink-0 rounded bg-gold/20 font-bold text-gold ${sizeStyles[size]}`}
      title={`#${r.rank} in the ${r.poll} (through ${r.through})`}
    >
      #{r.rank}
    </span>
  );
}
