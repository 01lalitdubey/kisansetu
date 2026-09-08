/**
 * Mock analytics series for the officer + admin dashboards.
 * Shapes match what a real /api/analytics endpoint would return.
 */

export const dailyFarmersServed = [
  { day: 'Mon', served: 812 },
  { day: 'Tue', served: 934 },
  { day: 'Wed', served: 1021 },
  { day: 'Thu', served: 889 },
  { day: 'Fri', served: 1187 },
  { day: 'Sat', served: 1342 },
  { day: 'Sun', served: 623 },
];

export const avgWaitingTime = [
  { day: 'Mon', minutes: 58 },
  { day: 'Tue', minutes: 51 },
  { day: 'Wed', minutes: 64 },
  { day: 'Thu', minutes: 47 },
  { day: 'Fri', minutes: 72 },
  { day: 'Sat', minutes: 68 },
  { day: 'Sun', minutes: 39 },
];

export const centerUtilization = [
  { center: 'Jaipur Grain', utilization: 68 },
  { center: 'Amer', utilization: 98 },
  { center: 'Sanganer', utilization: 31 },
  { center: 'Chomu', utilization: 62 },
  { center: 'Bagru', utilization: 60 },
];

export const procurementByCrop = [
  { crop: 'Wheat', value: 5820, color: '#16a34a' },
  { crop: 'Mustard', value: 1640, color: '#d2b183' },
  { crop: 'Maize', value: 890, color: '#2563eb' },
  { crop: 'Soybean', value: 410, color: '#a97742' },
  { crop: 'Cotton', value: 182, color: '#4ade80' },
];

export const peakHours = [
  { hour: '8 AM', farmers: 64 },
  { hour: '9 AM', farmers: 128 },
  { hour: '10 AM', farmers: 156 },
  { hour: '11 AM', farmers: 142 },
  { hour: '12 PM', farmers: 98 },
  { hour: '1 PM', farmers: 76 },
  { hour: '2 PM', farmers: 112 },
  { hour: '3 PM', farmers: 88 },
];

export const adminMetrics = {
  totalCenters: 48,
  totalFarmers: 12480,
  totalProcurement: 8942,
  paymentValue: '₹18.4 Cr',
  avgWait: 42,
  activeCenters: 41,
};

export const centerPerformance = [
  { center: 'Jaipur Grain Center', served: 923, avgWait: 35, satisfaction: 4.4 },
  { center: 'Amer Procurement Center', served: 1104, avgWait: 142, satisfaction: 3.1 },
  { center: 'Sanganer Procurement Center', served: 512, avgWait: 20, satisfaction: 4.7 },
  { center: 'Chomu Procurement Center', served: 806, avgWait: 48, satisfaction: 4.2 },
  { center: 'Bagru Procurement Center', served: 671, avgWait: 40, satisfaction: 4.3 },
];

export const aiInsights = [
  'Amer Procurement Center is trending 18% over capacity for the third day — consider adding a counter.',
  'Shifting 25 farmers/day from Amer to Sanganer would cut state-wide average wait by ~9 minutes.',
  'Wheat arrivals peak between 10–11 AM; staggered tokens reduced no-shows by 12% last week.',
  'Sanganer has spare capacity every afternoon — a good target for redirected load.',
];
