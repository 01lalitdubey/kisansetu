import { Type, type FunctionDeclaration } from '@google/genai';
import { prisma } from '../config/database';
import { env } from '../config/env';
import { getFarmerProfile } from './farmerService';
import { listFarmerTokens } from './tokenService';
import { getQueueSnapshot } from './queueService';
import { getCenter, listCenters } from './centerService';
import { getVehicleOptions, haversineKm, quoteTransport, listFarmerTransports } from './transportService';
import { listFarmerPayments } from './paymentService';
import { listProcurements } from './procurementService';
import { listNotifications } from './notificationService';
import { getProcurementRules, searchKnowledgeBase } from './knowledge/knowledgeService';

/**
 * ---------------------------------------------------------------------------
 *  AGENT TOOLS
 *  The functions Gemini is allowed to call. Every tool is read-only and pulls
 *  from the SAME services the rest of the app uses (Prisma underneath) — no
 *  separate/duplicated data path, no invented data.
 *
 *  Farmer identity (`ctx.farmerId`) always comes from the authenticated
 *  session set up in aiController — a tool NEVER trusts a farmerId argument
 *  from the model or the request body.
 * ---------------------------------------------------------------------------
 */

export interface ToolContext {
  farmerId: string;
}

export type ToolResult = Record<string, unknown>;
export type ToolImpl = (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>;

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
const num = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);

/** Fields safe to hand to the model / farmer about a centre. */
function presentCentreForAgent(c: Awaited<ReturnType<typeof listCenters>>[number]) {
  return {
    id: c.id,
    name: c.name,
    city: c.city ?? c.district,
    district: c.district,
    address: c.addressLine ?? c.location,
    latitude: c.latitude,
    longitude: c.longitude,
    status: c.status,
    currentQueue: c.currentQueue,
    activeCounters: c.activeCounters,
    estimatedWaitMinutes: c.predictedWait,
    supportedCrops: c.supportedCrops,
    capacity: c.capacity,
    currentLoad: c.load,
    // Tell the agent (and, through it, the farmer) how trustworthy this
    // record is: "DEMO" = prototype data, never present as official.
    dataSource: c.dataSource,
  };
}

async function findCentreByNameOrId(input: { centreId?: string; centreName?: string }) {
  if (input.centreId) {
    try {
      return await getCenter(input.centreId);
    } catch {
      /* fall through to name search */
    }
  }
  if (input.centreName) {
    const all = await listCenters();
    const needle = input.centreName.toLowerCase();
    return (
      all.find((c) => c.name.toLowerCase() === needle) ??
      all.find((c) => c.name.toLowerCase().includes(needle)) ??
      null
    );
  }
  return null;
}

// ---------------------------------------------------------------------------
// Tool declarations (Gemini function-calling schema)
// ---------------------------------------------------------------------------

