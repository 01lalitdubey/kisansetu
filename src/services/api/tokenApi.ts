import { request } from './apiClient';

export interface CreateTokenBody {
  farmerId: string;
  centerId: string;
  scheduleId: string;
  cropId: string;
  quantity: number;
}

export const tokenApi = {
  create(body: CreateTokenBody) {
    return request('/tokens', { method: 'POST', body });
  },
  get(tokenId: string) {
    return request(`/tokens/${tokenId}`, { auth: false });
  },
  cancel(tokenId: string) {
    return request(`/tokens/${tokenId}`, { method: 'DELETE' });
  },
};
