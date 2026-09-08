/**
 * Canonical demo constants. Shared by prisma/seed.ts and the demo "reset"
 * endpoint so a reset restores exactly the state the seed produced.
 * Values mirror the frontend's original mock data wherever possible.
 */

export const CROPS: { name: string; msp: number | null }[] = [
  { name: 'Wheat', msp: 2425 },
  { name: 'Rice', msp: 2300 },
  { name: 'Maize', msp: 2225 },
  { name: 'Mustard', msp: 5650 },
  { name: 'Soybean', msp: 4892 },
  { name: 'Cotton', msp: 7521 },
  { name: 'Other', msp: null },
];

export interface SeedCenter {
  key: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  capacity: number;
  currentQueue: number;
  farmersServed: number;
  activeCounters: number;
  averageProcessingTime: number;
  status: 'ACTIVE' | 'PAUSED' | 'CLOSED' | 'OVERLOADED';
  mapX: number;
  mapY: number;
}

export const CENTERS: SeedCenter[] = [
  {
    key: 'jaipur-grain',
    name: 'Jaipur Grain Center',
    location: 'Bassi, Jaipur',
    latitude: 26.9124,
    longitude: 75.7873,
    capacity: 120,
    currentQueue: 18,
    farmersServed: 82,
    activeCounters: 3,
    averageProcessingTime: 7,
    status: 'ACTIVE',
    mapX: 46,
    mapY: 52,
  },
  {
    key: 'amer',
    name: 'Amer Procurement Center',
    location: 'Amer, Jaipur',
    latitude: 26.9855,
    longitude: 75.8513,
    capacity: 120,
    currentQueue: 67,
    farmersServed: 117,
    activeCounters: 3,
    averageProcessingTime: 9,
    status: 'OVERLOADED',
    mapX: 62,
    mapY: 28,
  },
  {
    key: 'sanganer',
    name: 'Sanganer Procurement Center',
    location: 'Sanganer, Jaipur',
    latitude: 26.8189,
    longitude: 75.7924,
    capacity: 100,
    currentQueue: 12,
    farmersServed: 31,
    activeCounters: 3,
    averageProcessingTime: 6,
    status: 'ACTIVE',
    mapX: 44,
    mapY: 74,
  },
  {
    key: 'chomu',
    name: 'Chomu Procurement Center',
    location: 'Chomu, Jaipur',
    latitude: 27.1667,
    longitude: 75.7223,
    capacity: 110,
    currentQueue: 24,
    farmersServed: 68,
    activeCounters: 3,
    averageProcessingTime: 8,
    status: 'ACTIVE',
    mapX: 30,
    mapY: 14,
  },
  {
    key: 'bagru',
    name: 'Bagru Procurement Center',
    location: 'Bagru, Jaipur',
    latitude: 26.8117,
    longitude: 75.5455,
    capacity: 90,
    currentQueue: 19,
    farmersServed: 54,
    activeCounters: 3,
    averageProcessingTime: 7,
    status: 'ACTIVE',
    mapX: 18,
    mapY: 64,
  },
  // --- Phase 4: more Jaipur-area procurement / mandi locations ---
  // Demo / prototype centre data — coordinates are real Krishi Upaj Mandi
  // townships around Jaipur; queue / capacity figures are simulated.
  {
    key: 'muhana',
    name: 'Muhana Grain Mandi',
    location: 'Muhana, Jaipur',
    latitude: 26.8228,
    longitude: 75.7519,
    capacity: 160,
    currentQueue: 43,
    farmersServed: 96,
    activeCounters: 4,
    averageProcessingTime: 8,
    status: 'ACTIVE',
    mapX: 40,
    mapY: 66,
  },
  {
    key: 'chaksu',
    name: 'Chaksu Procurement Center',
    location: 'Chaksu, Jaipur',
    latitude: 26.6069,
    longitude: 75.9469,
    capacity: 95,
    currentQueue: 9,
    farmersServed: 22,
    activeCounters: 2,
    averageProcessingTime: 7,
    status: 'ACTIVE',
    mapX: 66,
    mapY: 92,
  },
  {
    key: 'phulera',
    name: 'Phulera Procurement Center',
    location: 'Phulera, Jaipur',
    latitude: 26.873,
    longitude: 75.2418,
    capacity: 100,
    currentQueue: 28,
    farmersServed: 61,
    activeCounters: 3,
    averageProcessingTime: 8,
    status: 'ACTIVE',
    mapX: 8,
    mapY: 50,
  },
  {
    key: 'kotputli',
    name: 'Kotputli Procurement Center',
    location: 'Kotputli, Jaipur',
    latitude: 27.7028,
    longitude: 76.1996,
    capacity: 110,
    currentQueue: 15,
    farmersServed: 40,
    activeCounters: 3,
    averageProcessingTime: 7,
    status: 'ACTIVE',
    mapX: 86,
    mapY: 6,
  },
  {
    key: 'dudu',
    name: 'Dudu Procurement Center',
    location: 'Dudu, Jaipur',
    latitude: 26.7028,
    longitude: 75.2333,
    capacity: 80,
    currentQueue: 6,
    farmersServed: 18,
    activeCounters: 2,
    averageProcessingTime: 6,
    status: 'ACTIVE',
    mapX: 6,
    mapY: 78,
  },
  {
    key: 'shahpura',
    name: 'Shahpura Procurement Center',
    location: 'Shahpura, Jaipur',
    latitude: 27.3906,
    longitude: 75.9639,
    capacity: 105,
    currentQueue: 33,
    farmersServed: 72,
    activeCounters: 3,
    averageProcessingTime: 8,
    status: 'ACTIVE',
    mapX: 70,
    mapY: 4,
  },
  {
    key: 'jobner',
    name: 'Jobner Procurement Center',
    location: 'Jobner, Jaipur',
    latitude: 26.9764,
    longitude: 75.3892,
    capacity: 85,
    currentQueue: 11,
    farmersServed: 27,
    activeCounters: 2,
    averageProcessingTime: 7,
    status: 'ACTIVE',
    mapX: 16,
    mapY: 40,
  },
];

