import { useT } from '../../i18n';
import { NotificationList } from '../../components/common/NotificationList';

export default function FarmerNotifications() {
  const { t } = useT();
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-extrabold text-kisan-900">{t('notifications.title')}</h1>
      <NotificationList />
    </div>
  );
}
