import type { AppNotification, NotificationKind } from '../types';

/**
 * ---------------------------------------------------------------------------
 *  MOCK NOTIFICATIONS SERVICE
 *  Factory helpers that build notification objects for demo events. A real
 *  implementation would receive these over a push channel / SSE.
 * ---------------------------------------------------------------------------
 */

let seq = 100;
const nextId = () => `n-${seq++}`;

function make(
  kind: NotificationKind,
  title: string,
  body: string,
  meta?: Record<string, string>,
): AppNotification {
  return {
    id: nextId(),
    kind,
    title,
    body,
    meta,
    timestamp: new Date().toISOString(),
    read: false,
  };
}

export const notifyScheduleChange = (oldTime: string, newTime: string) =>
  make('schedule', 'Procurement Schedule Updated', 'Your wheat procurement slot has changed.', {
    Old: oldTime,
    New: newTime,
  });

export const notifyLowCrowd = (waitMinutes: number) =>
  make('crowd', 'Low Crowd Alert', 'This is a good time to visit.', {
    'Current waiting time': `${waitMinutes} minutes`,
  });

export const notifyProcurementStarted = (centerName: string) =>
  make('started', 'Procurement Started', `Your procurement center is now accepting wheat.`, {
    Center: centerName,
  });

export const notifyTokenBooked = (tokenId: string, slot: string) =>
  make('token', 'Token Confirmed', `Your digital token ${tokenId} is confirmed.`, {
    Slot: slot,
  });

export const notifyAIRecommendationApplied = (fromCenter: string, toCenter: string, count: number) =>
  make(
    'ai',
    'AI Load Balancing Applied',
    `${count} farmers redirected from ${fromCenter} to ${toCenter}.`,
  );

export const notifyHighDemand = (centerName: string) =>
  make('ai', 'High Demand Detected', `${centerName} is approaching overload. AI recommendation ready.`);
