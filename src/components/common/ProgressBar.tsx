export function ProgressBar({
  value,
  max,
  tone = 'auto',
  className = '',
}: {
  value: number;
  max: number;
  tone?: 'auto' | 'good' | 'warn' | 'bad';
  className?: string;
}) {
  const pct = Math.min(100, Math.round((value / Math.max(1, max)) * 100));
  const resolved =
    tone === 'auto' ? (pct >= 90 ? 'bad' : pct >= 70 ? 'warn' : 'good') : tone;
  const color = {
    good: 'bg-kisan-500',
    warn: 'bg-amber-500',
    bad: 'bg-red-500',
  }[resolved];

  return (
    <div className={className}>
      <div className="h-3 w-full overflow-hidden rounded-full bg-kisan-100">
        <div
          className={`h-full rounded-full ${color} transition-[width] duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
