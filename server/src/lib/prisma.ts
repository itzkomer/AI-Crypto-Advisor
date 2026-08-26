/**
 * Prisma singleton.
 *
 * `tsx watch` re-evaluates modules on every save, which would otherwise leak a
 * new connection pool per reload, so the client is cached on globalThis in dev.
 */
import { PrismaClient } from '@prisma/client';
import { isProduction } from '../config/env';
import { logger } from './logger';

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: isProduction ? ['error'] : ['warn', 'error'],
  });

if (!isProduction) {
  globalForPrisma.prisma = prisma;
}

export const disconnectPrisma = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
  } catch (error) {
    logger.warn('Failed to disconnect Prisma cleanly', { error: String(error) });
  }
};
