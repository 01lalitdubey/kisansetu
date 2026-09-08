/**
 * Maps backend DTOs (cuid ids, ISO dates, backend enums) onto the frontend's
 * existing domain types so components never have to change.
 *
 * The frontend keeps using stable slug ids for centres ("jaipur-grain"); the
 * store holds a slug -> cuid map for API calls.
 */
import type {
  AppNotification,
  CenterLoad,
  CropType,
  Farmer,
  Language,
  LoadBalancingRecommendation,
  NotificationKind,
  ProcurementCenter,
  ProcurementRecord,
  QueueState,
  SlotRecommendation,
  Token,
} from '../types';

export function centerSlug(name: string): string {
  return name
    .replace(/ Procurement Center$/i, '')
    .replace(/ Grain Center$/i, ' Grain')
    .replace(/ Center$/i, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-');
}

const loadFromBackend = (v: string): CenterLoad =>
  v === 'HIGH' ? 'high' : v === 'LOW' ? 'low' : 'normal';

/** 24h "HH:MM" -> "H:MM AM/PM" */
export function to12h(hhmm: string): string {
  const [hStr, m = '00'] = hhmm.split(':');
  let h = parseInt(hStr, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${m.padStart(2, '0')} ${ampm}`;
}

function addMinutesLabel(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(':').map((x) => parseInt(x, 10));
  const total = h * 60 + m + minutes;
  const nh = Math.floor(total / 60) % 24;
  const nm = total % 60;
  return to12h(`${nh}:${String(nm).padStart(2, '0')}`);
}

// --- centre --------------------------------------------------------------

interface ApiCenter {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  mapX: number;
  mapY: number;
  capacity: number;
  currentQueue: number;
  farmersServed: number;
  activeCounters: number;
  averageProcessingTime: number;
  status: string;
  utilization: number;
  load: string;
  predictedWait: number;
}

export function toCenter(api: ApiCenter): ProcurementCenter {
  return {
    id: centerSlug(api.name),
    name: api.name,
    district: api.location.split(',').pop()?.trim() ?? api.location,
    status: api.status === 'CLOSED' ? 'CLOSED' : api.status === 'PAUSED' ? 'PAUSED' : 'ACTIVE',
    load: loadFromBackend(api.load),
    capacity: api.capacity,
    served: api.farmersServed,
    queueLength: api.currentQueue,
    predictedWaitMinutes: api.predictedWait,
    avgProcessingMinutes: api.averageProcessingTime,
    crops: ['Wheat'],
    lat: api.latitude,
    lng: api.longitude,
    mapX: api.mapX,
    mapY: api.mapY,
  };
}

/** slug -> backend cuid, built from a /centers list response. */
export function centerIdMap(list: ApiCenter[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const c of list) map[centerSlug(c.name)] = c.id;
  return map;
}

// --- farmer -----------------------------------------------------------

interface ApiFarmer {
  id: string;
  name: string;
  mobile: string;
  village: string;
  district?: string;
  location?: string;
  language: string;
  crop: string | null;
  cropId: string | null;
  quantity: number;
  registeredOn: string;
}

export function toFarmer(api: ApiFarmer, fallbackLang: Language): Farmer {
  const validCrops: CropType[] = ['Wheat', 'Rice', 'Maize', 'Mustard', 'Soybean', 'Cotton', 'Other'];
  return {
    id: api.id,
    name: api.name,
    mobile: api.mobile,
    village: api.village,
    district: api.district ?? api.location?.split(',').pop()?.trim() ?? 'Jaipur',
    crop: (validCrops.includes(api.crop as CropType) ? api.crop : 'Wheat') as CropType,
    quantityQuintals: api.quantity || 25,
    registeredOn: (api.registeredOn ?? '').slice(0, 10),
    language: (['en', 'hi', 'hinglish'].includes(api.language) ? api.language : fallbackLang) as Language,
  };
}

// --- token ----------------------------------------------------------

interface ApiTokenCreate {
  id: string;
  tokenNumber: string;
  farmerName: string;
  centerId: string;
  centerName: string;
  cropName: string;
  quantity: number;
  date: string;
  slotStart: string;
  slotEnd: string;
  queuePosition: number;
  queueAhead: number;
  estimatedWait: number;
  status: string;
}

interface ApiTokenDetail {
  id: string;
  tokenNumber: string;
  farmer: { name: string };
  center: { name: string };
  crop: string;
  quantity: number;
  date: string;
  slotStart: string;
  slotEnd: string;
  queuePosition: number;
  queueAhead: number;
  estimatedWait: number;
  status: string;
  createdAt: string;
}

const tokenStatus = (s: string): Token['status'] =>
  s === 'COMPLETED' ? 'COMPLETED' : s === 'CANCELLED' ? 'CANCELLED' : 'ACTIVE';

const humanDate = (iso: string): string => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
};

export function toTokenFromCreate(api: ApiTokenCreate): Token {
  return {
    id: api.tokenNumber,
    farmerName: api.farmerName,
    centerId: centerSlug(api.centerName),
    centerName: api.centerName,
    crop: api.cropName as CropType,
    quantityQuintals: api.quantity,
    date: humanDate(api.date),
    slot: `${to12h(api.slotStart)} – ${to12h(api.slotEnd)}`,
    estimatedWaitMinutes: api.estimatedWait,
    queueAhead: api.queueAhead,
    status: tokenStatus(api.status),
    createdAt: new Date().toISOString(),
  };
}

export function toTokenFromDetail(api: ApiTokenDetail): Token {
  return {
    id: api.tokenNumber,
    farmerName: api.farmer.name,
    centerId: centerSlug(api.center.name),
    centerName: api.center.name,
    crop: api.crop as CropType,
    quantityQuintals: api.quantity,
    date: humanDate(api.date),
    slot: `${to12h(api.slotStart)} – ${to12h(api.slotEnd)}`,
    estimatedWaitMinutes: api.estimatedWait,
    queueAhead: api.queueAhead,
    status: tokenStatus(api.status),
    createdAt: api.createdAt,
  };
}

// --- queue ---------------------------------------------------------

interface ApiQueue {
  centerId: string;
  centerName: string;
  status: string;
  running: boolean;
  currentlyServing: string | null;
  currentTokenId: string | null;
  nextToken: string | null;
  nextTokenId: string | null;
  farmersAhead: number;
  farmersWaiting: number;
  estimatedWait: number;
  averageProcessingTime: number;
  activeCounters: number;
  queueEntries: {
    tokenId: string;
    tokenNumber: string;
    farmerName: string;
    position: number;
    status: string;
    estimatedWait: number;
  }[];
}

export function toQueueState(api: ApiQueue, yourToken: string | null, running: boolean): QueueState {
  const serving = api.currentlyServing ?? api.queueEntries[0]?.tokenNumber ?? 'A113';
  const servingNum = parseInt(serving.replace(/\D/g, ''), 10) || 113;
  const yourNum = yourToken ? parseInt(yourToken.replace(/\D/g, ''), 10) : null;
  const farmersAhead =
    yourNum !== null ? Math.max(0, yourNum - servingNum - 1) : api.farmersAhead;

  return {
    centerId: centerSlug(api.centerName),
    centerName: api.centerName,
    status: api.status === 'OVERLOADED' ? 'ACTIVE' : (api.status as QueueState['status']),
    nowServing: serving,
    nextToken: api.nextToken ?? `A${servingNum + 1}`,
    yourToken,
    farmersAhead,
    estimatedWaitMinutes:
      yourNum !== null
        ? Math.round((farmersAhead * api.averageProcessingTime) / Math.max(1, api.activeCounters))
        : api.estimatedWait,
    avgProcessingMinutes: api.averageProcessingTime,
    upcoming: api.queueEntries.map((e) => e.tokenNumber),
    running,
  };
}

/** token cuid for the currently-serving / a given token number, for officer actions. */
export function findEntryTokenId(api: ApiQueue, tokenNumber: string | null): string | null {
  if (tokenNumber === 'CURRENT' || !tokenNumber) return api.currentTokenId;
  return api.queueEntries.find((e) => e.tokenNumber === tokenNumber)?.tokenId ?? null;
}

// --- recommendation (best slot) -----------------------------------

interface ApiSlotRecommendation {
  recommendedSlot: string;
  scheduleId: string;
  estimatedWait: number;
  queueAhead: number;
  reasons: string[];
  options: { scheduleId: string; slot: string; startTime: string; endTime: string; score: number }[];
}

export function toSlotRecommendation(api: ApiSlotRecommendation, cropId?: string): SlotRecommendation {
  const opt = api.options.find((o) => o.scheduleId === api.scheduleId) ?? api.options[0];
  const start = opt?.startTime ?? api.recommendedSlot;
  const end = opt?.endTime ?? addMinutesLabel(start, 30);
  return {
    slot: `${to12h(start)} – ${to12h(end)}`,
    startLabel: to12h(start),
    queueAhead: api.queueAhead,
    waitMinutes: api.estimatedWait,
    crowdLevel: api.queueAhead < 25 ? 'low' : api.queueAhead < 45 ? 'normal' : 'high',
    centerAvailability: 0.8,
    processingSpeed: 1.15,
    score: opt?.score ?? 90,
    reasons: api.reasons?.length ? api.reasons : ['Lower predicted crowd', 'High center availability'],
    scheduleId: api.scheduleId,
    cropId,
  };
}

// --- load balancing ------------------------------------------------

interface ApiLoadBalancing {
  id: string;
  fromCenterId: string;
  toCenterId: string;
  fromCenter: { name: string };
  toCenter: { name: string };
  overflowPercent: number;
  redirectFarmers: number;
  waitBeforeMinutes: number;
  waitAfterMinutes: number;
  reductionPercent: number;
  status: string;
}

export function toLoadBalancing(api: ApiLoadBalancing | null): LoadBalancingRecommendation | null {
  if (!api) return null;
  return {
    id: api.id,
    fromCenterId: centerSlug(api.fromCenter.name),
    fromCenterName: api.fromCenter.name,
    toCenterId: centerSlug(api.toCenter.name),
    toCenterName: api.toCenter.name,
    overflowPercent: api.overflowPercent,
    redirectFarmers: api.redirectFarmers,
    waitBeforeMinutes: api.waitBeforeMinutes,
    waitAfterMinutes: api.waitAfterMinutes,
    reductionPercent: api.reductionPercent,
    applied: api.status === 'APPLIED',
  };
}

// --- notifications ----------------------------------------------

interface ApiNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  meta?: Record<string, string> | null;
  read: boolean;
  createdAt: string;
}

const kindFromType = (t: string): NotificationKind => {
  switch (t) {
    case 'SCHEDULE_CHANGE':
      return 'schedule';
    case 'QUEUE_ALERT':
      return 'crowd';
    case 'PROCUREMENT_STARTED':
      return 'started';
    case 'HIGH_DEMAND':
      return 'ai';
    case 'PAYMENT_UPDATE':
      return 'ai';
    case 'TOKEN_UPDATE':
      return 'token';
    default:
      return 'system';
  }
};

export function toNotification(api: ApiNotification): AppNotification {
  return {
    id: api.id,
    kind: kindFromType(api.type),
    title: api.title,
    body: api.message,
    meta: api.meta ?? undefined,
    timestamp: api.createdAt,
    read: api.read,
  };
}

// --- history ---------------------------------------------------

interface ApiHistory {
  id: string;
  date: string;
  crop: string;
  quantity: number;
  center: string;
  status: string;
  amount?: string;
}

export function toProcurementRecord(api: ApiHistory): ProcurementRecord {
  const d = new Date(api.date);
  return {
    id: api.id,
    date: Number.isNaN(d.getTime())
      ? api.date
      : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    crop: api.crop as CropType,
    quantityQuintals: Math.round(api.quantity),
    center: api.center,
    status: api.status === 'Completed' ? 'Completed' : 'Cancelled',
    amount: api.amount,
  };
}
