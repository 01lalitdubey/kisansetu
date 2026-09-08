/**
 * KisanSetu AI — backend API layer.
 *
 * The UI still runs on the mock services in src/services/mock*.ts. This folder
 * is the drop-in replacement: once the backend (/backend) is running and
 * VITE_USE_BACKEND=true, swap a mock call for the matching api call here.
 *
 * Migration map (frontend mock  ->  api call  ->  REST endpoint):
 *
 *   mockAI.recommendBestSlot()      aiApi.recommendSlot()       POST /api/ai/recommend-slot
 *   mockAI.predictWaitingTime()     aiApi.waitingTime()         POST /api/ai/waiting-time
 *   mockAI.getCenterStatus()        aiApi.centerLoad()          GET  /api/ai/center-load
 *   mockAI.computeLoadBalancing()   aiApi.loadBalancing()       GET  /api/ai/load-balancing
 *   mockQueue.advanceQueue()        queueApi.get() (poll)       GET  /api/queue/:centerId
 *   mockQueue.processNextToken()    queueApi.processNext()      POST /api/queue/:centerId/process-next
 *   mockQueue.skipToken()           queueApi.skip()             POST /api/queue/:centerId/skip
 *   mockQueue.attachToken()         tokenApi.create()           POST /api/tokens
 *   mockNotifications.*             notificationApi.*           /api/notifications
 *   (store.bookSlot)                tokenApi.create()           POST /api/tokens
 *   (store demo actions)            demoApi.*                   /api/demo/*
 */
export { API_BASE_URL, USE_BACKEND, DEMO_MODE_ENABLED, ApiError, ApiUnavailableError, checkHealth, getToken, setToken } from './apiClient';
export { authApi } from './authApi';
export { farmerApi } from './farmerApi';
export { centerApi } from './centerApi';
export { tokenApi } from './tokenApi';
export { queueApi } from './queueApi';
export { procurementApi } from './procurementApi';
export { notificationApi } from './notificationApi';
export { adminApi, analyticsApi, centerHistoryApi } from './adminApi';
export { aiApi, demoApi } from './aiApi';
export { transportApi } from './transportApi';
export type { VehicleType } from './transportApi';
export { paymentApi } from './paymentApi';

import { USE_BACKEND, checkHealth } from './apiClient';

let cached: boolean | null = null;

/**
 * Should the app use the backend right now?
 * true only when VITE_USE_BACKEND=true AND GET /api/health succeeds.
 * Result is cached for the session; call with force=true to re-check.
 */
export async function isBackendLive(force = false): Promise<boolean> {
  if (!USE_BACKEND) return false;
  if (cached !== null && !force) return cached;
  cached = await checkHealth();
  return cached;
}

/**
 * Run `live` when the backend is available, otherwise `fallback` (the mock).
 * Keeps every screen working whether or not the backend is up.
 */
export async function withBackend<T>(live: () => Promise<T>, fallback: () => T | Promise<T>): Promise<T> {
  if (await isBackendLive()) {
    try {
      return await live();
    } catch {
      return fallback();
    }
  }
  return fallback();
}
