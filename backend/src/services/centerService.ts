import type { CenterApprovalStatus, CenterStatus, ProcurementCenter, Role } from '@prisma/client';
import { prisma } from '../config/database';
import { ApiError } from '../utils/response';
import { computeCenterLoad, predictWaitingTime } from './recommendationService';
import type { AuthUser } from '../types';

/** Shape used by both the farmer dashboard and officer/admin monitoring. */
function present(center: ProcurementCenter) {
  const load = computeCenterLoad(center);
  return {
    id: center.id,
    name: center.name,
    location: center.location,
    latitude: center.latitude,
    longitude: center.longitude,
    mapX: center.mapX,
    mapY: center.mapY,
    capacity: center.capacity,
    currentQueue: center.currentQueue,
    farmersServed: center.farmersServed,
    activeCounters: center.activeCounters,
    averageProcessingTime: center.averageProcessingTime,
    status: center.status,
    approvalStatus: center.approvalStatus,
    isSeed: center.isSeed,
    contactNumber: center.contactNumber,
    addressLine: center.addressLine,
    city: center.city,
    district: center.district,
    state: center.state,
    pincode: center.pincode,
    supportedCrops: center.supportedCrops,
    registeredById: center.registeredById,
    // Data provenance (Part 5/40) — lets the frontend/agent distinguish
    // prototype data from a verified official record instead of presenting
    // everything with equal confidence.
    code: center.code,
    operatingHours: center.operatingHours,
    contactEmail: center.contactEmail,
    dataSource: center.dataSource,
    governmentReference: center.governmentReference,
    season: center.season,
    lastVerifiedAt: center.lastVerifiedAt,
    utilization: load.utilization,
    load: load.load,
    predictedWait: load.predictedWait,
    loadStatus: load.status,
  };
}

/**
 * Farmers/public see only APPROVED centres. Admin passes { all: true } to see
 * every centre (including PENDING_APPROVAL / REJECTED / SUSPENDED).
 */
export async function listCenters(opts: { all?: boolean } = {}) {
  const centers = await prisma.procurementCenter.findMany({
    where: opts.all ? {} : { approvalStatus: 'APPROVED' },
    orderBy: [{ isSeed: 'desc' }, { name: 'asc' }],
  });
  return centers.map(present);
}

export async function getCenter(id: string) {
  const center = await prisma.procurementCenter.findUnique({ where: { id } });
  if (!center) throw ApiError.notFound('Procurement centre not found');
  return present(center);
}

export async function getCenterSchedules(centerId: string) {
  const center = await prisma.procurementCenter.findUnique({ where: { id: centerId } });
  if (!center) throw ApiError.notFound('Procurement centre not found');

  const schedules = await prisma.procurementSchedule.findMany({
    where: { centerId },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    include: { crop: true },
  });

  return schedules.map((s) => ({
    id: s.id,
    centerId: s.centerId,
    crop: s.crop.name,
    cropId: s.cropId,
    date: s.date,
    startTime: s.startTime,
    endTime: s.endTime,
    maxFarmers: s.maxFarmers,
    bookedFarmers: s.bookedFarmers,
    remaining: Math.max(0, s.maxFarmers - s.bookedFarmers),
    status: s.status,
  }));
}

export async function listAllSchedules() {
  const schedules = await prisma.procurementSchedule.findMany({
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    include: { crop: true, center: true },
  });
  return schedules.map((s) => ({
    id: s.id,
    centerId: s.centerId,
    centerName: s.center.name,
    crop: s.crop.name,
    cropId: s.cropId,
    date: s.date,
    startTime: s.startTime,
    endTime: s.endTime,
    maxFarmers: s.maxFarmers,
    bookedFarmers: s.bookedFarmers,
    remaining: Math.max(0, s.maxFarmers - s.bookedFarmers),
    status: s.status,
  }));
}

export async function updateCenterStatus(id: string, status: CenterStatus) {
  const center = await prisma.procurementCenter.findUnique({ where: { id } });
  if (!center) throw ApiError.notFound('Procurement centre not found');
  const updated = await prisma.procurementCenter.update({ where: { id }, data: { status } });
  await prisma.queue.updateMany({ where: { centerId: id }, data: { status } });
  return present(updated);
}

/** Predicted-wait helper exposed at GET /api/ai/waiting-time?centerId=. */
export async function centerWaitPrediction(centerId: string) {
  const center = await prisma.procurementCenter.findUnique({ where: { id: centerId } });
  if (!center) throw ApiError.notFound('Procurement centre not found');
  return predictWaitingTime({
    queueAhead: center.currentQueue,
    avgProcessingTime: center.averageProcessingTime,
    activeCounters: center.activeCounters,
    capacity: center.capacity,
    served: center.farmersServed,
  });
}

// ---------------------------------------------------------------------------
// Phase 5 — officer-registered centres + admin approval
// ---------------------------------------------------------------------------

