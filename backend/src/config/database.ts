import { PrismaClient } from '@prisma/client';
import { isProd } from './env';

/**
 * Single shared PrismaClient. In dev we stash it on globalThis so tsx's
 * hot-reload doesn't open a new pool on every file change.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProd ? ['error'] : ['error', 'warn'],
  });

if (!isProd) globalForPrisma.prisma = prisma;
