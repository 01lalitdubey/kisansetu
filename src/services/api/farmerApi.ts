import { request } from './apiClient';

/** All farmer endpoints are authenticated + ownership-checked server-side. */
export const farmerApi = {
  get(farmerId: string) {
    return request(`/farmers/${farmerId}`);
  },
  update(farmerId: string, patch: Record<string, unknown>) {
    return request(`/farmers/${farmerId}`, { method: 'PATCH', body: patch });
  },
  tokens(farmerId: string) {
    return request(`/farmers/${farmerId}/tokens`);
  },
  history(farmerId: string) {
    return request(`/farmers/${farmerId}/history`);
  },
  procurements(farmerId: string) {
    return request(`/farmers/${farmerId}/procurements`);
  },
  notifications(farmerId: string) {
    return request(`/farmers/${farmerId}/notifications`);
  },
  /** officer/admin only */
  listAll() {
    return request('/farmers');
  },
};
