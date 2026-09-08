import type { QueueState } from '../types';
import { predictWaitingTime } from './mockAI';

/**
 * ---------------------------------------------------------------------------
 *  MOCK QUEUE SERVICE
 *  Pure functions that advance a QueueState by one "tick". The farmer Live
 *  Queue page calls advanceQueue() on a timer; the officer page calls
 *  processNextToken() on a button press. Replace with a WebSocket feed
 *  (VITE_QUEUE_WS_URL) later — the state shape stays the same.
 * ---------------------------------------------------------------------------
 */

function tokenNumber(id: string): number {
  return parseInt(id.replace(/\D/g, ''), 10) || 0;
}

function tokenId(prefix: string, n: number): string {
  return `${prefix}${n}`;
}

function recompute(state: QueueState): QueueState {
  const servingN = tokenNumber(state.nowServing);
  const yourN = state.yourToken ? tokenNumber(state.yourToken) : null;
  const farmersAhead =
    yourN !== null ? Math.max(0, yourN - servingN - 1) : Math.max(0, state.farmersAhead);
  return {
    ...state,
    nextToken: tokenId(state.nowServing.replace(/\d/g, ''), servingN + 1),
    farmersAhead,
    estimatedWaitMinutes: predictWaitingTime(farmersAhead, state.avgProcessingMinutes),
    upcoming: state.upcoming.filter((t) => tokenNumber(t) > servingN),
  };
}

/**
 * advanceQueue()
 * Move the "now serving" token forward by one. Used by the farmer's
 * simulated real-time queue.
 */
export function advanceQueue(state: QueueState): QueueState {
  if (!state.running) return state;
  const servingN = tokenNumber(state.nowServing);
  const lastN = state.upcoming.length
    ? tokenNumber(state.upcoming[state.upcoming.length - 1])
    : servingN + 1;
  if (servingN >= lastN) return state; // queue drained
  return recompute({
    ...state,
    nowServing: tokenId(state.nowServing.replace(/\d/g, ''), servingN + 1),
  });
}

/**
 * processNextToken()
 * Officer action: finish the current farmer, call the next token.
 */
export function processNextToken(state: QueueState): QueueState {
  const next = advanceQueue({ ...state, running: true });
  return { ...next, running: state.running };
}

/**
 * skipToken()
 * Officer action: current farmer is absent, move on without counting them.
 */
export function skipToken(state: QueueState): QueueState {
  return processNextToken(state);
}

export function setRunning(state: QueueState, running: boolean): QueueState {
  return { ...state, running };
}

/** Attach the farmer's booked token to the live queue. */
export function attachToken(state: QueueState, tokenId: string): QueueState {
  return recompute({ ...state, yourToken: tokenId });
}

/** Officer "surge": inflate the queue to simulate high demand. */
export function surgeQueue(state: QueueState, addFarmers: number): QueueState {
  const lastN = state.upcoming.length
    ? tokenNumber(state.upcoming[state.upcoming.length - 1])
    : tokenNumber(state.nowServing) + 1;
  const extra = Array.from({ length: addFarmers }, (_, i) =>
    tokenId(state.nowServing.replace(/\d/g, ''), lastN + i + 1),
  );
  const merged = { ...state, upcoming: [...state.upcoming, ...extra] };
  return {
    ...merged,
    farmersAhead: merged.farmersAhead + addFarmers,
    estimatedWaitMinutes: predictWaitingTime(
      merged.farmersAhead + addFarmers,
      state.avgProcessingMinutes,
    ),
  };
}
