import type { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-kisan-600">
      <Loader2 className="h-5 w-5 animate-spin" />
      {label && <span className="text-sm font-medium">{label}</span>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 p-10 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-kisan-50 text-kisan-500">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-kisan-900">{title}</h3>
      {body && <p className="max-w-sm text-sm text-kisan-600">{body}</p>}
      {action}
    </div>
  );
}

export function SectionHeading({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-kisan-900">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-kisan-600">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}
