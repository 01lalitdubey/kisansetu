import {
  AlertTriangle,
  BellRing,
  CheckCheck,
  Info,
  Sparkles,
  Ticket,
  TrendingDown,
} from 'lucide-react';
import type { AppNotification, NotificationKind } from '../../types';
import { useT } from '../../i18n';
import { useAppStore } from '../../store/appStore';
import { EmptyState } from './Feedback';

const kindMeta: Record<
  NotificationKind,
  { icon: typeof Info; tone: string; emoji: string }
> = {
  schedule: { icon: AlertTriangle, tone: 'bg-amber-100 text-amber-700', emoji: '⚠️' },
  crowd: { icon: TrendingDown, tone: 'bg-kisan-100 text-kisan-700', emoji: '🔔' },
  started: { icon: BellRing, tone: 'bg-kisan-100 text-kisan-700', emoji: '🟢' },
  token: { icon: Ticket, tone: 'bg-trust-100 text-trust-700', emoji: '🎟️' },
  ai: { icon: Sparkles, tone: 'bg-kisan-100 text-kisan-700', emoji: '🤖' },
  system: { icon: Info, tone: 'bg-gray-100 text-gray-600', emoji: 'ℹ️' },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function NotificationList() {
  const { t } = useT();
  const notifications = useAppStore((s) => s.notifications);
  const markAllRead = useAppStore((s) => s.markAllNotificationsRead);
  const markRead = useAppStore((s) => s.markNotificationRead);

  if (notifications.length === 0) {
    return <EmptyState icon={<BellRing className="h-7 w-7" />} title={t('notifications.empty')} />;
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          onClick={markAllRead}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-kisan-600 hover:text-kisan-700"
        >
          <CheckCheck className="h-4 w-4" /> {t('notifications.markAllRead')}
        </button>
      </div>

      {notifications.map((n) => (
        <NotificationCard key={n.id} n={n} onRead={() => markRead(n.id)} />
      ))}
    </div>
  );
}

function NotificationCard({ n, onRead }: { n: AppNotification; onRead: () => void }) {
  const meta = kindMeta[n.kind];
  const Icon = meta.icon;
  return (
    <button
      onClick={onRead}
      className={`card w-full p-4 text-left transition-colors ${
        n.read ? 'opacity-70' : 'border-kisan-300'
      }`}
    >
      <div className="flex gap-3">
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${meta.tone}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold text-kisan-900">
              {meta.emoji} {n.title}
            </p>
            <span className="shrink-0 text-xs text-kisan-500">{timeAgo(n.timestamp)}</span>
          </div>
          <p className="mt-0.5 text-sm text-kisan-700">{n.body}</p>
          {n.meta && (
            <div className="mt-2 flex flex-wrap gap-2">
              {Object.entries(n.meta).map(([k, v]) => (
                <span
                  key={k}
                  className="rounded-lg bg-kisan-50 px-2.5 py-1 text-xs font-semibold text-kisan-700"
                >
                  {k}: <span className="text-kisan-900">{v}</span>
                </span>
              ))}
            </div>
          )}
          {!n.read && (
            <span className="mt-2 inline-block h-2 w-2 rounded-full bg-kisan-500" aria-label="unread" />
          )}
        </div>
      </div>
    </button>
  );
}
