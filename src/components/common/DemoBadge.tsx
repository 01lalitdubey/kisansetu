import { FlaskConical } from 'lucide-react';
import { useT } from '../../i18n';

export function DemoBadge({ className = '' }: { className?: string }) {
  const { t } = useT();
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-3 py-1 text-xs font-extrabold uppercase tracking-wide text-amber-950 ring-1 ring-amber-500 ${className}`}
    >
      <FlaskConical className="h-3.5 w-3.5" />
      {t('common.demoMode')}
    </span>
  );
}

export function PrototypeNote({ className = '' }: { className?: string }) {
  const { t } = useT();
  return (
    <p className={`text-xs font-medium text-amber-700 ${className}`}>
      * {t('common.prototypeData')}
    </p>
  );
}
