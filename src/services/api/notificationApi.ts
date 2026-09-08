import { request } from './apiClient';

export const notificationApi = {
  /** Authenticated — server scopes to the caller when they are a farmer. */
  list(farmerId?: string) {
    return request(farmerId ? `/notifications/${farmerId}` : '/notifications');
  },
  create(body: {
    farmerId?: string;
    title: string;
    message: string;
    type:
      | 'SCHEDULE_CHANGE'
      | 'QUEUE_ALERT'
      | 'PROCUREMENT_STARTED'
      | 'TOKEN_UPDATE'
      | 'HIGH_DEMAND'
      | 'PAYMENT_UPDATE'
      | 'TRANSPORT_UPDATE';
    meta?: Record<string, string>;
  }) {
    return request('/notifications', { method: 'POST', body });
  },
  markRead(id: string) {
    return request(`/notifications/${id}/read`, { method: 'PATCH' });
  },
  markAllRead(farmerId: string) {
    return request(`/notifications/${farmerId}/read-all`, { method: 'POST' });
  },
};
