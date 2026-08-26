/** HTTP entrypoint. */
import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { disconnectPrisma, prisma } from './lib/prisma';

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`API listening on http://localhost:${env.PORT}`, {
    env: env.NODE_ENV,
    corsOrigins: env.CORS_ORIGIN.join(', '),
    aiProvider: env.OPENROUTER_API_KEY
      ? `openrouter:${env.OPENROUTER_MODEL}`
      : env.HUGGINGFACE_API_KEY
        ? `huggingface:${env.HUGGINGFACE_MODEL}`
        : 'none (template fallback)',
    newsProvider: env.CRYPTOPANIC_API_TOKEN ? 'cryptopanic' : 'curated fallback',
  });
});

const shutdown = (signal: string): void => {
  logger.info(`Received ${signal} - shutting down`);
  server.close(() => {
    void disconnectPrisma().finally(() => process.exit(0));
  });
  // Force-exit if connections refuse to drain.
  setTimeout(() => process.exit(1), 10_000).unref();
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled promise rejection', { reason: String(reason) });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  void prisma.$disconnect().finally(() => process.exit(1));
});
