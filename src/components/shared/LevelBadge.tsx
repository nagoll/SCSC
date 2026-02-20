import type { Level } from '@/lib/types';
import { LEVEL_LABELS } from '@/lib/constants';

interface LevelBadgeProps {
  level: Level;
  size?: 'sm' | 'md';
}

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
      className={`inline-block rounded font-semibold uppercase tracking-wider ${levelStyles[level]} ${sizeStyles[size]}`}
    >
      {LEVEL_LABELS[level]}
    </span>
  );
}
