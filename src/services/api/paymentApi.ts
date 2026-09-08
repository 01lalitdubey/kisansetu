import { request } from './apiClient';

export const paymentApi = {
  config() {
    return request('/payments/config', { auth: false });
  },
  /** Begin payment for a transport booking. Returns { mode:'stripe'|'demo', checkoutUrl?, payment } */
  startTransportPayment(transportId: string) {
    return request('/payments/transport/start', { method: 'POST', body: { transportId } });
  },
  /** Server-side verify of a returned Stripe Checkout session. */
  verify(sessionId: string) {
    return request(`/payments/verify?session_id=${encodeURIComponent(sessionId)}`);
  },
  /** Demo Payment — only when Stripe is NOT configured. */
  demoConfirm(paymentId: string) {
    return request('/payments/demo-confirm', { method: 'POST', body: { paymentId } });
  },
  get(id: string) {
    return request(`/payments/${id}`);
  },
  forFarmer(farmerId: string) {
    return request(`/payments/farmer/${farmerId}`);
  },
};
