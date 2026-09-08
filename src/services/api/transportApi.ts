import { request } from './apiClient';

export type VehicleType = 'SMALL' | 'MEDIUM' | 'LARGE';

export const transportApi = {
  options() {
    return request('/transport/options');
  },
  quote(body: { procurementId: string; vehicleType: VehicleType; destination?: string }) {
    return request('/transport/quote', { method: 'POST', body });
  },
  book(body: { procurementId: string; vehicleType: VehicleType; destination?: string }) {
    return request('/transport/book', { method: 'POST', body });
  },
  get(id: string) {
    return request(`/transport/${id}`);
  },
  forFarmer(farmerId: string) {
    return request(`/transport/farmer/${farmerId}`);
  },
  cancel(id: string) {
    return request(`/transport/${id}/cancel`, { method: 'POST' });
  },
  /** officer / admin / demo — advance or set status */
  setStatus(id: string, status?: string) {
    return request(`/transport/${id}/status`, { method: 'POST', body: status ? { status } : {} });
  },
};
