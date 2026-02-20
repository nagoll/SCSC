import type { TimeOfDay } from '@/lib/types';

interface TimeBadgeProps {
  timeOfDay: TimeOfDay;
}

const styles: Record<TimeOfDay, { bg: string; label: string }> = {
  morning: { bg: 'bg-amber-100 text-amber-800', label: 'Morning' },
  afternoon: { bg: 'bg-sky-100 text-sky-800', label: 'Afternoon' },
  evening: { bg: 'bg-indigo-100 text-indigo-800', label: 'Evening' },
};

export default function TimeBadge({ timeOfDay }: TimeBadgeProps) {
  return (
    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${styles[timeOfDay].bg}`}>
      {styles[timeOfDay].label}
    </span>
  );
}
