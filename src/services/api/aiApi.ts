import { request } from './apiClient';
import type { Language } from '../../types';

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface ChatReply {
  message: string;
  language: Language;
  source: 'gemini' | 'fallback';
}

/**
 * Maps 1:1 to the frontend's original mock AI helpers:
 *   mockAI.predictWaitingTime()  -> aiApi.waitingTime()
 *   mockAI.recommendBestSlot()   -> aiApi.recommendSlot()
 *   mockAI.getCenterStatus()     -> aiApi.centerLoad()
 *   mockAI.computeLoadBalancing() -> aiApi.loadBalancing()
 */
export const aiApi = {
  waitingTime(body: {
    centerId?: string;
    queueAhead?: number;
    avgProcessingTime?: number;
    activeCounters?: number;
    hour?: number;
  }) {
    return request('/ai/waiting-time', { method: 'POST', auth: false, body });
  },
  recommendSlot(body: { centerId: string; farmerId?: string; cropId?: string; quantity?: number }) {
    return request('/ai/recommend-slot', { method: 'POST', auth: false, body });
  },
  centerLoad(centerId?: string) {
    return request(`/ai/center-load${centerId ? `?centerId=${centerId}` : ''}`, { auth: false });
  },
  loadBalancing() {
    return request('/ai/load-balancing', { auth: false });
  },
  applyLoadBalancing(recommendationId: string) {
    return request('/ai/load-balancing/apply', { method: 'POST', body: { recommendationId } });
  },
  /** POST /api/ai/chat — the KisanSetu AI Assistant (Gemini, farmer-only). */
  chat(message: string, history: ChatTurn[], language?: Language) {
    return request<ChatReply>('/ai/chat', {
      method: 'POST',
      body: { message, history: history.slice(-8), language },
    });
  },
};

export const demoApi = {
  highDemand() {
    return request('/demo/high-demand', { method: 'POST' });
  },
  queueReduction() {
    return request('/demo/queue-reduction', { method: 'POST' });
  },
  scheduleChange() {
    return request('/demo/schedule-change', { method: 'POST' });
  },
  processToken(centerId?: string) {
    return request('/demo/process-token', { method: 'POST', body: centerId ? { centerId } : {} });
  },
  reset() {
    return request('/demo/reset', { method: 'POST' });
  },
};
