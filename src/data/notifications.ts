import type { AppNotification } from '../types';

export const initialNotifications: AppNotification[] = [
  {
    id: 'n-1',
    kind: 'schedule',
    title: 'Procurement Schedule Updated',
    body: 'Your wheat procurement slot has changed.',
    meta: { Old: '11:30 AM', New: '1:00 PM' },
    timestamp: '2026-09-08T08:10:00+05:30',
    read: false,
  },
  {
    id: 'n-2',
    kind: 'crowd',
    title: 'Low Crowd Alert',
    body: 'This is a good time to visit.',
    meta: { 'Current waiting time': '25 minutes' },
    timestamp: '2026-09-08T07:40:00+05:30',
    read: false,
  },
  {
    id: 'n-3',
    kind: 'started',
    title: 'Procurement Started',
    body: 'Your procurement center is now accepting wheat.',
    meta: { Center: 'Jaipur Grain Center' },
    timestamp: '2026-09-08T06:30:00+05:30',
    read: true,
  },
];
