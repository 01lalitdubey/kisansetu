import { request } from './apiClient';

export const queueApi = {
  /** Poll this every 5-10s from the Live Queue screens. */
  get(centerId: string) {
    return request(`/queue/${centerId}`, { auth: false });
  },
  processNext(centerId: string) {
    return request(`/queue/${centerId}/process-next`, { method: 'POST' });
  },
  skip(centerId: string, tokenId: string) {
    return request(`/queue/${centerId}/skip`, { method: 'POST', body: { tokenId } });
  },
  complete(centerId: string, tokenId: string, extra?: { actualQuantity?: number; qualityGrade?: 'A' | 'B' | 'C' }) {
    return request(`/queue/${centerId}/complete`, { method: 'POST', body: { tokenId, ...extra } });
  },
  setRunning(centerId: string, running: boolean) {
    return request(`/queue/${centerId}/running`, { method: 'POST', body: { running } });
  },
};
