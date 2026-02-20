import type { Sport } from '@/lib/types';
import { SPORT_ICONS } from '@/lib/constants';

interface SportIconProps {
  sport: Sport;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const sizeClasses = {
  sm: 'text-base',
  md: 'text-xl',
  lg: 'text-2xl',
};

export default function SportIcon({ sport, size = 'md', showLabel = false }: SportIconProps) {
  return (
    <span className={`inline-flex items-center gap-1 ${sizeClasses[size]}`} role="img" aria-label={sport}>
      <span>{SPORT_ICONS[sport]}</span>
      {showLabel && (
        <span className="text-xs font-medium capitalize text-ink-muted">{sport.replace('-', ' ')}</span>
      )}
    </span>
  );
}
