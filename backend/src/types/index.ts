import type { Role } from '@prisma/client';

/** Decoded JWT payload attached to req.user by authMiddleware. */
export interface AuthUser {
  userId: string;
  role: Role;
  name: string;
  /** farmerId / officerId / adminId depending on role, when applicable */
  profileId?: string;
  centerId?: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export interface WaitPrediction {
  predictedWait: number;
  confidence: number;
  factors: string[];
}

export interface SlotOption {
  scheduleId: string;
  slot: string;
  startTime: string;
  endTime: string;
  queueAhead: number;
  estimatedWait: number;
  score: number;
}

export interface SlotRecommendationResult {
  recommendedSlot: string;
  scheduleId: string;
  estimatedWait: number;
  queueAhead: number;
  reasons: string[];
  options: SlotOption[];
}
