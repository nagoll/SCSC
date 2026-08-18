import type { Level } from '@/lib/types';
import { LEVEL_LABELS } from '@/lib/constants';

interface LevelBadgeProps {
  level: Level;
  size?: 'sm' | 'md';
}

const SHORT_LABELS: Record<Level, string> = {
  pro: 'Pro',
  college: 'College',
  juco: 'JuCo',
  high_school: 'HS',
};

const levelStyles: Record<Level, string> = {
  pro: 'bg-gold text-navy',
  college: 'bg-navy text-white',
  juco: 'bg-live-green text-white',
  high_school: 'bg-burnt-orange text-white',
};

const sizeStyles = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2 py-0.5 text-xs',
};

export default function LevelBadge({ level, size = 'md' }: LevelBadgeProps) {
  return (
    <span
      className={`inline-block shrink-0 rounded font-semibold uppercase tracking-wider ${levelStyles[level]} ${sizeStyles[size]}`}
    >
      {size === 'sm' ? SHORT_LABELS[level] : LEVEL_LABELS[level]}
    </span>
  );
}
