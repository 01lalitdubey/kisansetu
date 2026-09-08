import { request } from './apiClient';

export interface RegisterCenterBody {
  name: string;
  contactNumber: string;
  addressLine: string;
  city: string;
  district: string;
  state: string;
  pincode: string;
  latitude: number;
  longitude: number;
  capacity: number;
  activeCounters: number;
  supportedCrops: string[];
  officerName?: string;
}

export const centerApi = {
  /** Farmers see APPROVED centres; admin (with token) can pass all=1. */
  list(all = false) {
    return request(`/centers${all ? '?all=1' : ''}`);
  },
  get(centerId: string) {
    return request(`/centers/${centerId}`, { auth: false });
  },
  /** The authenticated officer's own centre. */
  mine() {
    return request('/centers/mine');
  },
  register(body: RegisterCenterBody) {
    return request('/centers/register', { method: 'POST', body });
  },
  update(centerId: string, patch: Partial<RegisterCenterBody>) {
    return request(`/centers/${centerId}`, { method: 'PATCH', body: patch });
  },
  schedules(centerId: string) {
    return request(`/centers/${centerId}/schedules`, { auth: false });
  },
  allSchedules() {
    return request('/schedules', { auth: false });
  },
  recommendedSchedule(centerId: string, cropId?: string) {
    const q = new URLSearchParams({ centerId, ...(cropId ? { cropId } : {}) });
    return request(`/schedules/recommended?${q.toString()}`, { auth: false });
  },
  farmers(centerId: string) {
    return request(`/centers/${centerId}/farmers`);
  },
  analytics(centerId: string) {
    return request(`/centers/${centerId}/analytics`, { auth: false });
  },
  setStatus(centerId: string, status: 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'OVERLOADED') {
    return request(`/centers/${centerId}/status`, { method: 'PATCH', body: { status } });
  },
  /** admin */
  setApproval(centerId: string, action: 'APPROVE' | 'REJECT' | 'SUSPEND' | 'REINSTATE') {
    return request(`/admin/centers/${centerId}/approval`, { method: 'POST', body: { action } });
  },
};