export const TOOL_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'searchProcurementCentres',
    description:
      'Search the real KisanSetu procurement-centre database. Call with no arguments to list all available centres (e.g. "Jaipur mein procurement centres kaunse hain?" / "What are today\'s available centres?").',
    parameters: {
      type: Type.OBJECT,
      properties: {
        city: { type: Type.STRING, description: 'Filter by city or district, e.g. "Jaipur".' },
        crop: { type: Type.STRING, description: 'Only centres that accept this crop, e.g. "Wheat".' },
        status: { type: Type.STRING, description: 'ACTIVE, PAUSED, CLOSED, or OVERLOADED.' },
        maxDistanceKm: { type: Type.NUMBER, description: "Only centres within this distance of the farmer's registered location." },
        sortBy: { type: Type.STRING, enum: ['distance', 'queue', 'wait', 'capacity'], description: 'How to order the results.' },
      },
    },
  },
  {
    name: 'getCentreDetails',
    description: 'Get full details and current status for one specific procurement centre by id or name (e.g. "Amer centre kaha hai?", "Sanganer centre open hai?").',
    parameters: {
      type: Type.OBJECT,
      properties: {
        centreId: { type: Type.STRING },
        centreName: { type: Type.STRING, description: 'e.g. "Amer", "Sanganer", "Chomu", "Bagru".' },
      },
    },
  },
  {
    name: 'recommendProcurementCentre',
    description:
      'Get the backend-calculated best centre recommendation for the farmer (e.g. "Which centre should I visit?", "Sabse kam queue kis centre par hai?"). The backend computes the answer — do not invent your own ranking.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        crop: { type: Type.STRING },
        quantity: { type: Type.NUMBER },
        preference: { type: Type.STRING, enum: ['nearest', 'lowest_queue', 'fastest'] },
      },
    },
  },
  {
    name: 'getFarmerToken',
    description: "Get the authenticated farmer's current or most recent digital token, queue position and estimated wait (e.g. \"Mera token kab aayega?\").",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'getQueueStatus',
    description: 'Get the live queue status for one procurement centre (e.g. "Amer mein kitni queue hai?").',
    parameters: {
      type: Type.OBJECT,
      properties: {
        centreId: { type: Type.STRING },
        centreName: { type: Type.STRING },
      },
    },
  },
  {
    name: 'getProcurementStatus',
    description: "Get the authenticated farmer's most recent procurement status (e.g. \"Meri procurement complete hui?\", \"Mera wheat procurement status kya hai?\").",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'getTransportOptions',
    description: 'Get available transport vehicle types, capacity, fare estimate and platform fee (e.g. "Transport kitne ka milega?").',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'getTransportStatus',
    description: "Get the authenticated farmer's most recent transport booking status (e.g. \"Mera transport book hua?\").",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'getPaymentStatus',
    description: 'Get the authenticated farmer\'s most recent payment status (e.g. "Payment successful hua?").',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'getCropInformation',
    description: 'Get crop information including MSP (minimum support price) from the KisanSetu database (e.g. "Wheat ka MSP kya hai?"). If not asked about a specific crop, uses the farmer\'s own selected crop.',
    parameters: {
      type: Type.OBJECT,
      properties: { cropName: { type: Type.STRING } },
    },
  },
  {
    name: 'getFarmerProfile',
    description: "Get the authenticated farmer's own safe profile info (name, village, selected crop, quantity, selected centre).",
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'getRecentNotifications',
    description: 'Get the authenticated farmer\'s recent KisanSetu notifications (e.g. "Koi notification aaya?").',
    parameters: { type: Type.OBJECT, properties: {} },
  },
  {
    name: 'searchKnowledgeBase',
    description:
      'Search VERIFIED static knowledge — government procedures, MSP notifications, required documents, how procurement works. ' +
      'Use this for questions about rules/process/policy (e.g. "What documents do I need?", "What is MSP?", "How does procurement work?"), ' +
      'NOT for live data like a specific centre\'s current queue or a farmer\'s own token — use the live-data tools for that.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: { type: Type.STRING, description: 'The farmer\'s question, in their own words.' },
        crop: { type: Type.STRING },
        season: { type: Type.STRING, description: 'e.g. "2026-27", if the farmer mentions a specific season.' },
      },
      required: ['query'],
    },
  },
  {
    name: 'getProcurementRules',
    description: 'Get verified procurement rules/eligibility/process information for a crop or season (e.g. "Can I sell wheat at this centre?", "How does registration work?").',
    parameters: {
      type: Type.OBJECT,
      properties: {
        topic: { type: Type.STRING, description: 'e.g. "eligibility", "registration", "documents", "quality", "payment".' },
        crop: { type: Type.STRING },
        season: { type: Type.STRING },
      },
    },
  },
];

// ---------------------------------------------------------------------------
// Tool implementations
// ---------------------------------------------------------------------------

