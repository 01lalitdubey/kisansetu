import { request } from './apiClient';

export const adminApi = {
  overview() {
    return request('/admin/overview');
  },
  centers() {
    return request('/admin/centers');
  },
  farmers() {
    return request('/admin/farmers');
  },
  procurements() {
    return request('/admin/procurements');
  },
  payments() {
    return request('/admin/payments');
  },
  transportOverview() {
    return request('/admin/transport-overview');
  },
  insights() {
    return request('/admin/insights');
  },
};

export const centerHistoryApi = {
  /** Authenticated officer's own centre history. */
  list(params: { dateRange?: string; search?: string; crop?: string } = {}) {
    const q = new URLSearchParams(
      Object.entries(params).filter(([, v]) => v) as [string, string][],
    ).toString();
    return request(`/center/history${q ? `?${q}` : ''}`);
  },
};

export const analyticsApi = {
  farmersServed() {
    return request('/analytics/farmers-served', { auth: false });
  },
  waitingTime() {
    return request('/analytics/waiting-time', { auth: false });
  },
  centerUtilization() {
    return request('/analytics/center-utilization', { auth: false });
  },
  cropProcurement() {
    return request('/analytics/crop-procurement', { auth: false });
  },
  peakHours() {
    return request('/analytics/peak-hours', { auth: false });
  },
  center(centerId: string) {
    return request(`/analytics/center/${centerId}`, { auth: false });
  },
};
