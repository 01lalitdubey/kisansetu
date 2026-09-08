import { request } from './apiClient';

export const procurementApi = {
  list(filter: { centerId?: string; farmerId?: string } = {}) {
    const q = new URLSearchParams(filter as Record<string, string>).toString();
    return request(`/procurements${q ? `?${q}` : ''}`);
  },
  create(body: {
    tokenId: string;
    declaredQuantity: number;
    actualQuantity?: number;
    qualityGrade?: 'A' | 'B' | 'C';
    status?: 'PENDING' | 'QUALITY_CHECK' | 'WEIGHMENT' | 'COMPLETED';
  }) {
    return request('/procurements', { method: 'POST', body });
  },
  setStatus(id: string, status: 'PENDING' | 'QUALITY_CHECK' | 'WEIGHMENT' | 'COMPLETED') {
    return request(`/procurements/${id}/status`, { method: 'PATCH', body: { status } });
  },
};
