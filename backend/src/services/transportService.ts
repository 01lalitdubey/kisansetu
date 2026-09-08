import type { TransportStatus, VehicleType } from '@prisma/client';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { ApiError } from '../utils/response';
import { DEMO_DRIVERS, VEHICLE_OPTIONS } from '../../prisma/seedData';

/**
 * ---------------------------------------------------------------------------
 *  TRANSPORT SERVICE  (Phase 4)
 *  Transport becomes available ONLY after a farmer's procurement is COMPLETED.
 *  The farmer pays the transport cost; KisanSetu adds a 1% platform fee.
 *  Prices are prototype / demo values.
 * ---------------------------------------------------------------------------
 */

const round2 = (n: number) => Math.round(n * 100) / 100;

export function getVehicleOptions() {
  return VEHICLE_OPTIONS;
}

/** Straight-line (haversine) distance in km — an ESTIMATE, not road distance. */
export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return round2(Math.max(3, R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))));
}

/**
 * Estimated pickup→destination distance when the farmer has no stored GPS
 * coordinates. Only ever resolves against a short list of known, real
 * Jaipur-district place coordinates — it must NEVER invent a distance (an
 * invented distance becomes an invented transport charge). If the
 * destination doesn't match a known place, the caller must ask the farmer
 * to set a verified location instead of guessing.
 */
function estimateDistanceKm(centerLat: number, centerLng: number, destination: string): number | null {
  const known: Record<string, [number, number]> = {
    jaipur: [26.9124, 75.7873],
    bassi: [26.8358, 76.0522],
    chomu: [27.1667, 75.7223],
    sanganer: [26.8189, 75.7924],
    amer: [26.9855, 75.8513],
    bagru: [26.8117, 75.5455],
    muhana: [26.8228, 75.7519],
  };
  const key = destination.toLowerCase().split(',')[0].trim();
  if (known[key]) return haversineKm(centerLat, centerLng, known[key][0], known[key][1]);
  return null;
}

export interface TransportQuote {
  vehicleType: VehicleType;
  vehicleLabel: string;
  capacityLabel: string;
  pickupLocation: string;
  destination: string;
  distanceKm: number;
  transportAmount: number;
  platformFee: number;
  totalCost: number;
  feeRate: number;
}

export async function quoteTransport(params: {
  procurementId: string;
  vehicleType: VehicleType;
  destination?: string;
}): Promise<TransportQuote> {
  const procurement = await prisma.procurement.findUnique({
    where: { id: params.procurementId },
    include: { center: true, farmer: true },
  });
  if (!procurement) throw ApiError.notFound('Procurement not found');

  const vehicle = VEHICLE_OPTIONS.find((v) => v.type === params.vehicleType);
  if (!vehicle) throw ApiError.badRequest('Unknown vehicle type');

  const f = procurement.farmer;
  const destination =
    params.destination?.trim() ||
    [f.addressLine, f.city, f.district].filter(Boolean).join(', ') ||
    f.location ||
    'Jaipur';

  // Prefer the farmer's REAL stored coordinates; fall back to a named-place
  // lookup. Either way this is an *estimated* straight-line (haversine) distance.
  let distanceKm: number;
  if (f.latitude != null && f.longitude != null) {
    distanceKm = haversineKm(
      procurement.center.latitude,
      procurement.center.longitude,
      f.latitude,
      f.longitude,
    );
  } else {
    const estimate = estimateDistanceKm(procurement.center.latitude, procurement.center.longitude, destination);
    if (estimate == null) {
      throw ApiError.badRequest(
        'We need your verified farm location to estimate transport distance and cost. Please update your address with GPS coordinates before requesting transport.',
      );
    }
    distanceKm = estimate;
  }

  const transportAmount = round2(vehicle.baseFare + vehicle.perKm * distanceKm);
  const platformFee = round2(transportAmount * env.PLATFORM_FEE_RATE);
  const totalCost = round2(transportAmount + platformFee);

  return {
    vehicleType: vehicle.type,
    vehicleLabel: vehicle.label,
    capacityLabel: vehicle.capacityLabel,
    pickupLocation: procurement.center.name,
    destination,
    distanceKm,
    transportAmount,
    platformFee,
    totalCost,
    feeRate: env.PLATFORM_FEE_RATE,
  };
}