export const TOOL_IMPLEMENTATIONS: Record<string, ToolImpl> = {
  async searchProcurementCentres(args, ctx) {
    let centres = await listCenters();

    const city = str(args.city);
    if (city) {
      const needle = city.toLowerCase();
      centres = centres.filter(
        (c) => c.city?.toLowerCase().includes(needle) || c.district?.toLowerCase().includes(needle),
      );
    }
    const crop = str(args.crop);
    if (crop) {
      const needle = crop.toLowerCase();
      centres = centres.filter((c) => c.supportedCrops.some((sc) => sc.toLowerCase().includes(needle)));
    }
    const status = str(args.status);
    if (status) centres = centres.filter((c) => c.status.toLowerCase() === status.toLowerCase());

    const maxDistanceKm = num(args.maxDistanceKm);
    const sortBy = str(args.sortBy);

    let farmerCoords: { latitude: number; longitude: number } | null = null;
    if (maxDistanceKm || sortBy === 'distance') {
      const profile = await getFarmerProfile(ctx.farmerId).catch(() => null);
      if (profile?.latitude != null && profile?.longitude != null) {
        farmerCoords = { latitude: profile.latitude, longitude: profile.longitude };
      }
    }

    const withDistance = centres.map((c) => ({
      centre: c,
      distanceKm: farmerCoords ? haversineKm(farmerCoords.latitude, farmerCoords.longitude, c.latitude, c.longitude) : null,
    }));

    let filtered = maxDistanceKm != null && farmerCoords
      ? withDistance.filter((x) => x.distanceKm != null && x.distanceKm <= maxDistanceKm)
      : withDistance;

    if (sortBy === 'distance' && farmerCoords) filtered = [...filtered].sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    else if (sortBy === 'queue') filtered = [...filtered].sort((a, b) => a.centre.currentQueue - b.centre.currentQueue);
    else if (sortBy === 'wait') filtered = [...filtered].sort((a, b) => a.centre.predictedWait - b.centre.predictedWait);
    else if (sortBy === 'capacity') filtered = [...filtered].sort((a, b) => b.centre.capacity - a.centre.capacity);

    return {
      count: filtered.length,
      centres: filtered.slice(0, 12).map((x) => ({ ...presentCentreForAgent(x.centre), distanceKm: x.distanceKm })),
    };
  },

  async getCentreDetails(args) {
    const centre = await findCentreByNameOrId({ centreId: str(args.centreId), centreName: str(args.centreName) });
    if (!centre) return { found: false, message: 'No matching procurement centre found in the KisanSetu database.' };
    return { found: true, centre: presentCentreForAgent(centre) };
  },

  async recommendProcurementCentre(args, ctx) {
    const crop = str(args.crop);
    const preference = str(args.preference) ?? 'lowest_queue';

    let centres = await listCenters();
    if (crop) {
      const needle = crop.toLowerCase();
      const filtered = centres.filter((c) => c.supportedCrops.some((sc) => sc.toLowerCase().includes(needle)));
      if (filtered.length) centres = filtered;
    }
    if (centres.length === 0) return { found: false, message: 'No procurement centres are currently available.' };

    const profile = await getFarmerProfile(ctx.farmerId).catch(() => null);
    const hasCoords = profile?.latitude != null && profile?.longitude != null;

    let ranked = centres;
    if (preference === 'nearest' && hasCoords) {
      ranked = [...centres].sort(
        (a, b) =>
          haversineKm(profile!.latitude!, profile!.longitude!, a.latitude, a.longitude) -
          haversineKm(profile!.latitude!, profile!.longitude!, b.latitude, b.longitude),
      );
    } else if (preference === 'fastest') {
      ranked = [...centres].sort((a, b) => a.predictedWait - b.predictedWait);
    } else {
      ranked = [...centres].sort((a, b) => a.currentQueue - b.currentQueue);
    }

    const top = ranked.slice(0, 3).map((c) => ({
      ...presentCentreForAgent(c),
      distanceKm: hasCoords ? haversineKm(profile!.latitude!, profile!.longitude!, c.latitude, c.longitude) : null,
    }));

    return { preference, recommended: top[0], alternatives: top.slice(1) };
  },

  async getFarmerToken(_args, ctx) {
    const tokens = await listFarmerTokens(ctx.farmerId);
    const active = tokens.find((t) => ['BOOKED', 'WAITING', 'SERVING'].includes(t.status)) ?? tokens[0] ?? null;
    if (!active) return { hasToken: false, message: 'This farmer has not booked a token yet.' };

    const base = {
      hasToken: true,
      tokenNumber: active.tokenNumber,
      status: active.status,
      crop: active.crop.name,
      quantity: active.quantity,
      centreName: active.center.name,
      queuePosition: active.queuePosition,
      estimatedWaitMinutes: active.estimatedWait,
      scheduledSlot: `${active.slotStart}-${active.slotEnd}`,
    };
    if (!['BOOKED', 'WAITING', 'SERVING'].includes(active.status)) return base;

    const snap = await getQueueSnapshot(active.centerId).catch(() => null);
    return {
      ...base,
      liveQueue: snap
        ? { currentlyServing: snap.currentlyServing, farmersAhead: snap.farmersAhead, estimatedWaitMinutes: snap.estimatedWait, centreStatus: snap.status }
        : null,
    };
  },

  async getQueueStatus(args) {
    const centre = await findCentreByNameOrId({ centreId: str(args.centreId), centreName: str(args.centreName) });
    if (!centre) return { found: false, message: 'No matching procurement centre found.' };
    const snap = await getQueueSnapshot(centre.id);
    return {
      found: true,
      centreName: snap.centerName,
      centreStatus: snap.status,
      currentToken: snap.currentlyServing,
      nextToken: snap.nextToken,
      farmersAhead: snap.farmersAhead,
      activeCounters: snap.activeCounters,
      averageProcessingMinutes: snap.averageProcessingTime,
      estimatedWaitMinutes: snap.estimatedWait,
    };
  },

  async getProcurementStatus(_args, ctx) {
    const procurements = await listProcurements({ farmerId: ctx.farmerId });
    const latest = procurements[0];
    if (!latest) return { hasProcurement: false, message: 'No procurement record exists for this farmer yet.' };
    return {
      hasProcurement: true,
      crop: latest.crop.name,
      centreName: latest.center.name,
      status: latest.status,
      declaredQuantity: latest.declaredQuantity,
      actualQuantity: latest.actualQuantity,
      totalAmount: latest.totalAmount,
      paymentStatus: latest.payment?.status ?? null,
      date: latest.createdAt,
    };
  },

  async getTransportOptions(_args, ctx) {
    const vehicles = getVehicleOptions();
    const platformFeeRate = env.PLATFORM_FEE_RATE;

    // If the farmer has a completed procurement with no transport booked yet,
    // give a REAL quote per vehicle instead of only static reference prices.
    const procurements = await listProcurements({ farmerId: ctx.farmerId });
    const eligible = procurements.find((p) => p.status === 'COMPLETED' && !p.transport);

    if (!eligible) {
      return {
        hasEligibleProcurement: false,
        note: 'No completed procurement without transport yet — showing standard reference pricing.',
        vehicles: vehicles.map((v) => ({ type: v.type, label: v.label, capacity: v.capacityLabel, baseFare: v.baseFare, perKm: v.perKm })),
        platformFeeRate,
      };
    }

    const quotes = [];
    for (const v of vehicles) {
      try {
        quotes.push(await quoteTransport({ procurementId: eligible.id, vehicleType: v.type }));
      } catch {
        /* skip a vehicle type that fails to quote */
      }
    }
    return { hasEligibleProcurement: true, crop: eligible.crop.name, quotes };
  },

  async getTransportStatus(_args, ctx) {
    const transports = await listFarmerTransports(ctx.farmerId);
    const latest = transports[0];
    if (!latest) return { hasTransport: false, message: 'No transport booking exists for this farmer yet.' };
    return {
      hasTransport: true,
      vehicleType: latest.vehicleType,
      status: latest.status,
      distanceKm: latest.distanceKm,
      transportAmount: latest.estimatedCost,
      platformFee: latest.platformFee,
      totalCost: latest.totalCost,
      paymentStatus: latest.payment?.status ?? null,
      driverName: latest.driverName,
    };
  },

  async getPaymentStatus(_args, ctx) {
    const payments = await listFarmerPayments(ctx.farmerId);
    const latest = payments[0];
    if (!latest) return { hasPayment: false, message: 'No payment record exists for this farmer yet.' };
    return {
      hasPayment: true,
      kind: latest.kind,
      amount: latest.amount,
      transportAmount: latest.transportAmount,
      platformFee: latest.platformFee,
      status: latest.status,
      paidAt: latest.paidAt,
    };
  },

  async getCropInformation(args, ctx) {
    const cropName = str(args.cropName);
    const crops = await prisma.crop.findMany();
    let target = cropName
      ? crops.find((c) => c.name.toLowerCase() === cropName.toLowerCase()) ??
        crops.find((c) => c.name.toLowerCase().includes(cropName.toLowerCase()))
      : undefined;

    // Only fall back to the farmer's own crop when NO crop was named at all —
    // a named-but-unmatched crop must be reported as not found, never
    // silently swapped for a different crop.
    if (!target && !cropName) {
      const profile = await getFarmerProfile(ctx.farmerId).catch(() => null);
      if (profile?.cropId) target = crops.find((c) => c.id === profile.cropId);
    }
    if (!target) return { found: false, message: 'Crop not found in the KisanSetu database.' };
    if (target.msp == null) {
      return { found: true, cropName: target.name, mspAvailable: false, message: 'No verified MSP information is available right now.' };
    }
    return { found: true, cropName: target.name, mspAvailable: true, mspPerQuintal: target.msp };
  },

  async getFarmerProfile(_args, ctx) {
    const profile = await getFarmerProfile(ctx.farmerId);
    return {
      name: profile.name,
      village: profile.village,
      crop: profile.crop,
      quantity: profile.quantity,
      language: profile.language,
    };
  },

  async getRecentNotifications(_args, ctx) {
    const notifications = await listNotifications(ctx.farmerId, 5);
    return {
      count: notifications.length,
      notifications: notifications.map((n) => ({ title: n.title, message: n.message, type: n.type, read: n.read, createdAt: n.createdAt })),
    };
  },

  async searchKnowledgeBase(args) {
    const results = await searchKnowledgeBase({
      query: str(args.query) ?? '',
      crop: str(args.crop),
      season: str(args.season),
    });
    if (results.length === 0) {
      return { found: false, message: 'No verified knowledge document matched this question.' };
    }
    return { found: true, documents: results };
  },

  async getProcurementRules(args) {
    const results = await getProcurementRules({
      topic: str(args.topic),
      crop: str(args.crop),
      season: str(args.season),
    });
    if (results.length === 0) {
      return { found: false, message: 'No verified procurement-rules document matched this topic.' };
    }
    return { found: true, documents: results };
  },
};
