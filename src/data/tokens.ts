import type { ProcurementRecord } from '../types';

/** Farmer's past procurement visits. */
export const procurementHistory: ProcurementRecord[] = [
  {
    id: 'h-1',
    date: '02 Sep',
    crop: 'Wheat',
    quantityQuintals: 20,
    center: 'Jaipur Grain Center',
    status: 'Completed',
    amount: '₹45,300',
  },
  {
    id: 'h-2',
    date: '28 Aug',
    crop: 'Wheat',
    quantityQuintals: 30,
    center: 'Jaipur Grain Center',
    status: 'Completed',
    amount: '₹67,950',
  },
  {
    id: 'h-3',
    date: '19 Aug',
    crop: 'Mustard',
    quantityQuintals: 12,
    center: 'Sanganer Procurement Center',
    status: 'Completed',
    amount: '₹63,600',
  },
  {
    id: 'h-4',
    date: '05 Aug',
    crop: 'Wheat',
    quantityQuintals: 15,
    center: 'Jaipur Grain Center',
    status: 'Cancelled',
  },
];

export const TOKEN_SERIES_START = 127;