export interface RegisterCenterInput {
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

/**
 * A signed-in user registers a new procurement centre. The centre starts
 * PENDING_APPROVAL; the user becomes a CENTER_OFFICER bound to that centre.
 */
export async function registerCenter(userId: string, input: RegisterCenterInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { officer: true },
  });
  if (!user) throw ApiError.notFound('User not found');
  if (user.officer) throw ApiError.conflict('This account already manages a procurement centre');

  const dupeName = await prisma.procurementCenter.findUnique({ where: { name: input.name } });
  if (dupeName) throw ApiError.conflict('A procurement centre with this name already exists');

  const center = await prisma.$transaction(async (tx) => {
    const c = await tx.procurementCenter.create({
      data: {
        name: input.name,
        location: `${input.addressLine}, ${input.city}`,
        latitude: input.latitude,
        longitude: input.longitude,
        capacity: input.capacity,
        activeCounters: input.activeCounters,
        contactNumber: input.contactNumber,
        addressLine: input.addressLine,
        city: input.city,
        district: input.district,
        state: input.state,
        pincode: input.pincode,
        supportedCrops: input.supportedCrops,
        approvalStatus: 'PENDING_APPROVAL',
        status: 'PAUSED',
        isSeed: false,
        // Entered by the centre's own officer at registration — real, but not
        // yet cross-checked against an official government source. Admin
        // approval (Part 19) is a separate step from this data-source label.
        dataSource: 'OFFICER_REPORTED',
        registeredById: userId,
        // map position derived from lng/lat so it renders on the mock canvas too
        mapX: Math.min(95, Math.max(5, (input.longitude - 75) * 60 + 30)),
        mapY: Math.min(95, Math.max(5, (27.2 - input.latitude) * 90 + 10)),
        queue: { create: { running: false, status: 'PAUSED' } },
      },
    });

    await tx.user.update({
      where: { id: userId },
      data: {
        role: 'CENTER_OFFICER',
        ...(input.officerName ? { name: input.officerName } : {}),
      },
    });
    await tx.officer.create({ data: { userId, centerId: c.id } });

    // remove the (now unused) farmer profile so /auth/me resolves as officer
    await tx.farmer.deleteMany({ where: { userId } });

    return c;
  });

  return present(center);
}

/** The authenticated officer's own centre. */
export async function getMyCenter(centerId: string) {
  const center = await prisma.procurementCenter.findUnique({ where: { id: centerId } });
  if (!center) throw ApiError.notFound('No procurement centre is associated with this account');
  return present(center);
}

const EDITABLE_KEYS = [
  'name',
  'contactNumber',
  'addressLine',
  'city',
  'district',
  'state',
  'pincode',
  'latitude',
  'longitude',
  'capacity',
  'activeCounters',
  'supportedCrops',
] as const;

export async function updateCenter(
  id: string,
  patch: Record<string, unknown>,
  requester: AuthUser,
) {
  const center = await prisma.procurementCenter.findUnique({ where: { id } });
  if (!center) throw ApiError.notFound('Procurement centre not found');

  const isOwner = requester.role === 'CENTER_OFFICER' && requester.centerId === id;
  if (requester.role !== 'ADMIN' && !isOwner) {
    throw ApiError.forbidden('You can only edit your own procurement centre');
  }
  if (center.isSeed && requester.role !== 'ADMIN') {
    throw ApiError.forbidden('Seeded demo centres can only be edited by an admin');
  }

  const data: Record<string, unknown> = {};
  for (const k of EDITABLE_KEYS) if (k in patch && patch[k] !== undefined) data[k] = patch[k];
  if (data.name && data.name !== center.name) {
    const dupe = await prisma.procurementCenter.findUnique({ where: { name: data.name as string } });
    if (dupe) throw ApiError.conflict('Another centre already uses that name');
  }

  const updated = await prisma.procurementCenter.update({ where: { id }, data });
  return present(updated);
}

/** Admin approval workflow. */
export async function setCenterApproval(
  id: string,
  action: 'APPROVE' | 'REJECT' | 'SUSPEND' | 'REINSTATE',
) {
  const center = await prisma.procurementCenter.findUnique({ where: { id } });
  if (!center) throw ApiError.notFound('Procurement centre not found');

  const map: Record<typeof action, { approvalStatus: CenterApprovalStatus; status: CenterStatus }> = {
    APPROVE: { approvalStatus: 'APPROVED', status: 'ACTIVE' },
    REINSTATE: { approvalStatus: 'APPROVED', status: 'ACTIVE' },
    REJECT: { approvalStatus: 'REJECTED', status: 'CLOSED' },
    SUSPEND: { approvalStatus: 'SUSPENDED', status: 'CLOSED' },
  };
  const next = map[action];
  const updated = await prisma.procurementCenter.update({ where: { id }, data: next });
  await prisma.queue.updateMany({
    where: { centerId: id },
    data: { status: next.status, running: next.status === 'ACTIVE' },
  });
  return present(updated);
}

export async function listCentersForRole(role: Role) {
  return listCenters({ all: role === 'ADMIN' });
}

export { present as presentCenter };
