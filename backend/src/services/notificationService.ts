import { Prisma, type NotificationType } from '@prisma/client';
import { prisma } from '../config/database';

/**
 * ---------------------------------------------------------------------------
 *  NOTIFICATION SERVICE
 *  Replaces the frontend mockNotifications.* helpers. Every create also lands
 *  in the DB so all three dashboards read the same feed.
 * ---------------------------------------------------------------------------
 */

export async function listNotifications(farmerId?: string, limit = 50) {
  return prisma.notification.findMany({
    where: farmerId ? { OR: [{ farmerId }, { farmerId: null }] } : {},
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function createNotification(input: {
  farmerId?: string | null;
  title: string;
  message: string;
  type: NotificationType;
  meta?: Record<string, string>;
}) {
  return prisma.notification.create({
    data: {
      farmerId: input.farmerId ?? null,
      title: input.title,
      message: input.message,
      type: input.type,
      meta: (input.meta ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function markRead(id: string) {
  return prisma.notification.update({ where: { id }, data: { read: true } });
}

export async function markAllRead(farmerId: string) {
  await prisma.notification.updateMany({
    where: { OR: [{ farmerId }, { farmerId: null }], read: false },
    data: { read: true },
  });
  return { success: true };
}

// Typed helpers mirroring the old frontend mock factories ------------------

export const notifyScheduleChange = (farmerId: string, oldTime: string, newTime: string) =>
  createNotification({
    farmerId,
    type: 'SCHEDULE_CHANGE',
    title: 'Procurement Schedule Updated',
    message: 'Your wheat procurement slot has changed.',
    meta: { Old: oldTime, New: newTime },
  });

export const notifyLowCrowd = (farmerId: string | null, waitMinutes: number) =>
  createNotification({
    farmerId,
    type: 'QUEUE_ALERT',
    title: 'Low Crowd Alert',
    message: 'This is a good time to visit.',
    meta: { 'Current waiting time': `${waitMinutes} minutes` },
  });

export const notifyHighDemand = (centerName: string) =>
  createNotification({
    farmerId: null,
    type: 'HIGH_DEMAND',
    title: 'High Demand Detected',
    message: `${centerName} is approaching overload. An AI recommendation is ready.`,
  });

export const notifyProcurementStarted = (farmerId: string | null, centerName: string) =>
  createNotification({
    farmerId,
    type: 'PROCUREMENT_STARTED',
    title: 'Procurement Started',
    message: `${centerName} is now accepting wheat.`,
    meta: { Center: centerName },
  });

export const notifyTokenBooked = (farmerId: string, tokenNumber: string, slot: string) =>
  createNotification({
    farmerId,
    type: 'TOKEN_UPDATE',
    title: 'Token Confirmed',
    message: `Your digital token ${tokenNumber} is confirmed.`,
    meta: { Slot: slot },
  });
