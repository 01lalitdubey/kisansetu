import type { ScheduleSlot, SlotPrediction } from '../types';

/** Today's procurement schedule for the farmer's center. */
export const todaysSchedule: ScheduleSlot[] = [
  { time: '9:00 AM', status: 'completed' },
  { time: '10:00 AM', status: 'completed' },
  { time: '11:00 AM', status: 'active' },
  { time: '12:00 PM', status: 'upcoming' },
  { time: '1:00 PM', status: 'upcoming' },
];

/**
 * Candidate visit slots the AI evaluates. queue / wait numbers are the raw
 * "sensor" values recommendBestSlot() scores.
 */
export const candidateSlots: SlotPrediction[] = [
  {
    slot: '9:00 AM – 9:30 AM',
    startLabel: '9:00 AM',
    queueAhead: 72,
    waitMinutes: 140,
    crowdLevel: 'high',
    centerAvailability: 0.25,
    processingSpeed: 0.8,
  },
  {
    slot: '10:00 AM – 10:30 AM',
    startLabel: '10:00 AM',
    queueAhead: 65,
    waitMinutes: 110,
    crowdLevel: 'high',
    centerAvailability: 0.35,
    processingSpeed: 0.9,
  },
  {
    slot: '11:30 AM – 12:00 PM',
    startLabel: '11:30 AM',
    queueAhead: 18,
    waitMinutes: 35,
    crowdLevel: 'low',
    centerAvailability: 0.85,
    processingSpeed: 1.2,
  },
  {
    slot: '1:00 PM – 1:30 PM',
    startLabel: '1:00 PM',
    queueAhead: 31,
    waitMinutes: 55,
    crowdLevel: 'normal',
    centerAvailability: 0.6,
    processingSpeed: 1.0,
  },
  {
    slot: '2:00 PM – 2:30 PM',
    startLabel: '2:00 PM',
    queueAhead: 47,
    waitMinutes: 80,
    crowdLevel: 'normal',
    centerAvailability: 0.45,
    processingSpeed: 0.95,
  },
];
