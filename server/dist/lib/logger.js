"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
/**
 * Minimal structured logger. Deliberately dependency-free - in production it
 * emits one JSON object per line so Render/Railway log drains can parse it.
 */
const env_1 = require("../config/env");
const LEVEL_ORDER = { debug: 10, info: 20, warn: 30, error: 40 };
const MIN_LEVEL = env_1.env.NODE_ENV === 'test' ? 'error' : env_1.isProduction ? 'info' : 'debug';
const COLORS = {
    debug: '\x1b[90m',
    info: '\x1b[36m',
    warn: '\x1b[33m',
    error: '\x1b[31m',
};
const RESET = '\x1b[0m';
const write = (level, message, context) => {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[MIN_LEVEL])
        return;
    const timestamp = new Date().toISOString();
    if (env_1.isProduction) {
        // eslint-disable-next-line no-console
        console.log(JSON.stringify({ level, timestamp, message, ...context }));
        return;
    }
    const suffix = context && Object.keys(context).length > 0 ? ` ${JSON.stringify(context)}` : '';
    // eslint-disable-next-line no-console
    console.log(`${COLORS[level]}${level.toUpperCase().padEnd(5)}${RESET} ${message}${suffix}`);
};
exports.logger = {
    debug: (message, context) => write('debug', message, context),
    info: (message, context) => write('info', message, context),
    warn: (message, context) => write('warn', message, context),
    error: (message, context) => write('error', message, context),
};
//# sourceMappingURL=logger.js.map