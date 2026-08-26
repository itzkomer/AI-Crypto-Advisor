"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/** HTTP entrypoint. */
const app_1 = require("./app");
const env_1 = require("./config/env");
const logger_1 = require("./lib/logger");
const prisma_1 = require("./lib/prisma");
const app = (0, app_1.createApp)();
const server = app.listen(env_1.env.PORT, () => {
    logger_1.logger.info(`API listening on http://localhost:${env_1.env.PORT}`, {
        env: env_1.env.NODE_ENV,
        corsOrigins: env_1.env.CORS_ORIGIN.join(', '),
        aiProvider: env_1.env.OPENROUTER_API_KEY
            ? `openrouter:${env_1.env.OPENROUTER_MODEL}`
            : env_1.env.HUGGINGFACE_API_KEY
                ? `huggingface:${env_1.env.HUGGINGFACE_MODEL}`
                : 'none (template fallback)',
        newsProvider: env_1.env.CRYPTOPANIC_API_TOKEN ? 'cryptopanic' : 'curated fallback',
    });
});
const shutdown = (signal) => {
    logger_1.logger.info(`Received ${signal} - shutting down`);
    server.close(() => {
        void (0, prisma_1.disconnectPrisma)().finally(() => process.exit(0));
    });
    // Force-exit if connections refuse to drain.
    setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => {
    logger_1.logger.error('Unhandled promise rejection', { reason: String(reason) });
});
process.on('uncaughtException', (error) => {
    logger_1.logger.error('Uncaught exception', { error: error.message, stack: error.stack });
    void prisma_1.prisma.$disconnect().finally(() => process.exit(1));
});
//# sourceMappingURL=index.js.map