export async function bookTransport(params: {
  farmerId: string;
  procurementId: string;
  vehicleType: VehicleType;
  destination?: string;
}) {
  const procurement = await prisma.procurement.findUnique({
    where: { id: params.procurementId },
    include: { center: true, transport: true },
  });
  if (!procurement) throw ApiError.notFound('Procurement not found');
  if (procurement.farmerId !== params.farmerId) {
    throw ApiError.forbidden('This procurement does not belong to you');
  }
  if (procurement.status !== 'COMPLETED') {
    throw ApiError.conflict('Transport can only be arranged after the procurement is completed');
  }
  if (procurement.transport && procurement.transport.status !== 'CANCELLED') {
    throw ApiError.conflict('Transport is already arranged for this procurement');
  }

  const quote = await quoteTransport({
    procurementId: params.procurementId,
    vehicleType: params.vehicleType,
    destination: params.destination,
  });

  // replace a previously cancelled transport, if any
  if (procurement.transport) {
    await prisma.transport.delete({ where: { id: procurement.transport.id } });
  }

  const transport = await prisma.transport.create({
    data: {
      farmerId: params.farmerId,
      procurementId: params.procurementId,
      centerId: procurement.centerId,
      vehicleType: quote.vehicleType,
      pickupLocation: quote.pickupLocation,
      destination: quote.destination,
      distanceKm: quote.distanceKm,
      estimatedCost: quote.transportAmount,
      platformFee: quote.platformFee,
      totalCost: quote.totalCost,
      status: 'REQUESTED',
    },
  });

  await prisma.notification.create({
    data: {
      farmerId: params.farmerId,
      type: 'TRANSPORT_UPDATE',
      title: 'Transport requested',
      message: `A ${quote.vehicleLabel.toLowerCase()} has been requested for pickup at ${quote.pickupLocation}. Complete payment to confirm.`,
      meta: { total: String(quote.totalCost), vehicle: quote.vehicleLabel },
    },
  });

  return transport;
}

export async function getTransport(id: string) {
  const transport = await prisma.transport.findUnique({
    where: { id },
    include: {
      center: true,
      procurement: { include: { crop: true } },
      farmer: { include: { user: true } },
      payment: true,
    },
  });
  if (!transport) throw ApiError.notFound('Transport not found');
  return transport;
}

export async function listFarmerTransports(farmerId: string) {
  return prisma.transport.findMany({
    where: { farmerId },
    orderBy: { createdAt: 'desc' },
    include: { center: true, procurement: { include: { crop: true } }, payment: true },
  });
}

export async function cancelTransport(id: string, farmerId: string) {
  const transport = await prisma.transport.findUnique({ where: { id }, include: { payment: true } });
  if (!transport) throw ApiError.notFound('Transport not found');
  if (transport.farmerId !== farmerId) throw ApiError.forbidden('Not your transport booking');
  if (['PICKED_UP', 'DELIVERED'].includes(transport.status)) {
    throw ApiError.conflict('Transport is already in progress and cannot be cancelled');
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.transport.update({ where: { id }, data: { status: 'CANCELLED' } });
    if (transport.payment && transport.payment.status === 'PAID') {
      await tx.payment.update({ where: { id: transport.payment.id }, data: { status: 'REFUNDED' } });
    }
    await tx.notification.create({
      data: {
        farmerId,
        type: 'TRANSPORT_UPDATE',
        title: 'Transport cancelled',
        message: `Your transport booking has been cancelled.${
          transport.payment?.status === 'PAID' ? ' A refund has been initiated.' : ''
        }`,
      },
    });
    return updated;
  });
}

const NEXT_STATUS: Record<TransportStatus, TransportStatus | null> = {
  REQUESTED: 'ASSIGNED',
  ASSIGNED: 'ON_THE_WAY',
  ON_THE_WAY: 'PICKED_UP',
  PICKED_UP: 'DELIVERED',
  DELIVERED: null,
  CANCELLED: null,
};

/** Advance / set transport status (officer, admin or demo). */
export async function updateTransportStatus(id: string, status?: TransportStatus) {
  const transport = await prisma.transport.findUnique({ where: { id } });
  if (!transport) throw ApiError.notFound('Transport not found');

  const target = status ?? NEXT_STATUS[transport.status];
  if (!target) throw ApiError.conflict(`Transport is already ${transport.status.toLowerCase()}`);

  const data: {
    status: TransportStatus;
    driverName?: string;
    driverPhone?: string;
  } = { status: target };

  if (target === 'ASSIGNED' && !transport.driverName) {
    const driver = DEMO_DRIVERS[Math.floor(Math.random() * DEMO_DRIVERS.length)];
    data.driverName = driver.name;
    data.driverPhone = driver.phone;
  }

  const updated = await prisma.transport.update({ where: { id }, data });

  await prisma.notification.create({
    data: {
      farmerId: transport.farmerId,
      type: 'TRANSPORT_UPDATE',
      title: `Transport ${target.replace(/_/g, ' ').toLowerCase()}`,
      message:
        target === 'ASSIGNED'
          ? `Driver ${updated.driverName} (${updated.driverPhone}) has been assigned.`
          : target === 'DELIVERED'
            ? 'Your produce has been delivered.'
            : `Transport status updated to ${target.replace(/_/g, ' ')}.`,
    },
  });

  return updated;
}