export interface SeedFarmer {
  name: string;
  mobile: string;
  email?: string;
  village: string;
  location: string;
  language: string;
  crop: string;
  quantity: number;
}

export const DEMO_FARMER: SeedFarmer = {
  name: 'Rajesh',
  mobile: '9829011223',
  email: 'farmer@demo.com',
  village: 'Bassi',
  location: 'Bassi, Jaipur',
  language: 'hi',
  crop: 'Wheat',
  quantity: 25,
};

/** Real address for the seeded demo farmer (Bassi, Jaipur). */
export const DEMO_FARMER_ADDRESS = {
  addressLine: 'Near Bassi Bus Stand, Agra Road',
  city: 'Bassi',
  district: 'Jaipur',
  state: 'Rajasthan',
  pincode: '303301',
  latitude: 26.8358,
  longitude: 76.0522,
};

/** Crops each seeded centre is set up to procure. */
export const DEFAULT_SUPPORTED_CROPS = ['Wheat', 'Mustard', 'Maize'];

export const FARMERS: SeedFarmer[] = [
  DEMO_FARMER,
  { name: 'Sunita Devi', mobile: '9928144556', village: 'Chomu', location: 'Chomu, Jaipur', language: 'hi', crop: 'Mustard', quantity: 18 },
  { name: 'Mohan Lal', mobile: '9772288991', village: 'Sanganer', location: 'Sanganer, Jaipur', language: 'hinglish', crop: 'Wheat', quantity: 32 },
  { name: 'Kavita Sharma', mobile: '9649022114', village: 'Bagru', location: 'Bagru, Jaipur', language: 'hi', crop: 'Maize', quantity: 27 },
  { name: 'Ramesh Meena', mobile: '9587066332', village: 'Amer', location: 'Amer, Jaipur', language: 'hinglish', crop: 'Wheat', quantity: 41 },
  { name: 'Pooja Yadav', mobile: '9461277889', village: 'Bassi', location: 'Bassi, Jaipur', language: 'en', crop: 'Soybean', quantity: 22 },
  { name: 'Dinesh Gurjar', mobile: '9314055221', village: 'Chomu', location: 'Chomu, Jaipur', language: 'hi', crop: 'Cotton', quantity: 15 },
  { name: 'Anita Kumari', mobile: '9255033447', village: 'Sanganer', location: 'Sanganer, Jaipur', language: 'hinglish', crop: 'Wheat', quantity: 29 },
  { name: 'Suresh Jat', mobile: '9090011234', village: 'Bagru', location: 'Bagru, Jaipur', language: 'hi', crop: 'Wheat', quantity: 36 },
  { name: 'Meena Rathore', mobile: '9090055678', village: 'Bassi', location: 'Bassi, Jaipur', language: 'en', crop: 'Mustard', quantity: 21 },
  { name: 'Gopal Saini', mobile: '9090099012', village: 'Chomu', location: 'Chomu, Jaipur', language: 'hinglish', crop: 'Maize', quantity: 24 },
  { name: 'Laxmi Bai', mobile: '9090033456', village: 'Sanganer', location: 'Sanganer, Jaipur', language: 'hi', crop: 'Wheat', quantity: 30 },
];

