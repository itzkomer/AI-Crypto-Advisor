"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disconnectPrisma = exports.prisma = void 0;
/**
 * Prisma singleton.
 *
 * `tsx watch` re-evaluates modules on every save, which would otherwise leak a
 * new connection pool per reload, so the client is cached on globalThis in dev.
 */
const client_1 = require("@prisma/client");
const env_1 = require("../config/env");
const logger_1 = require("./logger");
const globalForPrisma = globalThis;
exports.prisma = globalForPrisma.prisma ??
    new client_1.PrismaClient({
        log: env_1.isProduction ? ['error'] : ['warn', 'error'],
    });
if (!env_1.isProduction) {
    globalForPrisma.prisma = exports.prisma;
}
const disconnectPrisma = async () => {
    try {
        await exports.prisma.$disconnect();
    }
    catch (error) {
        logger_1.logger.warn('Failed to disconnect Prisma cleanly', { error: String(error) });
    }
};
exports.disconnectPrisma = disconnectPrisma;
//# sourceMappingURL=prisma.js.map