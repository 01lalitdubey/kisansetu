import type { CenterLoad, CenterStatus } from '../../types';

type Variant = 'active' | 'closed' | 'paused' | 'low' | 'normal' | 'high' | 'success' | 'warning';

const styles: Record<Variant, string> = {
  active: 'bg-kisan-100 text-kisan-700 ring-kisan-200',
  success: 'bg-kisan-100 text-kisan-700 ring-kisan-200',
  low: 'bg-kisan-100 text-kisan-700 ring-kisan-200',
  normal: 'bg-amber-100 text-amber-800 ring-amber-200',
  warning: 'bg-amber-100 text-amber-800 ring-amber-200',
  paused: 'bg-amber-100 text-amber-800 ring-amber-200',
  high: 'bg-red-100 text-red-700 ring-red-200',
  closed: 'bg-gray-200 text-gray-600 ring-gray-300',
};

const dotColor: Record<Variant, string> = {
  active: 'bg-kisan-500',
  success: 'bg-kisan-500',
  low: 'bg-kisan-500',
  normal: 'bg-amber-500',
  warning: 'bg-amber-500',
  paused: 'bg-amber-500',
  high: 'bg-red-500',
  closed: 'bg-gray-400',
};

export function StatusBadge({
  variant,
  label,
  className = '',
}: {
  variant: Variant;
  label: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ring-1 ring-inset ${styles[variant]} ${className}`}
    >
      <span className={`h-2 w-2 rounded-full ${dotColor[variant]}`} />
      {label}
    </span>
  );
}

export function centerStatusVariant(status: CenterStatus): Variant {
  if (status === 'ACTIVE') return 'active';
  if (status === 'PAUSED') return 'paused';
  return 'closed';
}

export function loadVariant(load: CenterLoad): Variant {
  return load;
}
