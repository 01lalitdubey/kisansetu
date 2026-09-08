import type { LucideIcon } from 'lucide-react';

export function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  tone = 'default',
}: {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  sub?: string;
  tone?: 'default' | 'good' | 'warn' | 'bad';
}) {
  const toneRing = {
    default: 'border-kisan-100',
    good: 'border-kisan-200',
    warn: 'border-amber-200',
    bad: 'border-red-200',
  }[tone];
  const toneIcon = {
    default: 'bg-kisan-50 text-kisan-600',
    good: 'bg-kisan-50 text-kisan-600',
    warn: 'bg-amber-50 text-amber-600',
    bad: 'bg-red-50 text-red-600',
  }[tone];

  return (
    <div className={`card border ${toneRing} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-kisan-700/80">{label}</p>
          <p className="mt-1 text-3xl font-extrabold tracking-tight text-kisan-900">{value}</p>
          {sub && <p className="mt-1 text-sm text-kisan-600/80">{sub}</p>}
        </div>
        {Icon && (
          <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${toneIcon}`}>
            <Icon className="h-5 w-5" />
          </span>
        )}
      </div>
    </div>
  );
}
