/**
 * Shared domain types for KisanSetu AI.
 * These mirror the shapes the backend is expected to return so that the
 * mock services in src/services/* can later be swapped for real API calls
 * without touching component code.
 */

export type Language = 'en' | 'hi' | 'hinglish';

export type CropType =
  | 'Wheat'
  | 'Rice'
  | 'Maize'
  | 'Mustard'
  | 'Soybean'
  | 'Cotton'
  | 'Other';

export type CenterLoad = 'low' | 'normal' | 'high';

export type CenterStatus = 'ACTIVE' | 'CLOSED' | 'PAUSED';

export interface Farmer {
  id: string;
  name: string;
  mobile: string;
  village: string;
  district: string;
  crop: CropType;
  quantityQuintals: number;
  registeredOn: string; // ISO date
  language: Language;
}

export interface ProcurementCenter {
  id: string;
  name: string;
  district: string;
  status: CenterStatus;
  load: CenterLoad;
  capacity: number;
  served: number;
  queueLength: number;
  predictedWaitMinutes: number;
  avgProcessingMinutes: number;
  crops: CropType[];
  lat: number;
  lng: number;
  /** relative position on the mock map canvas, 0-100 */
  mapX: number;
  mapY: number;
}

export interface SlotPrediction {
  slot: string; // e.g. "11:30 AM – 12:00 PM"
  startLabel: string; // e.g. "11:30 AM"
  queueAhead: number;
  waitMinutes: number;
  crowdLevel: CenterLoad;
  centerAvailability: number; // 0-1
  processingSpeed: number; // relative, higher is faster
}

export interface SlotRecommendation extends SlotPrediction {
  score: number;
  reasons: string[];
  /** set when the recommendation comes from the backend — needed to book */
  scheduleId?: string;
  cropId?: string;
}

export type TokenStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';

export interface Token {
  id: string; // e.g. "A127"
  farmerName: string;
  centerId: string;
  centerName: string;
  crop: CropType;
  quantityQuintals: number;
  date: string; // human readable, e.g. "9 September 2026"
  slot: string; // e.g. "11:30 AM – 12:00 PM"
  estimatedWaitMinutes: number;
  queueAhead: number;
  status: TokenStatus;
  createdAt: string; // ISO
}

export interface QueueState {
  centerId: string;
  centerName: string;
  status: CenterStatus;
  nowServing: string; // token id
  nextToken: string;
  yourToken: string | null;
  farmersAhead: number;
  estimatedWaitMinutes: number;
  avgProcessingMinutes: number;
  upcoming: string[]; // ordered token ids
  running: boolean;
}

export type ScheduleSlotStatus = 'completed' | 'active' | 'upcoming';

export interface ScheduleSlot {
  time: string; // e.g. "9:00 AM"
  status: ScheduleSlotStatus;
}

export type NotificationKind =
  | 'schedule'
  | 'crowd'
  | 'started'
  | 'token'
  | 'ai'
  | 'system';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  meta?: Record<string, string>;
  timestamp: string; // ISO
  read: boolean;
}

export interface ProcurementRecord {
  id: string;
  date: string; // e.g. "02 Sep"
  crop: CropType;
  quantityQuintals: number;
  center: string;
  status: 'Completed' | 'Cancelled';
  amount?: string;
}

export interface LoadBalancingRecommendation {
  id: string;
  fromCenterId: string;
  fromCenterName: string;
  toCenterId: string;
  toCenterName: string;
  overflowPercent: number;
  redirectFarmers: number;
  waitBeforeMinutes: number;
  waitAfterMinutes: number;
  reductionPercent: number;
  applied: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}
