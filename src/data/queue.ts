import type { QueueState } from '../types';

/** Build the ordered list of token ids from A113 onward. */
export function buildUpcomingTokens(start = 113, count = 20): string[] {
  return Array.from({ length: count }, (_, i) => `A${start + i}`);
}

export const initialFarmerQueue: QueueState = {
  centerId: 'jaipur-grain',
  centerName: 'Jaipur Grain Center',
  status: 'ACTIVE',
  nowServing: 'A113',
  nextToken: 'A114',
  yourToken: null,
  farmersAhead: 14,
  estimatedWaitMinutes: 32,
  avgProcessingMinutes: 7,
  upcoming: buildUpcomingTokens(113, 20),
  running: true,
};

export const initialOfficerQueue: QueueState = {
  centerId: 'jaipur-grain',
  centerName: 'Jaipur Grain Center',
  status: 'ACTIVE',
  nowServing: 'A113',
  nextToken: 'A114',
  yourToken: null,
  farmersAhead: 18,
  estimatedWaitMinutes: 35,
  avgProcessingMinutes: 7,
  upcoming: buildUpcomingTokens(113, 24),
  running: true,
};
