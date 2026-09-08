import { useT } from '../../i18n';
import { NotificationList } from '../../components/common/NotificationList';

export default function OfficerNotifications() {
  const { t } = useT();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-white">{t('notifications.title')}</h1>
      <NotificationList />
    </div>
  );
}