/** Officers — one per centre. */
export const OFFICERS: { name: string; mobile: string; email: string; centerKey: string }[] = [
  { name: 'Officer Verma', mobile: '9800000001', email: 'officer@demo.com', centerKey: 'jaipur-grain' },
  { name: 'Officer Singh', mobile: '9800000002', email: 'officer.amer@demo.com', centerKey: 'amer' },
  { name: 'Officer Gupta', mobile: '9800000003', email: 'officer.sanganer@demo.com', centerKey: 'sanganer' },
  { name: 'Officer Rao', mobile: '9800000004', email: 'officer.chomu@demo.com', centerKey: 'chomu' },
  { name: 'Officer Nair', mobile: '9800000005', email: 'officer.bagru@demo.com', centerKey: 'bagru' },
];

export const ADMIN = { name: 'State Admin', mobile: '9700000001', email: 'admin@demo.com' };

/** Today's schedule for each centre (all Wheat unless noted). */
export const SCHEDULE_SLOTS: {
  startTime: string;
  endTime: string;
  status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  maxFarmers: number;
  booked: number;
}[] = [
  { startTime: '09:00', endTime: '09:30', status: 'COMPLETED', maxFarmers: 40, booked: 40 },
  { startTime: '10:00', endTime: '10:30', status: 'COMPLETED', maxFarmers: 40, booked: 38 },
  { startTime: '11:00', endTime: '11:30', status: 'ACTIVE', maxFarmers: 40, booked: 22 },
  { startTime: '11:30', endTime: '12:00', status: 'UPCOMING', maxFarmers: 40, booked: 18 },
  { startTime: '13:00', endTime: '13:30', status: 'UPCOMING', maxFarmers: 40, booked: 31 },
  { startTime: '14:00', endTime: '14:30', status: 'UPCOMING', maxFarmers: 40, booked: 12 },
];

/** Base notifications for the demo farmer (restored on reset). */
export const BASE_NOTIFICATIONS: {
  type: 'SCHEDULE_CHANGE' | 'QUEUE_ALERT' | 'PROCUREMENT_STARTED' | 'TOKEN_UPDATE' | 'HIGH_DEMAND' | 'PAYMENT_UPDATE';
  title: string;
  message: string;
  meta?: Record<string, string>;
  read: boolean;
}[] = [
  {
    type: 'SCHEDULE_CHANGE',
    title: 'Procurement Schedule Updated',
    message: 'Your wheat procurement slot has changed.',
    meta: { Old: '11:30 AM', New: '1:00 PM' },
    read: false,
  },
  {
    type: 'QUEUE_ALERT',
    title: 'Low Crowd Alert',
    message: 'This is a good time to visit.',
    meta: { 'Current waiting time': '25 minutes' },
    read: false,
  },
  {
    type: 'PROCUREMENT_STARTED',
    title: 'Procurement Started',
    message: 'Your procurement center is now accepting wheat.',
    meta: { Center: 'Jaipur Grain Center' },
    read: true,
  },
];

export const TOKEN_SEED_START = 113; // seeded live queue tokens A113..A126
export const TOKEN_SEED_COUNT = 14;

// ---------------------------------------------------------------------------
// Phase 4 — Transport
// ---------------------------------------------------------------------------

/** KisanSetu AI platform service fee, charged on top of the transport cost. */
export const PLATFORM_FEE_RATE = 0.01; // 1%

export interface VehicleOption {
  type: 'SMALL' | 'MEDIUM' | 'LARGE';
  label: string;
  capacityQuintals: number;
  capacityLabel: string;
  /** ₹ base fare + ₹ per km — prototype pricing only */
  baseFare: number;
  perKm: number;
}

/**
 * Prototype / demo transport pricing. The farmer pays the transport cost;
 * the platform does not provide free transport.
 */
export const VEHICLE_OPTIONS: VehicleOption[] = [
  {
    type: 'SMALL',
    label: 'Small Vehicle',
    capacityQuintals: 50,
    capacityLabel: 'up to 50 quintals',
    baseFare: 600,
    perKm: 22,
  },
  {
    type: 'MEDIUM',
    label: 'Medium Vehicle',
    capacityQuintals: 100,
    capacityLabel: 'up to 100 quintals',
    baseFare: 900,
    perKm: 32,
  },
  {
    type: 'LARGE',
    label: 'Large Vehicle',
    capacityQuintals: 300,
    capacityLabel: '100+ quintals',
    baseFare: 1600,
    perKm: 48,
  },
];

/** Demo driver pool — assigned when a transport moves to ASSIGNED. */
export const DEMO_DRIVERS = [
  { name: 'Ravi Kumar', phone: '+91 90000 11111' },
  { name: 'Sohan Lal', phone: '+91 90000 22222' },
  { name: 'Imran Khan', phone: '+91 90000 33333' },
  { name: 'Prakash Meena', phone: '+91 90000 44444' },
];
